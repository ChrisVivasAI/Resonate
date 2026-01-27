'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Return {
  id: string
  project_id: string
  expense_id: string | null
  item_description: string
  vendor: string
  category: string
  original_cost: number
  return_amount: number
  restocking_fee: number
  net_return: number
  purchase_date: string | null
  return_initiated_date: string | null
  return_completed_date: string | null
  refund_received_date: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'denied' | 'partial'
  refund_method: 'original_payment' | 'store_credit' | 'check' | 'cash' | 'bank_transfer' | 'other' | null
  refund_reference: string | null
  return_window_days: number | null
  return_policy_notes: string | null
  tracking_number: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  project?: { id: string; name: string }
  expense?: { id: string; description: string }
}

export interface ReturnInput {
  project_id: string
  expense_id?: string
  item_description: string
  vendor: string
  category?: string
  original_cost: number
  return_amount: number
  restocking_fee?: number
  purchase_date?: string
  return_initiated_date?: string
  status?: 'pending' | 'in_progress' | 'completed' | 'denied' | 'partial'
  refund_method?: 'original_payment' | 'store_credit' | 'check' | 'cash' | 'bank_transfer' | 'other'
  refund_reference?: string
  return_window_days?: number
  return_policy_notes?: string
  tracking_number?: string
  notes?: string
}

interface UseReturnsOptions {
  projectId?: string
  status?: string
  vendor?: string
}

export function useReturns(options: UseReturnsOptions = {}) {
  const [returns, setReturns] = useState<Return[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchReturns = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (options.projectId) params.set('project_id', options.projectId)
      if (options.status) params.set('status', options.status)
      if (options.vendor) params.set('vendor', options.vendor)

      const response = await fetch(`/api/returns?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch returns')
      }

      setReturns(data.returns)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch returns')
    } finally {
      setLoading(false)
    }
  }, [options.projectId, options.status, options.vendor])

  useEffect(() => {
    fetchReturns()
  }, [fetchReturns])

  // Subscribe to realtime updates
  useEffect(() => {
    if (!options.projectId) return

    const channel = supabase
      .channel('returns_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'returns',
          filter: `project_id=eq.${options.projectId}`,
        },
        () => {
          fetchReturns()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [options.projectId, fetchReturns])

  const addReturn = async (entry: ReturnInput) => {
    const response = await fetch('/api/returns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create return')
    }

    await fetchReturns()
    return data.return
  }

  const updateReturn = async (id: string, updates: Partial<ReturnInput>) => {
    const response = await fetch(`/api/returns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Failed to update return')
    }

    await fetchReturns()
    return data.return
  }

  const deleteReturn = async (id: string) => {
    const response = await fetch(`/api/returns/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to delete return')
    }

    await fetchReturns()
  }

  const markAsInProgress = async (id: string, trackingNumber?: string) => {
    return updateReturn(id, {
      status: 'in_progress',
      tracking_number: trackingNumber,
    })
  }

  const markAsCompleted = async (id: string, refundMethod?: ReturnInput['refund_method'], refundReference?: string) => {
    return updateReturn(id, {
      status: 'completed',
      refund_method: refundMethod,
      refund_reference: refundReference,
    })
  }

  // Calculate totals
  const totals = {
    originalCost: returns.reduce((sum, r) => sum + Number(r.original_cost), 0),
    expectedReturn: returns.reduce((sum, r) => sum + Number(r.net_return), 0),
    completedReturn: returns
      .filter((r) => r.status === 'completed')
      .reduce((sum, r) => sum + Number(r.net_return), 0),
    pendingReturn: returns
      .filter((r) => ['pending', 'in_progress'].includes(r.status))
      .reduce((sum, r) => sum + Number(r.net_return), 0),
    restockingFees: returns.reduce((sum, r) => sum + Number(r.restocking_fee), 0),
    count: returns.length,
    pendingCount: returns.filter((r) => r.status === 'pending').length,
    inProgressCount: returns.filter((r) => r.status === 'in_progress').length,
    completedCount: returns.filter((r) => r.status === 'completed').length,
  }

  return {
    returns,
    loading,
    error,
    totals,
    refetch: fetchReturns,
    addReturn,
    updateReturn,
    deleteReturn,
    markAsInProgress,
    markAsCompleted,
  }
}
