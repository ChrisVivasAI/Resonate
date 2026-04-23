const INVOICE_ID_METADATA_KEYS = ['supabase_invoice_id', 'resonate_invoice_id']
const DRAFT_NUMBER_METADATA_KEYS = ['resonate_draft_invoice_number', 'invoice_number']

/**
 * @param {unknown} amount
 * @returns {number}
 */
function toNumber(amount) {
  return Number(amount || 0)
}

/**
 * @param {number | null | undefined} stripeAmount
 * @returns {number}
 */
export function stripeCentsToUnitAmount(stripeAmount) {
  return Number(((stripeAmount || 0) / 100).toFixed(2))
}

/**
 * @param {{ customer?: string | { id?: string } | null }} stripeInvoice
 * @returns {string | null}
 */
export function getStripeCustomerId(stripeInvoice) {
  if (typeof stripeInvoice.customer === 'string') return stripeInvoice.customer
  return stripeInvoice.customer?.id || null
}

/**
 * @param {{ metadata?: Record<string, string> | null }} stripeInvoice
 * @returns {string | null}
 */
export function getMetadataInvoiceId(stripeInvoice) {
  const metadata = stripeInvoice.metadata || {}
  for (const key of INVOICE_ID_METADATA_KEYS) {
    const value = metadata[key]?.trim()
    if (value) return value
  }
  return null
}

/**
 * @param {{ metadata?: Record<string, string> | null }} stripeInvoice
 * @returns {string | null}
 */
export function getMetadataDraftInvoiceNumber(stripeInvoice) {
  const metadata = stripeInvoice.metadata || {}
  for (const key of DRAFT_NUMBER_METADATA_KEYS) {
    const value = metadata[key]?.trim()
    if (value) return value
  }
  return null
}

/**
 * @param {{
 *   id: string,
 *   invoice_number: string,
 *   total_amount: number | string,
 *   currency?: string | null,
 *   client?: { stripe_customer_id?: string | null } | null
 * }[]} localInvoices
 * @param {{
 *   id: string,
 *   customer?: string | { id?: string } | null,
 *   metadata?: Record<string, string> | null,
 *   total?: number | null,
 *   amount_paid?: number | null,
 *   currency?: string | null
 * }} stripeInvoice
 * @returns {{ invoice: (typeof localInvoices)[number] | null, matchType: string, reason?: string }}
 */
export function findLocalInvoiceForStripeInvoice(localInvoices, stripeInvoice) {
  const metadataInvoiceId = getMetadataInvoiceId(stripeInvoice)
  if (metadataInvoiceId) {
    const invoice = localInvoices.find((candidate) => candidate.id === metadataInvoiceId)
    if (invoice) return { invoice, matchType: 'metadata_id' }
  }

  const metadataDraftInvoiceNumber = getMetadataDraftInvoiceNumber(stripeInvoice)
  if (metadataDraftInvoiceNumber) {
    const invoice = localInvoices.find((candidate) => candidate.invoice_number === metadataDraftInvoiceNumber)
    if (invoice) return { invoice, matchType: 'metadata_invoice_number' }
  }

  const stripeCustomerId = getStripeCustomerId(stripeInvoice)
  const stripeTotal = stripeCentsToUnitAmount(stripeInvoice.total ?? stripeInvoice.amount_paid)
  const stripeCurrency = stripeInvoice.currency?.toLowerCase()

  if (!stripeCustomerId || !stripeTotal) {
    return { invoice: null, matchType: 'none', reason: 'missing_customer_or_amount' }
  }

  const candidates = localInvoices.filter((candidate) => {
    const candidateCurrency = candidate.currency?.toLowerCase() || 'usd'
    return candidate.client?.stripe_customer_id === stripeCustomerId &&
      Math.abs(toNumber(candidate.total_amount) - stripeTotal) <= 0.01 &&
      (!stripeCurrency || candidateCurrency === stripeCurrency)
  })

  if (candidates.length === 1) {
    return { invoice: candidates[0], matchType: 'unique_customer_amount' }
  }

  return {
    invoice: null,
    matchType: 'none',
    reason: candidates.length > 1 ? 'ambiguous_customer_amount' : 'no_match',
  }
}
