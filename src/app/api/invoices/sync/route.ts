import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/server'
import { resolveStripeInvoiceNumber } from '@/lib/invoices/numbering.mjs'
import { findLocalInvoiceForStripeInvoice, stripeCentsToUnitAmount } from '@/lib/invoices/stripe-reconciliation.mjs'
import Stripe from 'stripe'

const stripeStatusMap: Record<string, string> = {
  draft: 'sent',
  open: 'sent',
  paid: 'paid',
  void: 'cancelled',
  uncollectible: 'overdue',
}

type LocalInvoice = {
  id: string
  invoice_number: string
  stripe_invoice_id: string | null
  status: string
  project_id: string | null
  client_id: string | null
  milestone_id: string | null
  total_amount: number | string
  currency: string | null
  client?: { stripe_customer_id?: string | null } | null
}

type SyncAction = {
  invoice_id: string
  stripe_invoice_id: string
  action: string
  match_type?: string
  stripe_invoice_number?: string | null
  error?: string
}

function getPaidAt(stripeInvoice: Stripe.Invoice) {
  return stripeInvoice.status_transitions?.paid_at
    ? new Date(stripeInvoice.status_transitions.paid_at * 1000).toISOString()
    : new Date().toISOString()
}

function getStripePaymentIntentId(stripeInvoice: Stripe.Invoice) {
  return typeof stripeInvoice.payment_intent === 'string'
    ? stripeInvoice.payment_intent
    : stripeInvoice.payment_intent?.id || null
}

async function syncStripeInvoiceToLocal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  inv: LocalInvoice,
  stripeInvoice: Stripe.Invoice,
  matchType: string
) {
  const appStatus = stripeStatusMap[stripeInvoice.status || 'open'] || inv.status
  const paidAt = stripeInvoice.status === 'paid' ? getPaidAt(stripeInvoice) : null
  const nextInvoiceNumber = resolveStripeInvoiceNumber(stripeInvoice.number, inv.invoice_number)

  const updatePayload: Record<string, unknown> = {
    stripe_invoice_id: stripeInvoice.id,
    stripe_invoice_url: stripeInvoice.hosted_invoice_url || null,
    invoice_number: nextInvoiceNumber,
    status: appStatus,
  }

  if (paidAt) {
    updatePayload.paid_at = paidAt
  }

  const { error: invoiceUpdateError } = await supabase
    .from('invoices')
    .update(updatePayload)
    .eq('id', inv.id)

  if (invoiceUpdateError) {
    throw new Error(invoiceUpdateError.message)
  }

  let paymentCreated = false
  if (stripeInvoice.status === 'paid') {
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('invoice_id', inv.id)
      .eq('status', 'succeeded')
      .maybeSingle()

    if (!existingPayment) {
      const { error: paymentInsertError } = await supabase.from('payments').insert({
        invoice_id: inv.id,
        project_id: inv.project_id,
        client_id: inv.client_id,
        amount: stripeCentsToUnitAmount(stripeInvoice.amount_paid ?? stripeInvoice.total),
        currency: stripeInvoice.currency ?? 'usd',
        status: 'succeeded',
        stripe_payment_intent_id: getStripePaymentIntentId(stripeInvoice),
        payment_method: 'stripe_invoice',
        paid_at: paidAt || new Date().toISOString(),
      })

      if (paymentInsertError) {
        throw new Error(paymentInsertError.message)
      }
      paymentCreated = true
    }

    if (inv.milestone_id) {
      const { error: milestoneUpdateError } = await supabase
        .from('milestones')
        .update({ is_paid: true })
        .eq('id', inv.milestone_id)

      if (milestoneUpdateError) {
        throw new Error(milestoneUpdateError.message)
      }
    }
  }

  return {
    invoice_id: inv.id,
    stripe_invoice_id: stripeInvoice.id,
    stripe_invoice_number: stripeInvoice.number,
    match_type: matchType,
    action: stripeInvoice.status === 'paid'
      ? paymentCreated ? 'linked_paid_and_payment_created' : 'linked_paid'
      : 'linked_status_updated',
  }
}

