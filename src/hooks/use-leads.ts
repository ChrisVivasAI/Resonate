'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Lead, LeadActivity, CreateLeadInput, UpdateLeadInput, LeadStatus, LeadPriority } from '@/types'

interface UseLeadsOptions {
  status?: LeadStatus
  priority?: LeadPriority
  source?: string
  assignedTo?: string
  search?: string
}

interface UseLeadsReturn {
  leads: Lead[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  createLead: (input: CreateLeadInput) => Promise<Lead | null>
  updateLead: (id: string, input: UpdateLeadInput) => Promise<Lead | null>
  deleteLead: (id: string) => Promise<boolean>
}

export function useLeads(options: UseLeadsOptions = {}): UseLeadsReturn {
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (options.status) params.append('status', options.status)
      if (options.priority) params.append('priority', options.priority)
      if (options.source) params.append('source', options.source)
      if (options.assignedTo) params.append('assigned_to', options.assignedTo)
      if (options.search) params.append('search', options.search)

      const response = await fetch(`/api/leads?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch leads')
      }

      setLeads(data.leads)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [options.status, options.priority, options.source, options.assignedTo, options.search])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const createLead = async (input: CreateLeadInput): Promise<Lead | null> => {
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create lead')
      }

      setLeads((prev) => [data.lead, ...prev])
      return data.lead
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lead')
      return null
    }
  }

  const updateLead = async (id: string, input: UpdateLeadInput): Promise<Lead | null> => {
    try {
      const response = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update lead')
      }

      setLeads((prev) => prev.map((lead) => (lead.id === id ? data.lead : lead)))
      return data.lead
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update lead')
      return null
    }
  }

  const deleteLead = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/leads/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete lead')
      }

      setLeads((prev) => prev.filter((lead) => lead.id !== id))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete lead')
      return false
    }
  }

  return {
    leads,
    isLoading,
    error,
    refetch: fetchLeads,
    createLead,
    updateLead,
    deleteLead,
  }
}

// Hook for single lead with activities
interface UseLeadReturn {
  lead: Lead | null
  activities: LeadActivity[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  addActivity: (type: LeadActivity['type'], content: string, metadata?: Record<string, unknown>) => Promise<LeadActivity | null>
  updateLead: (input: UpdateLeadInput) => Promise<Lead | null>
  aiAssist: (action: string, context?: string) => Promise<{ response: string } | null>
}

export function useLead(id: string | null): UseLeadReturn {
  const [lead, setLead] = useState<Lead | null>(null)
  const [activities, setActivities] = useState<LeadActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLead = useCallback(async () => {
    if (!id) {
      setLead(null)
      setActivities([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/leads/${id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch lead')
      }

      setLead(data.lead)
      setActivities(data.lead.activities || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchLead()
  }, [fetchLead])

  const addActivity = async (
    type: LeadActivity['type'],
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<LeadActivity | null> => {
    if (!id) return null

    try {
      const response = await fetch(`/api/leads/${id}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, content, metadata }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add activity')
      }

      setActivities((prev) => [data.activity, ...prev])
      return data.activity
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add activity')
      return null
    }
  }

  const updateLead = async (input: UpdateLeadInput): Promise<Lead | null> => {
    if (!id) return null

    try {
      const response = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update lead')
      }

      setLead(data.lead)
      return data.lead
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update lead')
      return null
    }
  }

  const aiAssist = async (action: string, context?: string): Promise<{ response: string } | null> => {
    if (!id) return null

    try {
      const response = await fetch(`/api/leads/${id}/assist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, context }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get AI assistance')
      }

      // Refetch to get the new activity
      await fetchLead()

      return { response: data.response }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get AI assistance')
      return null
    }
  }

  return {
    lead,
    activities,
    isLoading,
    error,
    refetch: fetchLead,
    addActivity,
    updateLead,
    aiAssist,
  }
}
