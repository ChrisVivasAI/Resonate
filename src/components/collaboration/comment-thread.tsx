'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { Reply, Lock, MessageSquare } from 'lucide-react'
import { CommentInput } from './comment-input'
import { Avatar } from '@/components/ui'
import type { Comment } from '@/types'
import { cn } from '@/lib/utils'

interface CommentThreadProps {
  comments: Comment[]
  onReply: (content: string, parentId: string, isInternal?: boolean) => Promise<void>
  showInternalToggle?: boolean
  emptyMessage?: string
}

export function CommentThread({
  comments,
  onReply,
  showInternalToggle = false,
  emptyMessage = 'No comments yet',
}: CommentThreadProps) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

  if (comments.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="w-8 h-8 text-white/20 mx-auto mb-2" />
        <p className="text-white/40 text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {comments.map((comment, index) => (
        <motion.div
          key={comment.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <CommentItem
            comment={comment}
            onReply={(content, isInternal) => onReply(content, comment.id, isInternal)}
            showInternalToggle={showInternalToggle}
            isReplying={replyingTo === comment.id}
            onReplyClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
          />

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="ml-12 mt-3 space-y-3 border-l-2 border-white/10 pl-4">
              {comment.replies.map((reply, replyIndex) => (
                <motion.div
                  key={reply.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (index + replyIndex + 1) * 0.05 }}
                >
                  <CommentItem
                    comment={reply}
                    showInternalToggle={showInternalToggle}
                    isReply
                  />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  )
}

interface CommentItemProps {
  comment: Comment
  onReply?: (content: string, isInternal?: boolean) => Promise<void>
  showInternalToggle?: boolean
  isReplying?: boolean
  onReplyClick?: () => void
  isReply?: boolean
}

function CommentItem({
  comment,
  onReply,
  showInternalToggle = false,
  isReplying = false,
  onReplyClick,
  isReply = false,
}: CommentItemProps) {
  return (
    <div
      className={cn(
        'rounded-xl p-4 transition-all',
        comment.is_internal
          ? 'bg-amber-500/5 border border-amber-500/20'
          : 'bg-white/[0.02] border border-white/[0.06]'
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar
          name={comment.user?.full_name || 'Unknown'}
          src={comment.user?.avatar_url}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-white text-sm">
              {comment.user?.full_name || 'Unknown User'}
            </span>
            {comment.is_internal && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-400">
                <Lock className="w-2.5 h-2.5" />
                Internal
              </span>
            )}
            <span className="text-xs text-white/40">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
          </div>

          <p className="text-sm text-white/80 whitespace-pre-wrap">{comment.content}</p>

          {!isReply && onReplyClick && (
            <button
              onClick={onReplyClick}
              className="flex items-center gap-1 mt-2 text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              <Reply className="w-3.5 h-3.5" />
              Reply
            </button>
          )}
        </div>
      </div>

      {/* Reply input */}
      {isReplying && onReply && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 ml-11"
        >
          <CommentInput
            onSubmit={async (content, isInternal) => {
              await onReply(content, isInternal)
              onReplyClick?.()
            }}
            placeholder="Write a reply..."
            showInternalToggle={showInternalToggle}
            isReply
            onCancel={onReplyClick}
          />
        </motion.div>
      )}
    </div>
  )
}
