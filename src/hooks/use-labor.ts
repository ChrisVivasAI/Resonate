'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export type BillingType = 'hourly' | 'per_item' | 'per_asset' | 'per_service'

export interface LaborEntry {
  id: string
  project_id: string
  team_member_id: string | null
  team_member_name: string | null
  role: string
  billing_type: BillingType
  hourly_rate: number
  estimated_hours: number
  actual_hours: number
  estimated_cost: number
  actual_cost: number
  notes: string | null
  created_at: string
  updated_at: string
  team_member?: { id: string; full_name: string; email: string }
  project?: { id: string; name: string }
}

export interface LaborInput {
  project_id: string
  team_member_id?: string
  team_member_name?: string
  role: string
  billing_type?: BillingType
  hourly_rate: number
  estimated_hours?: number
  actual_hours?: number
  notes?: string
}

interface UseLaborOptions {
  projectId?: string
}

export function useLabor(options: UseLaborOptions = {}) {
  const [laborEntries, setLaborEntries] = useState<LaborEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchLaborEntries = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (options.projectId) params.set('project_id', options.projectId)

      const response = await fetch(`/api/labor?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch labor entries')
      }

      setLaborEntries(data.laborEntries)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch labor entries')
    } finally {
      setLoading(false)
    }
  }, [options.projectId])

  useEffect(() => {
    fetchLaborEntries()
  }, [fetchLaborEntries])

  // Subscribe to realtime updates
  useEffect(() => {
    if (!options.projectId) return

    const channel = supabase
      .channel('labor_entries_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'labor_entries',
          filter: `project_id=eq.${options.projectId}`,
        },
        () => {
          fetchLaborEntries()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [options.projectId, fetchLaborEntries])

  const addLaborEntry = async (entry: LaborInput) => {
    const response = await fetch('/api/labor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create labor entry')
    }

    await fetchLaborEntries()
    return data.laborEntry
  }

  const updateLaborEntry = async (id: string, updates: Partial<LaborInput>) => {
    const response = await fetch(`/api/labor/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Failed to update labor entry')
    }

    await fetchLaborEntries()
    return data.laborEntry
  }

  const deleteLaborEntry = async (id: string) => {
    const response = await fetch(`/api/labor/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to delete labor entry')
    }

    await fetchLaborEntries()
  }

  // Calculate totals
  const totals = {
    estimatedHours: laborEntries.reduce((sum, l) => sum + Number(l.estimated_hours), 0),
    actualHours: laborEntries.reduce((sum, l) => sum + Number(l.actual_hours), 0),
    estimatedCost: laborEntries.reduce((sum, l) => sum + Number(l.estimated_cost), 0),
    actualCost: laborEntries.reduce((sum, l) => sum + Number(l.actual_cost), 0),
    count: laborEntries.length,
  }

  return {
    laborEntries,
    loading,
    error,
    totals,
    refetch: fetchLaborEntries,
    addLaborEntry,
    updateLaborEntry,
    deleteLaborEntry,
  }
}
