import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripeInvoice } from '@/lib/stripe/server'
import Stripe from 'stripe'

const stripeStatusMap: Record<string, string> = {
  draft: 'sent',
  open: 'sent',
  paid: 'paid',
  void: 'cancelled',
  uncollectible: 'overdue',
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { stripe_invoice_id, project_id } = body

    if (!stripe_invoice_id) {
      return NextResponse.json(
        { error: 'stripe_invoice_id is required' },
        { status: 400 }
      )
    }

    // Check if already imported
    const { data: existing } = await supabase
      .from('invoices')
      .select('id')
      .eq('stripe_invoice_id', stripe_invoice_id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'This Stripe invoice has already been imported' },
        { status: 409 }
      )
    }

    // Fetch full Stripe invoice
    const stripeInvoice = await getStripeInvoice(stripe_invoice_id)

    // Resolve client by stripe_customer_id
    const stripeCustomerId = typeof stripeInvoice.customer === 'string'
      ? stripeInvoice.customer
      : (stripeInvoice.customer as Stripe.Customer)?.id

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'Stripe invoice has no customer associated' },
        { status: 400 }
      )
    }

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('stripe_customer_id', stripeCustomerId)
      .single()

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found. Link the Stripe customer to a client in your database first.' },
        { status: 404 }
      )
    }

    // Map Stripe status to app status
    const appStatus = stripeStatusMap[stripeInvoice.status || 'open'] || 'sent'

    // Extract line items from Stripe invoice
    const lineItems = (stripeInvoice.lines?.data || []).map((line) => {
      const qty = line.quantity || 1
      const total = (line.amount || 0) / 100
      return {
        id: crypto.randomUUID(),
        description: line.description || 'Line item',
        quantity: qty,
        unit_price: qty > 0 ? total / qty : total,
        total,
      }
    })

    // Generate invoice number
    const { data: lastInvoice } = await supabase
      .from('invoices')
      .select('invoice_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let nextNumber = 1
    if (lastInvoice?.invoice_number) {
      const match = lastInvoice.invoice_number.match(/INV-(\d+)/)
      if (match) nextNumber = parseInt(match[1], 10) + 1
    }
    const invoiceNumber = `INV-${String(nextNumber).padStart(4, '0')}`

    const amount = (stripeInvoice.subtotal || 0) / 100
    const taxAmount = (stripeInvoice.tax || 0) / 100
    const totalAmount = (stripeInvoice.total || 0) / 100

    // Insert the invoice
    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        client_id: client.id,
        project_id: project_id || null,
        invoice_type: 'custom',
        invoice_number: invoiceNumber,
        amount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        currency: stripeInvoice.currency || 'usd',
        status: appStatus,
        due_date: stripeInvoice.due_date
          ? new Date(stripeInvoice.due_date * 1000).toISOString()
          : null,
        paid_at: stripeInvoice.status === 'paid' && stripeInvoice.status_transitions?.paid_at
          ? new Date(stripeInvoice.status_transitions.paid_at * 1000).toISOString()
          : null,
        stripe_invoice_id: stripeInvoice.id,
        stripe_invoice_url: stripeInvoice.hosted_invoice_url || null,
        line_items: lineItems.length > 0 ? lineItems : [
          { id: crypto.randomUUID(), description: 'Imported invoice', quantity: 1, unit_price: amount, total: amount },
        ],
        notes: stripeInvoice.description || null,
      })
      .select('*, client:clients(id, name, email, company), project:projects(id, name)')
      .single()

    if (error) throw new Error(error.message)

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error('Error importing Stripe invoice:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import Stripe invoice' },
      { status: 500 }
    )
  }
}
