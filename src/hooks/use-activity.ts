'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ActivityFeedItem } from '@/types'

interface UseActivityOptions {
  projectId: string | null
  limit?: number
  realtime?: boolean
}

export function useActivity({ projectId, limit = 20, realtime = true }: UseActivityOptions) {
  const [activities, setActivities] = useState<ActivityFeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)

  const fetchActivity = useCallback(async (offset = 0, append = false) => {
    if (!projectId) {
      setActivities([])
      setLoading(false)
      return
    }

    try {
      if (!append) setLoading(true)

      const response = await fetch(
        `/api/projects/${projectId}/activity?limit=${limit}&offset=${offset}`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch activity')
      }

      if (append) {
        setActivities(prev => [...prev, ...(data.activities || [])])
      } else {
        setActivities(data.activities || [])
      }

      setHasMore(data.hasMore)
      setTotal(data.total)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activity')
    } finally {
      setLoading(false)
    }
  }, [projectId, limit])

  useEffect(() => {
    fetchActivity()
  }, [fetchActivity])

  // Realtime subscription
  useEffect(() => {
    if (!realtime || !projectId) return

    const supabase = createClient()

    const subscription = supabase
      .channel(`activity:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_feed',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          // Refresh the activity list when new activity is added
          fetchActivity()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [realtime, projectId, fetchActivity])

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchActivity(activities.length, true)
    }
  }

  return {
    activities,
    loading,
    error,
    hasMore,
    total,
    refetch: () => fetchActivity(),
    loadMore,
  }
}
