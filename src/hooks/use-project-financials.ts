'use client'

import { useState, useEffect, useCallback } from 'react'

export interface ProjectFinancials {
  summary: {
    quoteAmount: number
    totalClientCharges: number
    totalInternalCost: number
    grossProfit: number
    profitMargin: number
    remainingBudget: number
    outstandingInvoices: number
    paidInvoices: number
    totalInvoiced: number
  }
  expenses: {
    total: number
    clientCharges: number
    count: number
    byCategory: Record<string, { total: number; clientPrice: number; count: number }>
  }
  labor: {
    estimatedCost: number
    actualCost: number
    owed: number
    paid: number
    count: number
    byRole: Record<string, { estimatedHours: number; actualHours: number; estimatedCost: number; actualCost: number; count: number }>
  }
  invoices: {
    total: number
    outstanding: number
    paid: number
    count: number
  }
  reimbursements: {
    total: number
    pending: number
    approved: number
    paid: number
    count: number
    pendingCount: number
    approvedCount: number
  }
  returns: {
    expected: number
    pending: number
    completed: number
    restockingFees: number
    count: number
    pendingCount: number
    completedCount: number
  }
}

export function useProjectFinancials(projectId: string | null) {
  const [financials, setFinancials] = useState<ProjectFinancials | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFinancials = useCallback(async () => {
    if (!projectId) {
      setFinancials(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/projects/${projectId}/financials`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch financials')
      }

      setFinancials(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch financials')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchFinancials()
  }, [fetchFinancials])

  return {
    financials,
    loading,
    error,
    refetch: fetchFinancials,
  }
}
