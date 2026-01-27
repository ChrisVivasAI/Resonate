'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Comment } from '@/types'

interface UseCommentsOptions {
  deliverableId: string | null
  realtime?: boolean
}

export function useComments({ deliverableId, realtime = true }: UseCommentsOptions) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchComments = useCallback(async () => {
    if (!deliverableId) {
      setComments([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/deliverables/${deliverableId}/comments`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch comments')
      }

      setComments(data.comments || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch comments')
    } finally {
      setLoading(false)
    }
  }, [deliverableId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  // Realtime subscription
  useEffect(() => {
    if (!realtime || !deliverableId) return

    const supabase = createClient()

    const subscription = supabase
      .channel(`comments:${deliverableId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `deliverable_id=eq.${deliverableId}`,
        },
        () => {
          fetchComments()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [realtime, deliverableId, fetchComments])

  const addComment = async (
    content: string,
    options?: { parentId?: string; isInternal?: boolean }
  ) => {
    if (!deliverableId) throw new Error('Deliverable ID is required')

    const response = await fetch(`/api/deliverables/${deliverableId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        parentId: options?.parentId,
        isInternal: options?.isInternal,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to add comment')
    }

    await fetchComments()
    return result.comment as Comment
  }

  // Organize comments into threads
  const threadedComments = comments.reduce<Comment[]>((acc, comment) => {
    if (!comment.parent_id) {
      // Top-level comment
      const replies = comments.filter(c => c.parent_id === comment.id)
      acc.push({ ...comment, replies })
    }
    return acc
  }, [])

  return {
    comments: threadedComments,
    allComments: comments,
    loading,
    error,
    refetch: fetchComments,
    addComment,
  }
}
