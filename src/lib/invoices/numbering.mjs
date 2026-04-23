// Stripe is the source of truth for finalized invoice numbers. Local numbers are
// only a fallback for draft Stripe invoices that do not have a number yet.

/**
 * @param {string | null | undefined} stripeInvoiceNumber
 * @param {string} fallbackInvoiceNumber
 * @returns {string}
 */
export function resolveStripeInvoiceNumber(stripeInvoiceNumber, fallbackInvoiceNumber) {
  const normalizedStripeNumber = stripeInvoiceNumber?.trim()
  return normalizedStripeNumber || fallbackInvoiceNumber
}
