'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Reimbursement {
  id: string
  project_id: string
  expense_id: string | null
  person_name: string
  person_email: string | null
  description: string
  category: string
  vendor: string | null
  amount: number
  date_incurred: string
  date_requested: string | null
  date_approved: string | null
  date_paid: string | null
  status: 'pending' | 'approved' | 'rejected' | 'paid'
  payment_method: string | null
  payment_reference: string | null
  receipt_url: string | null
  notes: string | null
  created_by: string | null
  approved_by: string | null
  created_at: string
  updated_at: string
  project?: { id: string; name: string }
  expense?: { id: string; description: string }
}

export interface ReimbursementInput {
  project_id: string
  expense_id?: string
  person_name: string
  person_email?: string
  description: string
  category?: string
  vendor?: string
  amount: number
  date_incurred?: string
  date_requested?: string
  status?: 'pending' | 'approved' | 'rejected' | 'paid'
  payment_method?: string
  payment_reference?: string
  receipt_url?: string
  notes?: string
}

interface UseReimbursementsOptions {
  projectId?: string
  status?: string
  personName?: string
}

export function useReimbursements(options: UseReimbursementsOptions = {}) {
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchReimbursements = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (options.projectId) params.set('project_id', options.projectId)
      if (options.status) params.set('status', options.status)
      if (options.personName) params.set('person_name', options.personName)

      const response = await fetch(`/api/reimbursements?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch reimbursements')
      }

      setReimbursements(data.reimbursements)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reimbursements')
    } finally {
      setLoading(false)
    }
  }, [options.projectId, options.status, options.personName])

  useEffect(() => {
    fetchReimbursements()
  }, [fetchReimbursements])

  // Subscribe to realtime updates
  useEffect(() => {
    if (!options.projectId) return

    const channel = supabase
      .channel('reimbursements_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reimbursements',
          filter: `project_id=eq.${options.projectId}`,
        },
        () => {
          fetchReimbursements()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [options.projectId, fetchReimbursements])

  const addReimbursement = async (entry: ReimbursementInput) => {
    const response = await fetch('/api/reimbursements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create reimbursement')
    }

    await fetchReimbursements()
    return data.reimbursement
  }

  const updateReimbursement = async (id: string, updates: Partial<ReimbursementInput>) => {
    const response = await fetch(`/api/reimbursements/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Failed to update reimbursement')
    }

    await fetchReimbursements()
    return data.reimbursement
  }

  const deleteReimbursement = async (id: string) => {
    const response = await fetch(`/api/reimbursements/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to delete reimbursement')
    }

    await fetchReimbursements()
  }

  const approveReimbursement = async (id: string) => {
    return updateReimbursement(id, { status: 'approved' })
  }

  const rejectReimbursement = async (id: string) => {
    return updateReimbursement(id, { status: 'rejected' })
  }

  const markAsPaid = async (id: string, paymentMethod?: string, paymentReference?: string) => {
    return updateReimbursement(id, {
      status: 'paid',
      payment_method: paymentMethod,
      payment_reference: paymentReference,
    })
  }

  // Calculate totals
  const totals = {
    total: reimbursements.reduce((sum, r) => sum + Number(r.amount), 0),
    pending: reimbursements.filter((r) => r.status === 'pending').reduce((sum, r) => sum + Number(r.amount), 0),
    approved: reimbursements.filter((r) => r.status === 'approved').reduce((sum, r) => sum + Number(r.amount), 0),
    paid: reimbursements.filter((r) => r.status === 'paid').reduce((sum, r) => sum + Number(r.amount), 0),
    rejected: reimbursements.filter((r) => r.status === 'rejected').reduce((sum, r) => sum + Number(r.amount), 0),
    count: reimbursements.length,
    pendingCount: reimbursements.filter((r) => r.status === 'pending').length,
    approvedCount: reimbursements.filter((r) => r.status === 'approved').length,
  }

  return {
    reimbursements,
    loading,
    error,
    totals,
    refetch: fetchReimbursements,
    addReimbursement,
    updateReimbursement,
    deleteReimbursement,
    approveReimbursement,
    rejectReimbursement,
    markAsPaid,
  }
}
