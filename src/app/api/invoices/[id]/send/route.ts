import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, ensureStripeCustomer } from '@/lib/stripe/server'

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

    if (!invoice.client_id) {
      return NextResponse.json(
        { error: 'Invoice must have a client to send' },
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
      for (const item of lineItems) {
        const qty = Number(item.quantity) || 1
        const unitPrice = Number(item.unit_price) || 0
        await stripe.invoiceItems.create({
          customer: stripeCustomerId,
          invoice: stripeInvoice.id,
          description: item.description || 'Services',
          quantity: qty,
          unit_amount: Math.round(unitPrice * 100),
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
        unit_amount: Math.round(Number(invoice.amount) * 100),
        currency: invoice.currency || 'usd',
      })
    }

    // Add tax as a separate item if applicable
    if (Number(invoice.tax_amount) > 0) {
      await stripe.invoiceItems.create({
        customer: stripeCustomerId,
        invoice: stripeInvoice.id,
        description: 'Tax',
        quantity: 1,
        unit_amount: Math.round(Number(invoice.tax_amount) * 100),
        currency: invoice.currency || 'usd',
      })
    }

    // Finalize and send
    await stripe.invoices.finalizeInvoice(stripeInvoice.id)
    const sentInvoice = await stripe.invoices.sendInvoice(stripeInvoice.id)

    // Update our DB record
    const { data: updated, error: updateError } = await supabase
      .from('invoices')
      .update({
        stripe_invoice_id: sentInvoice.id,
        stripe_invoice_url: sentInvoice.hosted_invoice_url,
        status: 'sent',
      })
      .eq('id', params.id)
      .select('*, client:clients(id, name, email, company), project:projects(id, name)')
      .single()

    if (updateError) throw new Error(updateError.message)

    return NextResponse.json({ invoice: updated })
  } catch (error) {
    console.error('Error sending invoice:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send invoice' },
      { status: 500 }
    )
  }
}
