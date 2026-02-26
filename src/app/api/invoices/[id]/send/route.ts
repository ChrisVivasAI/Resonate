import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, ensureStripeCustomer } from '@/lib/stripe/server'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: 10 sends per minute
    const { allowed } = checkRateLimit(user.id, 'invoice:send', 10)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Only admin/member can send invoices
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'member'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch the invoice
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('*, client:clients(id, name, email)')
      .eq('id', params.id)
      .single()

    if (fetchError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (invoice.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft invoices can be sent' },
        { status: 400 }
      )
    }

    // Idempotency: if this invoice already has a Stripe invoice ID (from a previous partial failure),
    // recover by updating the DB status and return
    if (invoice.stripe_invoice_id) {
      const { data: recovered } = await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', params.id)
        .select('*, client:clients(id, name, email, company), project:projects(id, name)')
        .single()
      return NextResponse.json({ invoice: recovered || invoice })
    }

    if (!invoice.client_id) {
      return NextResponse.json(
        { error: 'Invoice must have a client to send' },
        { status: 400 }
      )
    }

    // Validate invoice amount before sending to Stripe
    const invoiceAmount = Number(invoice.amount)
    if (!Number.isFinite(invoiceAmount) || invoiceAmount <= 0) {
      return NextResponse.json(
        { error: 'Invoice amount must be greater than 0' },
        { status: 400 }
      )
    }

    const invoiceTaxAmount = Number(invoice.tax_amount)
    if (!Number.isFinite(invoiceTaxAmount) || invoiceTaxAmount < 0) {
      return NextResponse.json(
        { error: 'Invoice tax amount is invalid' },
        { status: 400 }
      )
    }

    // Ensure client has a Stripe customer ID
    const stripeCustomerId = await ensureStripeCustomer(supabase, invoice.client_id)

    // Calculate due date — must be at least 1 day in the future for Stripe
    const minDueDate = Date.now() + 24 * 60 * 60 * 1000 // tomorrow
    const defaultDueDate = Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
    let dueDateMs = defaultDueDate
    if (invoice.due_date) {
      const parsed = new Date(invoice.due_date).getTime()
      dueDateMs = parsed > minDueDate ? parsed : minDueDate
    }

    // Create the Stripe invoice first (as draft)
    const stripeInvoice = await stripe.invoices.create({
      customer: stripeCustomerId,
      collection_method: 'send_invoice',
      due_date: Math.floor(dueDateMs / 1000),
      auto_advance: true,
      metadata: {
        supabase_invoice_id: invoice.id,
        project_id: invoice.project_id || '',
        invoice_number: invoice.invoice_number,
      },
    })

    // Add line items explicitly to this invoice
    const lineItems = (invoice.line_items || []) as Array<{
      description: string
      quantity: number
      unit_price: number
    }>

    if (lineItems.length > 0) {
      const expectedTotalCents = Math.round(invoiceAmount * 100)
      const itemCents: number[] = []

      for (const item of lineItems) {
        const qty = Number(item.quantity) || 1
        const unitPrice = Number(item.unit_price) || 0
        const unitAmountCents = Math.round(unitPrice * 100)
        itemCents.push(unitAmountCents * qty)
        await stripe.invoiceItems.create({
          customer: stripeCustomerId,
          invoice: stripeInvoice.id,
          description: item.description || 'Services',
          quantity: qty,
          unit_amount: unitAmountCents,
          currency: invoice.currency || 'usd',
        })
      }

      // Reconcile rounding: if sum of rounded cents drifts from DB total,
      // add a correction line item so Stripe total matches exactly.
      const actualTotalCents = itemCents.reduce((a, b) => a + b, 0)
      const discrepancy = expectedTotalCents - actualTotalCents
      if (discrepancy !== 0) {
        await stripe.invoiceItems.create({
          customer: stripeCustomerId,
          invoice: stripeInvoice.id,
          description: 'Rounding adjustment',
          quantity: 1,
          unit_amount: discrepancy,
          currency: invoice.currency || 'usd',
        })
      }
    } else {
      // Fallback: create a single item from the invoice amount
      await stripe.invoiceItems.create({
        customer: stripeCustomerId,
        invoice: stripeInvoice.id,
        description: `Invoice ${invoice.invoice_number}`,
        quantity: 1,
        unit_amount: Math.round(invoiceAmount * 100),
        currency: invoice.currency || 'usd',
      })
    }

    // Add tax as a separate item if applicable
    if (invoiceTaxAmount > 0) {
      await stripe.invoiceItems.create({
        customer: stripeCustomerId,
        invoice: stripeInvoice.id,
        description: 'Tax',
        quantity: 1,
        unit_amount: Math.round(invoiceTaxAmount * 100),
        currency: invoice.currency || 'usd',
      })
    }

    // Finalize and send
    await stripe.invoices.finalizeInvoice(stripeInvoice.id)
    const sentInvoice = await stripe.invoices.sendInvoice(stripeInvoice.id)

    // Update our DB record -- critical section: if this fails after Stripe send,
    // we need to void the Stripe invoice to prevent a dangling charge
    let updated = null
    let updateError = null

    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await supabase
        .from('invoices')
        .update({
          stripe_invoice_id: sentInvoice.id,
          stripe_invoice_url: sentInvoice.hosted_invoice_url,
          status: 'sent',
        })
        .eq('id', params.id)
        .select('*, client:clients(id, name, email, company), project:projects(id, name)')
        .single()

      if (!result.error) {
        updated = result.data
        updateError = null
        break
      }
      updateError = result.error
      // Brief delay before retry
      await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)))
    }

    if (updateError) {
      // DB update failed after retries -- void the Stripe invoice to prevent dangling charge
      console.error('DB update failed after Stripe send, attempting to void Stripe invoice:', updateError.message)
      try {
        await stripe.invoices.voidInvoice(sentInvoice.id)
        console.log('Successfully voided Stripe invoice after DB failure:', sentInvoice.id)
      } catch (voidError) {
        // Log but don't mask the original error -- manual intervention needed
        console.error('CRITICAL: Failed to void Stripe invoice after DB failure:', voidError)
      }
      throw new Error(`Invoice was sent via Stripe but database update failed. The Stripe invoice has been voided. Please try again.`)
    }

    return NextResponse.json({ invoice: updated })
  } catch (error) {
    console.error('Error sending invoice:', error)
    return NextResponse.json(
      { error: 'Failed to send invoice' },
      { status: 500 }
    )
  }
}
