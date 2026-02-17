'use client'

import { useState } from 'react'
import { useTaskComments } from '@/hooks/use-task-comments'
import { Avatar } from '@/components/ui'
import { Send, Loader2, Reply, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface TaskCommentsProps {
  taskId: string
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const { comments, loading, addComment } = useTaskComments({ taskId })
  const [content, setContent] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return
    setSubmitting(true)
    try {
      await addComment(content, { parentId: replyTo || undefined })
      setContent('')
      setReplyTo(null)
    } catch (err) {
      console.error('Error adding comment:', err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-white/30" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-white/40">
        <MessageSquare className="w-4 h-4" />
        <span>{comments.length} comment{comments.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Comments list */}
      {comments.length > 0 && (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="space-y-2">
              <div className="flex items-start gap-3">
                <Avatar name={comment.user?.full_name || 'User'} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {comment.user?.full_name || 'Unknown'}
                    </span>
                    <span className="text-xs text-white/30">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-white/70 mt-0.5">{comment.content}</p>
                  <button
                    onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                    className="flex items-center gap-1 text-xs text-white/30 hover:text-[#23FD9E] transition-colors mt-1"
                  >
                    <Reply className="w-3 h-3" />
                    Reply
                  </button>
                </div>
              </div>

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-10 space-y-2 border-l border-white/[0.06] pl-3">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex items-start gap-3">
                      <Avatar name={reply.user?.full_name || 'User'} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">
                            {reply.user?.full_name || 'Unknown'}
                          </span>
                          <span className="text-xs text-white/30">
                            {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-white/70 mt-0.5">{reply.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply input */}
              {replyTo === comment.id && (
                <div className="ml-10 flex items-center gap-2">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write a reply..."
                    className="flex-1 bg-[#2B2B2B] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#23FD9E]/50 resize-none"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSubmit()
                      }
                    }}
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={!content.trim() || submitting}
                    className="p-2 rounded-lg bg-[#23FD9E]/10 text-[#23FD9E] hover:bg-[#23FD9E]/20 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New comment input (when not replying) */}
      {!replyTo && (
        <div className="flex items-center gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 bg-[#2B2B2B] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#23FD9E]/50 resize-none"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || submitting}
            className="p-2 rounded-lg bg-[#23FD9E]/10 text-[#23FD9E] hover:bg-[#23FD9E]/20 disabled:opacity-50 transition-colors"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  )
}
