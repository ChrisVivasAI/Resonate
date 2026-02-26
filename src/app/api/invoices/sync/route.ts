import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/server'

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

    // Fetch all invoices with status 'sent' or 'overdue' that have a stripe_invoice_id
    const { data: invoices, error: fetchError } = await supabase
      .from('invoices')
      .select('id, stripe_invoice_id, status, project_id, client_id, milestone_id, total_amount, currency')
      .in('status', ['sent', 'overdue'])
      .not('stripe_invoice_id', 'is', null)

    if (fetchError) {
      console.error('Failed to fetch invoices for sync:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
    }

    if (!invoices || invoices.length === 0) {
      return NextResponse.json({ synced: [], summary: { total_checked: 0, updated_to_paid: 0, payments_created: 0 } })
    }

    const synced: Array<{ invoice_id: string; stripe_invoice_id: string; action: string }> = []
    let updatedToPaid = 0
    let paymentsCreated = 0

    for (const inv of invoices) {
      try {
        const stripeInvoice = await stripe.invoices.retrieve(inv.stripe_invoice_id)

        if (stripeInvoice.status === 'paid') {
          // Check if payment record already exists
          const { data: existingPayment } = await supabase
            .from('payments')
            .select('id')
            .eq('invoice_id', inv.id)
            .eq('status', 'succeeded')
            .maybeSingle()

          if (!existingPayment) {
            const stripeAmountPaid = Number(((stripeInvoice.amount_paid ?? 0) / 100).toFixed(2))
            const paidAt = stripeInvoice.status_transitions?.paid_at
              ? new Date(stripeInvoice.status_transitions.paid_at * 1000).toISOString()
              : new Date().toISOString()

            await supabase.from('payments').insert({
              invoice_id: inv.id,
              project_id: inv.project_id,
              client_id: inv.client_id,
              amount: stripeAmountPaid,
              currency: stripeInvoice.currency ?? 'usd',
              status: 'succeeded',
              stripe_payment_intent_id: typeof stripeInvoice.payment_intent === 'string'
                ? stripeInvoice.payment_intent
                : stripeInvoice.payment_intent?.id || null,
              payment_method: 'stripe_invoice',
              paid_at: paidAt,
            })
            paymentsCreated++
          }

          // Update invoice status to paid
          await supabase
            .from('invoices')
            .update({
              status: 'paid',
              paid_at: stripeInvoice.status_transitions?.paid_at
                ? new Date(stripeInvoice.status_transitions.paid_at * 1000).toISOString()
                : new Date().toISOString(),
            })
            .eq('id', inv.id)

          // Mark milestone as paid if linked
          if (inv.milestone_id) {
            await supabase
              .from('milestones')
              .update({ is_paid: true })
              .eq('id', inv.milestone_id)
          }

          updatedToPaid++
          synced.push({
            invoice_id: inv.id,
            stripe_invoice_id: inv.stripe_invoice_id,
            action: existingPayment ? 'status_updated_to_paid' : 'status_updated_and_payment_created',
          })
        }
      } catch (err) {
        console.error(`Sync failed for invoice ${inv.id} (stripe: ${inv.stripe_invoice_id}):`, err)
        synced.push({
          invoice_id: inv.id,
          stripe_invoice_id: inv.stripe_invoice_id,
          action: 'error',
        })
      }
    }

    return NextResponse.json({
      synced,
      summary: {
        total_checked: invoices.length,
        updated_to_paid: updatedToPaid,
        payments_created: paymentsCreated,
      },
    })
  } catch (error) {
    console.error('Invoice sync error:', error)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
