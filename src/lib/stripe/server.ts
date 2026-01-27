import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
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
