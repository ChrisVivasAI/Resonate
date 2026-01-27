'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Deliverable, DeliverableVersion } from '@/types'

interface UseDeliverablesOptions {
  projectId?: string
  realtime?: boolean
}

export function useDeliverables(options: UseDeliverablesOptions = {}) {
  const { projectId, realtime = true } = options
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDeliverables = useCallback(async () => {
    if (!projectId) {
      setDeliverables([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/projects/${projectId}/deliverables`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch deliverables')
      }

      setDeliverables(data.deliverables)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch deliverables')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchDeliverables()
  }, [fetchDeliverables])

  // Realtime subscription
  useEffect(() => {
    if (!realtime || !projectId) return

    const supabase = createClient()

    const subscription = supabase
      .channel(`deliverables:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deliverables',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          fetchDeliverables()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [realtime, projectId, fetchDeliverables])

  const createDeliverable = async (data: {
    title: string
    description?: string
    type: 'image' | 'video' | 'audio' | 'document' | 'text'
    fileUrl?: string
    thumbnailUrl?: string
    aiGenerationId?: string
  }) => {
    if (!projectId) throw new Error('Project ID is required')

    const response = await fetch(`/api/projects/${projectId}/deliverables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create deliverable')
    }

    await fetchDeliverables()
    return result.deliverable as Deliverable
  }

  const updateDeliverable = async (
    id: string,
    data: {
      title?: string
      description?: string
      fileUrl?: string
      thumbnailUrl?: string
      status?: Deliverable['status']
      draft_url?: string
      draft_platform?: Deliverable['draft_platform']
      final_url?: string
      final_platform?: Deliverable['final_platform']
      notes?: string
    }
  ) => {
    const response = await fetch(`/api/deliverables/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update deliverable')
    }

    await fetchDeliverables()
    return result.deliverable as Deliverable
  }

  const deleteDeliverable = async (id: string) => {
    const response = await fetch(`/api/deliverables/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.error || 'Failed to delete deliverable')
    }

    await fetchDeliverables()
  }

  const submitForReview = async (id: string) => {
    const response = await fetch(`/api/deliverables/${id}/submit`, {
      method: 'POST',
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to submit for review')
    }

    await fetchDeliverables()
    return result.deliverable as Deliverable
  }

  const approveDeliverable = async (id: string, feedback?: string, markFinal?: boolean) => {
    const response = await fetch(`/api/deliverables/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback, markFinal }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to approve deliverable')
    }

    await fetchDeliverables()
    return result.deliverable as Deliverable
  }

  const rejectDeliverable = async (id: string, feedback: string, requestChanges?: boolean) => {
    const response = await fetch(`/api/deliverables/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback, requestChanges }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to reject deliverable')
    }

    await fetchDeliverables()
    return result.deliverable as Deliverable
  }

  return {
    deliverables,
    loading,
    error,
    refetch: fetchDeliverables,
    createDeliverable,
    updateDeliverable,
    deleteDeliverable,
    submitForReview,
    approveDeliverable,
    rejectDeliverable,
  }
}

export function useDeliverable(id: string | null) {
  const [deliverable, setDeliverable] = useState<Deliverable | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDeliverable = useCallback(async () => {
    if (!id) {
      setDeliverable(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/deliverables/${id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch deliverable')
      }

      setDeliverable(data.deliverable)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch deliverable')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchDeliverable()
  }, [fetchDeliverable])

  // Realtime subscription
  useEffect(() => {
    if (!id) return

    const supabase = createClient()

    const subscription = supabase
      .channel(`deliverable:${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deliverables',
          filter: `id=eq.${id}`,
        },
        () => {
          fetchDeliverable()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [id, fetchDeliverable])

  return {
    deliverable,
    loading,
    error,
    refetch: fetchDeliverable,
  }
}

export function useDeliverableVersions(deliverableId: string | null) {
  const [versions, setVersions] = useState<DeliverableVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVersions = useCallback(async () => {
    if (!deliverableId) {
      setVersions([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/deliverables/${deliverableId}/versions`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch versions')
      }

      setVersions(data.versions)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch versions')
    } finally {
      setLoading(false)
    }
  }, [deliverableId])

  useEffect(() => {
    fetchVersions()
  }, [fetchVersions])

  const createVersion = async (data: {
    fileUrl: string
    thumbnailUrl?: string
    notes?: string
  }) => {
    if (!deliverableId) throw new Error('Deliverable ID is required')

    const response = await fetch(`/api/deliverables/${deliverableId}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create version')
    }

    await fetchVersions()
    return result.version as DeliverableVersion
  }

  return {
    versions,
    loading,
    error,
    refetch: fetchVersions,
    createVersion,
  }
}
