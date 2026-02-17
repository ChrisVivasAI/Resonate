'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Comment } from '@/types'

interface UseTaskCommentsOptions {
  taskId: string | null
  realtime?: boolean
}

export function useTaskComments({ taskId, realtime = true }: UseTaskCommentsOptions) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchComments = useCallback(async () => {
    if (!taskId) {
      setComments([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/tasks/${taskId}/comments`)
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
  }, [taskId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  // Realtime subscription
  useEffect(() => {
    if (!realtime || !taskId) return

    const supabase = createClient()

    const subscription = supabase
      .channel(`task_comments:${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          fetchComments()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [realtime, taskId, fetchComments])

  const addComment = async (
    content: string,
    options?: { parentId?: string; isInternal?: boolean }
  ) => {
    if (!taskId) throw new Error('Task ID is required')

    const response = await fetch(`/api/tasks/${taskId}/comments`, {
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
