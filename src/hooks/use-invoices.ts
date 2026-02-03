'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Invoice, InvoiceLineItem } from '@/types'

export interface StripeInvoicePreview {
  stripe_id: string
  number: string | null
  customer_name: string | null
  customer_email: string | null
  amount_due: number
  amount_paid: number
  status: string
  due_date: number | null
  created: number
  hosted_invoice_url: string | null
}

export interface InvoiceInput {
  client_id: string
  project_id?: string
  milestone_id?: string
  invoice_type?: 'deposit' | 'milestone' | 'custom'
  amount: number
  tax_amount?: number
  due_date?: string
  line_items?: InvoiceLineItem[]
  notes?: string
}

interface UseInvoicesOptions {
  projectId?: string
  clientId?: string
  status?: string
}

export function useInvoices(options: UseInvoicesOptions = {}) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (options.projectId) params.set('project_id', options.projectId)
      if (options.clientId) params.set('client_id', options.clientId)
      if (options.status) params.set('status', options.status)

      const response = await fetch(`/api/invoices?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch invoices')
      }

      setInvoices(data.invoices)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch invoices')
    } finally {
      setLoading(false)
    }
  }, [options.projectId, options.clientId, options.status])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  const createInvoice = async (input: InvoiceInput): Promise<Invoice> => {
    const response = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create invoice')
    }

    await fetchInvoices()
    return data.invoice
  }

  const updateInvoice = async (id: string, updates: Partial<InvoiceInput>): Promise<Invoice> => {
    const response = await fetch(`/api/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Failed to update invoice')
    }

    await fetchInvoices()
    return data.invoice
  }

  const deleteInvoice = async (id: string): Promise<void> => {
    const response = await fetch(`/api/invoices/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to delete invoice')
    }

    await fetchInvoices()
  }

  const sendInvoice = async (id: string): Promise<Invoice> => {
    const response = await fetch(`/api/invoices/${id}/send`, {
      method: 'POST',
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send invoice')
    }

    await fetchInvoices()
    return data.invoice
  }

  const voidInvoice = async (id: string): Promise<Invoice> => {
    const response = await fetch(`/api/invoices/${id}/void`, {
      method: 'POST',
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Failed to void invoice')
    }

    await fetchInvoices()
    return data.invoice
  }

  const generateProjectInvoices = async (projectId: string): Promise<Invoice[]> => {
    const response = await fetch(`/api/projects/${projectId}/invoices/generate`, {
      method: 'POST',
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate invoices')
    }

    await fetchInvoices()
    return data.invoices
  }

  const fetchStripeInvoices = async (startingAfter?: string): Promise<{
    invoices: StripeInvoicePreview[]
    has_more: boolean
    last_id: string | null
  }> => {
    const params = new URLSearchParams()
    if (startingAfter) params.set('starting_after', startingAfter)

    const response = await fetch(`/api/stripe/invoices?${params.toString()}`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch Stripe invoices')
    }

    return data
  }

  const importStripeInvoice = async (stripeInvoiceId: string, projectId: string): Promise<Invoice> => {
    const response = await fetch('/api/invoices/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stripe_invoice_id: stripeInvoiceId, project_id: projectId }),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Failed to import Stripe invoice')
    }

    await fetchInvoices()
    return data.invoice
  }

  const totals = {
    count: invoices.length,
    totalAmount: invoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0),
    outstanding: invoices
      .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
      .reduce((sum, inv) => sum + Number(inv.total_amount), 0),
    paid: invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + Number(inv.total_amount), 0),
    draft: invoices
      .filter(inv => inv.status === 'draft')
      .reduce((sum, inv) => sum + Number(inv.total_amount), 0),
  }

  return {
    invoices,
    loading,
    error,
    totals,
    refetch: fetchInvoices,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    sendInvoice,
    voidInvoice,
    generateProjectInvoices,
    fetchStripeInvoices,
    importStripeInvoice,
  }
}
