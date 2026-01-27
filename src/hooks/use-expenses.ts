'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Expense {
  id: string
  project_id: string
  date: string
  category: string
  description: string | null
  vendor_or_person: string | null
  cost_pre_tax: number
  tax: number
  total: number
  is_billable: boolean
  markup_percent: number
  client_price: number
  is_paid: boolean
  payment_method: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  project?: { id: string; name: string }
}

export interface ExpenseInput {
  project_id: string
  date?: string
  category: string
  description?: string
  vendor_or_person?: string
  cost_pre_tax: number
  tax?: number
  is_billable?: boolean
  markup_percent?: number
  is_paid?: boolean
  payment_method?: string
  notes?: string
}

interface UseExpensesOptions {
  projectId?: string
  category?: string
  startDate?: string
  endDate?: string
}

export function useExpenses(options: UseExpensesOptions = {}) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (options.projectId) params.set('project_id', options.projectId)
      if (options.category) params.set('category', options.category)
      if (options.startDate) params.set('start_date', options.startDate)
      if (options.endDate) params.set('end_date', options.endDate)

      const response = await fetch(`/api/expenses?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch expenses')
      }

      setExpenses(data.expenses)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch expenses')
    } finally {
      setLoading(false)
    }
  }, [options.projectId, options.category, options.startDate, options.endDate])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  // Subscribe to realtime updates
  useEffect(() => {
    if (!options.projectId) return

    const channel = supabase
      .channel('expenses_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `project_id=eq.${options.projectId}`,
        },
        () => {
          fetchExpenses()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [options.projectId, fetchExpenses])

  const addExpense = async (expense: ExpenseInput) => {
    const response = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create expense')
    }

    await fetchExpenses()
    return data.expense
  }

  const updateExpense = async (id: string, updates: Partial<ExpenseInput>) => {
    const response = await fetch(`/api/expenses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Failed to update expense')
    }

    await fetchExpenses()
    return data.expense
  }

  const deleteExpense = async (id: string) => {
    const response = await fetch(`/api/expenses/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to delete expense')
    }

    await fetchExpenses()
  }

  // Calculate totals
  const totals = {
    cost: expenses.reduce((sum, e) => sum + Number(e.total), 0),
    clientPrice: expenses.reduce((sum, e) => sum + Number(e.client_price), 0),
    count: expenses.length,
    unpaid: expenses.filter(e => !e.is_paid).length,
  }

  return {
    expenses,
    loading,
    error,
    totals,
    refetch: fetchExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
  }
}
