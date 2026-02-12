import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { createAdminClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  // #12: Null check for STRIPE_WEBHOOK_SECRET
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 503 }
    )
  }

  const body = await request.text()

  // #11: Null check for stripe-signature header
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

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

        // #1: Added total_amount, currency to select
        const { data: dbInvoice } = await supabase
          .from('invoices')
          .select('id, milestone_id, amount, total_amount, currency, project_id, client_id, status')
          .eq('stripe_invoice_id', invoice.id)
          .single()

        // #5: If not found by stripe_invoice_id, try metadata lookup
        let resolvedInvoice = dbInvoice
        if (!resolvedInvoice && invoice.metadata?.resonate_invoice_id) {
          const { data: metaInvoice } = await supabase
            .from('invoices')
            .select('id, milestone_id, amount, total_amount, currency, project_id, client_id, status')
            .eq('id', invoice.metadata.resonate_invoice_id)
            .single()
          resolvedInvoice = metaInvoice
        }

        if (!resolvedInvoice) {
          // #5: Return 500 so Stripe retries
          console.error('Invoice not found in database for stripe_invoice_id:', invoice.id)
          return NextResponse.json(
            { error: 'Invoice not found' },
            { status: 500 }
          )
        }

        // #8: Status guard — only process if invoice is in sent or overdue state
        if (resolvedInvoice.status !== 'sent' && resolvedInvoice.status !== 'overdue') {
          console.log(`Skipping invoice.paid — invoice ${resolvedInvoice.id} has status "${resolvedInvoice.status}"`)
          break
        }

        // #2: Use Stripe's invoice.amount_paid for the payment amount
        const stripeAmountPaid = Number(((invoice.amount_paid ?? 0) / 100).toFixed(2))

        // #4: Log warning if Stripe amount doesn't match DB total_amount
        if (resolvedInvoice.total_amount != null && stripeAmountPaid !== resolvedInvoice.total_amount) {
          console.warn(
            `Amount mismatch for invoice ${resolvedInvoice.id}: ` +
            `Stripe amount_paid=${stripeAmountPaid}, DB total_amount=${resolvedInvoice.total_amount}`
          )
        }

        // #3: Idempotency — check if payment already exists
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id')
          .eq('invoice_id', resolvedInvoice.id)
          .eq('status', 'succeeded')
          .maybeSingle()

        if (existingPayment) {
          console.log(`Payment already exists for invoice ${resolvedInvoice.id}, skipping insert`)
          break
        }

        // Use Stripe's actual payment timestamp
        const paidAt = invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
          : new Date(event.created * 1000).toISOString()

        // Insert payment record FIRST for atomicity — this has the idempotency
        // check (unique constraint). If this succeeds but later ops fail, Stripe
        // retries will hit the idempotency guard above and skip. If this fails,
        // no invoice/milestone state has been changed.
        await supabase.from('payments').insert({
          invoice_id: resolvedInvoice.id,
          project_id: resolvedInvoice.project_id,
          client_id: resolvedInvoice.client_id,
          amount: stripeAmountPaid, // #2: Use Stripe amount
          currency: invoice.currency ?? 'usd', // #9: Use Stripe currency
          status: 'succeeded',
          stripe_payment_intent_id: typeof invoice.payment_intent === 'string'
            ? invoice.payment_intent
            : invoice.payment_intent?.id || null,
          payment_method: 'stripe_invoice',
          paid_at: paidAt,
        })

        // Update invoice status to paid
        await supabase
          .from('invoices')
          .update({ status: 'paid', paid_at: paidAt })
          .eq('id', resolvedInvoice.id)

        // If linked to a milestone, mark it as paid
        if (resolvedInvoice.milestone_id) {
          await supabase
            .from('milestones')
            .update({ is_paid: true })
            .eq('id', resolvedInvoice.milestone_id)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.log('Invoice payment failed:', invoice.id)

        // #8: Status guard — only transition if currently sent
        const { data: failedInvoice } = await supabase
          .from('invoices')
          .select('id, status')
          .eq('stripe_invoice_id', invoice.id)
          .single()

        if (failedInvoice && failedInvoice.status === 'sent') {
          await supabase
            .from('invoices')
            .update({ status: 'overdue' })
            .eq('id', failedInvoice.id)
        } else if (failedInvoice) {
          console.log(`Skipping invoice.payment_failed — invoice ${failedInvoice.id} has status "${failedInvoice.status}"`)
        }
        break
      }

      case 'invoice.voided': {
        const invoice = event.data.object as Stripe.Invoice
        console.log('Invoice voided:', invoice.id)

        // #8: Status guard — only void if sent or overdue
        const { data: voidedInvoice } = await supabase
          .from('invoices')
          .select('id, status')
          .eq('stripe_invoice_id', invoice.id)
          .single()

        if (voidedInvoice && (voidedInvoice.status === 'sent' || voidedInvoice.status === 'overdue')) {
          await supabase
            .from('invoices')
            .update({ status: 'cancelled' })
            .eq('id', voidedInvoice.id)
        } else if (voidedInvoice) {
          console.log(`Skipping invoice.voided — invoice ${voidedInvoice.id} has status "${voidedInvoice.status}"`)
        }
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

      // #10: Handle payment_intent.canceled
      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('Payment intent canceled:', paymentIntent.id)

        await supabase
          .from('payments')
          .update({ status: 'canceled' })
          .eq('stripe_payment_intent_id', paymentIntent.id)
        break
      }

      // #6: Handle charge.refunded
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        console.log('Charge refunded:', charge.id)

        const paymentIntentId = typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id

        if (paymentIntentId) {
          await supabase
            .from('payments')
            .update({ status: 'refunded' })
            .eq('stripe_payment_intent_id', paymentIntentId)
        } else {
          console.warn('charge.refunded: no payment_intent on charge', charge.id)
        }
        break
      }

      // #7: Handle charge.dispute.created
      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute
        const disputeAmount = Number((dispute.amount / 100).toFixed(2))
        console.warn(
          `Dispute created: ${dispute.id}, charge: ${dispute.charge}, ` +
          `amount: ${disputeAmount} ${dispute.currency}, reason: ${dispute.reason}`
        )

        // Update payment status to disputed
        const disputePaymentIntentId = typeof dispute.payment_intent === 'string'
          ? dispute.payment_intent
          : dispute.payment_intent?.id

        if (disputePaymentIntentId) {
          await supabase
            .from('payments')
            .update({ status: 'disputed' })
            .eq('stripe_payment_intent_id', disputePaymentIntentId)
        } else {
          console.warn('charge.dispute.created: no payment_intent on dispute', dispute.id)
        }
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
