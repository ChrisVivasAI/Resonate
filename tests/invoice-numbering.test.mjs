import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { resolveStripeInvoiceNumber } from '../src/lib/invoices/numbering.mjs'

describe('resolveStripeInvoiceNumber', () => {
  it('uses the Stripe invoice number when Stripe provides one', () => {
    assert.equal(resolveStripeInvoiceNumber('STRIPE-00042', 'INV-0001'), 'STRIPE-00042')
  })

  it('trims Stripe invoice numbers before storing them locally', () => {
    assert.equal(resolveStripeInvoiceNumber('  STRIPE-00043  ', 'INV-0002'), 'STRIPE-00043')
  })

  it('falls back to the local draft number only when Stripe has no number yet', () => {
    assert.equal(resolveStripeInvoiceNumber(null, 'INV-0003'), 'INV-0003')
    assert.equal(resolveStripeInvoiceNumber(undefined, 'INV-0004'), 'INV-0004')
    assert.equal(resolveStripeInvoiceNumber('', 'INV-0005'), 'INV-0005')
  })
})
