import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  findLocalInvoiceForStripeInvoice,
  getMetadataDraftInvoiceNumber,
  getMetadataInvoiceId,
  getStripeCustomerId,
  stripeCentsToUnitAmount,
} from '../src/lib/invoices/stripe-reconciliation.mjs'

const localInvoices = [
  {
    id: 'local-1',
    invoice_number: 'INV-0037',
    total_amount: 1212.96,
    currency: 'usd',
    client: { stripe_customer_id: 'cus_123' },
  },
  {
    id: 'local-2',
    invoice_number: 'INV-0038',
    total_amount: 500,
    currency: 'usd',
    client: { stripe_customer_id: 'cus_456' },
  },
]

describe('stripe reconciliation helpers', () => {
  it('normalizes Stripe cent amounts to app currency amounts', () => {
    assert.equal(stripeCentsToUnitAmount(121296), 1212.96)
  })

  it('extracts invoice metadata ids and draft invoice numbers', () => {
    const stripeInvoice = {
      metadata: {
        supabase_invoice_id: 'local-1',
        resonate_draft_invoice_number: 'INV-0037',
      },
    }

    assert.equal(getMetadataInvoiceId(stripeInvoice), 'local-1')
    assert.equal(getMetadataDraftInvoiceNumber(stripeInvoice), 'INV-0037')
  })

  it('extracts Stripe customer ids from string and expanded customers', () => {
    assert.equal(getStripeCustomerId({ customer: 'cus_123' }), 'cus_123')
    assert.equal(getStripeCustomerId({ customer: { id: 'cus_456' } }), 'cus_456')
  })

  it('matches by metadata invoice id first', () => {
    const result = findLocalInvoiceForStripeInvoice(localInvoices, {
      id: 'in_123',
      customer: 'cus_other',
      metadata: { supabase_invoice_id: 'local-1' },
      total: 99999,
      currency: 'usd',
    })

    assert.equal(result.invoice?.id, 'local-1')
    assert.equal(result.matchType, 'metadata_id')
  })

  it('matches older Stripe invoices by draft invoice number metadata', () => {
    const result = findLocalInvoiceForStripeInvoice(localInvoices, {
      id: 'in_123',
      customer: 'cus_other',
      metadata: { invoice_number: 'INV-0037' },
      total: 99999,
      currency: 'usd',
    })

    assert.equal(result.invoice?.id, 'local-1')
    assert.equal(result.matchType, 'metadata_invoice_number')
  })

  it('falls back to unique customer and amount matching', () => {
    const result = findLocalInvoiceForStripeInvoice(localInvoices, {
      id: 'in_123',
      customer: 'cus_123',
      metadata: {},
      total: 121296,
      currency: 'usd',
    })

    assert.equal(result.invoice?.id, 'local-1')
    assert.equal(result.matchType, 'unique_customer_amount')
  })

  it('refuses ambiguous customer and amount matches', () => {
    const result = findLocalInvoiceForStripeInvoice([
      ...localInvoices,
      {
        id: 'local-3',
        invoice_number: 'INV-0039',
        total_amount: 1212.96,
        currency: 'usd',
        client: { stripe_customer_id: 'cus_123' },
      },
    ], {
      id: 'in_123',
      customer: 'cus_123',
      metadata: {},
      total: 121296,
      currency: 'usd',
    })

    assert.equal(result.invoice, null)
    assert.equal(result.reason, 'ambiguous_customer_amount')
  })
})