async function listRecentStripeInvoices() {
  const statuses: Stripe.InvoiceListParams.Status[] = ['paid', 'open', 'uncollectible', 'void']
  const results: Stripe.Invoice[] = []

  for (const status of statuses) {
    const page = await stripe.invoices.list({
      limit: 100,
      status,
      expand: ['data.customer'],
    })
    results.push(...page.data)
  }

  const byId = new Map<string, Stripe.Invoice>()
  for (const invoice of results) {
    byId.set(invoice.id, invoice)
  }
  return Array.from(byId.values())
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin can run sync
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch active invoices. Some production invoices can be missing
    // stripe_invoice_id because older send flows failed after Stripe finalized
    // the invoice, so we reconcile both linked and orphaned local invoices.
    const { data: invoices, error: fetchError } = await supabase
      .from('invoices')
      .select('id, invoice_number, stripe_invoice_id, status, project_id, client_id, milestone_id, total_amount, currency, client:clients(stripe_customer_id)')
      .in('status', ['draft', 'sent', 'overdue'])

    if (fetchError) {
      console.error('Failed to fetch invoices for sync:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
    }

    if (!invoices || invoices.length === 0) {
      return NextResponse.json({ synced: [], summary: { total_checked: 0, linked_from_stripe: 0, updated_to_paid: 0, payments_created: 0, skipped: 0 } })
    }

    const localInvoices = invoices as unknown as LocalInvoice[]
    const synced: SyncAction[] = []
    let updatedToPaid = 0
    let paymentsCreated = 0
    let linkedFromStripe = 0
    let skipped = 0
    const processedLocalIds = new Set<string>()
    const linkedStripeIds = new Set(localInvoices.map((inv) => inv.stripe_invoice_id).filter(Boolean))

    for (const inv of localInvoices.filter((invoice) => invoice.stripe_invoice_id)) {
      try {
        const stripeInvoice = await stripe.invoices.retrieve(inv.stripe_invoice_id!)
        const result = await syncStripeInvoiceToLocal(supabase, inv, stripeInvoice, 'stripe_invoice_id')
        synced.push(result)
        processedLocalIds.add(inv.id)

        if (stripeInvoice.status === 'paid') {
          updatedToPaid++
          if (result.action === 'linked_paid_and_payment_created') paymentsCreated++
        }
      } catch (err) {
        console.error(`Sync failed for invoice ${inv.id} (stripe: ${inv.stripe_invoice_id}):`, err)
        synced.push({
          invoice_id: inv.id,
          stripe_invoice_id: inv.stripe_invoice_id || '',
          action: 'error',
        })
      }
    }

    const unresolvedInvoices = localInvoices.filter((inv) => !processedLocalIds.has(inv.id))
    const recentStripeInvoices = await listRecentStripeInvoices()

    for (const stripeInvoice of recentStripeInvoices) {
      if (linkedStripeIds.has(stripeInvoice.id)) continue

      const { invoice, matchType, reason } = findLocalInvoiceForStripeInvoice(unresolvedInvoices, stripeInvoice)
      if (!invoice) {
        if (reason === 'ambiguous_customer_amount') {
          skipped++
          synced.push({
            invoice_id: 'unmatched',
            stripe_invoice_id: stripeInvoice.id,
            stripe_invoice_number: stripeInvoice.number,
            action: 'skipped_ambiguous_match',
            match_type: matchType,
          })
        }
        continue
      }

      try {
        const result = await syncStripeInvoiceToLocal(supabase, invoice, stripeInvoice, matchType)
        synced.push(result)
        processedLocalIds.add(invoice.id)
        linkedStripeIds.add(stripeInvoice.id)
        linkedFromStripe++

        if (stripeInvoice.status === 'paid') {
          updatedToPaid++
          if (result.action === 'linked_paid_and_payment_created') paymentsCreated++
        }
      } catch (err) {
        console.error(`Reconciliation failed for invoice ${invoice.id} (stripe: ${stripeInvoice.id}):`, err)
        synced.push({
          invoice_id: invoice.id,
          stripe_invoice_id: stripeInvoice.id,
          stripe_invoice_number: stripeInvoice.number,
          action: 'error',
          match_type: matchType,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      synced,
      summary: {
        total_checked: invoices.length,
        linked_from_stripe: linkedFromStripe,
        updated_to_paid: updatedToPaid,
        payments_created: paymentsCreated,
        skipped,
      },
    })
  } catch (error) {
    console.error('Invoice sync error:', error)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
