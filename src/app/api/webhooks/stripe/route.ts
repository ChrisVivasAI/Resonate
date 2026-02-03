import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { createAdminClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  try {
    switch (event.type) {
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        console.log('Invoice paid:', invoice.id)

        // Find our invoice by stripe_invoice_id
        const { data: dbInvoice } = await supabase
          .from('invoices')
          .select('id, milestone_id, amount, project_id, client_id')
          .eq('stripe_invoice_id', invoice.id)
          .single()

        if (dbInvoice) {
          // Update invoice status to paid
          await supabase
            .from('invoices')
            .update({ status: 'paid', paid_at: new Date().toISOString() })
            .eq('id', dbInvoice.id)

          // If linked to a milestone, mark it as paid
          if (dbInvoice.milestone_id) {
            await supabase
              .from('milestones')
              .update({ is_paid: true })
              .eq('id', dbInvoice.milestone_id)
          }

          // Insert a payment record
          await supabase.from('payments').insert({
            invoice_id: dbInvoice.id,
            project_id: dbInvoice.project_id,
            client_id: dbInvoice.client_id,
            amount: dbInvoice.amount,
            currency: 'usd',
            status: 'succeeded',
            stripe_payment_intent_id: typeof invoice.payment_intent === 'string'
              ? invoice.payment_intent
              : invoice.payment_intent?.id || null,
            payment_method: 'stripe_invoice',
            paid_at: new Date().toISOString(),
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.log('Invoice payment failed:', invoice.id)

        await supabase
          .from('invoices')
          .update({ status: 'overdue' })
          .eq('stripe_invoice_id', invoice.id)
        break
      }

      case 'invoice.voided': {
        const invoice = event.data.object as Stripe.Invoice
        console.log('Invoice voided:', invoice.id)

        await supabase
          .from('invoices')
          .update({ status: 'cancelled' })
          .eq('stripe_invoice_id', invoice.id)
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('Payment succeeded:', paymentIntent.id)

        await supabase
          .from('payments')
          .update({ status: 'succeeded' })
          .eq('stripe_payment_intent_id', paymentIntent.id)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('Payment failed:', paymentIntent.id)

        await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('stripe_payment_intent_id', paymentIntent.id)
        break
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription
        console.log('Subscription created:', subscription.id)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        console.log('Subscription updated:', subscription.id)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        console.log('Subscription cancelled:', subscription.id)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
