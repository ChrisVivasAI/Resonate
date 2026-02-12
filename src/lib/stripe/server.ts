import Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia' as any,
  typescript: true,
})

export async function createCustomer(email: string, name: string, metadata?: Record<string, string>) {
  return stripe.customers.create({ email, name, metadata })
}

export async function createPaymentIntent(
  amount: number,
  currency: string = 'usd',
  customerId?: string,
  metadata?: Record<string, string>
) {
  return stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency,
    customer: customerId,
    metadata,
    automatic_payment_methods: { enabled: true },
  })
}

export async function createInvoice(
  customerId: string,
  items: { description: string; amount: number; quantity?: number }[],
  dueDate?: Date
) {
  for (const item of items) {
    await stripe.invoiceItems.create({
      customer: customerId,
      description: item.description,
      amount: Math.round(item.amount * 100),
      quantity: item.quantity || 1,
    })
  }

  return stripe.invoices.create({
    customer: customerId,
    collection_method: 'send_invoice',
    due_date: dueDate ? Math.floor(dueDate.getTime() / 1000) : undefined,
    auto_advance: true,
  })
}

export async function sendInvoice(invoiceId: string) {
  return stripe.invoices.sendInvoice(invoiceId)
}

export async function getPaymentIntent(paymentIntentId: string) {
  return stripe.paymentIntents.retrieve(paymentIntentId)
}

export async function ensureStripeCustomer(
  supabase: SupabaseClient,
  clientId: string
): Promise<string> {
  const { data: client, error } = await supabase
    .from('clients')
    .select('id, name, email, stripe_customer_id')
    .eq('id', clientId)
    .single()

  if (error || !client) throw new Error('Client not found')

  if (client.stripe_customer_id) {
    return client.stripe_customer_id
  }

  const stripeCustomer = await createCustomer(client.email, client.name, {
    supabase_client_id: clientId,
  })

  await supabase
    .from('clients')
    .update({ stripe_customer_id: stripeCustomer.id })
    .eq('id', clientId)

  return stripeCustomer.id
}

export async function voidStripeInvoice(invoiceId: string) {
  return stripe.invoices.voidInvoice(invoiceId)
}

export async function getStripeInvoice(invoiceId: string) {
  return stripe.invoices.retrieve(invoiceId)
}

export async function finalizeStripeInvoice(invoiceId: string) {
  return stripe.invoices.finalizeInvoice(invoiceId)
}

export async function listStripeInvoices(options?: {
  limit?: number
  starting_after?: string
  status?: Stripe.InvoiceListParams['status']
}) {
  return stripe.invoices.list({
    limit: options?.limit || 50,
    starting_after: options?.starting_after,
    status: options?.status,
    expand: ['data.customer'],
  })
}
