'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Send, Lock, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CommentInputProps {
  onSubmit: (content: string, isInternal?: boolean) => Promise<void>
  placeholder?: string
  showInternalToggle?: boolean
  isReply?: boolean
  onCancel?: () => void
}

export function CommentInput({
  onSubmit,
  placeholder = 'Write a comment...',
  showInternalToggle = false,
  isReply = false,
  onCancel,
}: CommentInputProps) {
  const [content, setContent] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || loading) return

    setLoading(true)
    try {
      await onSubmit(content.trim(), showInternalToggle ? isInternal : undefined)
      setContent('')
      setIsInternal(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div
        className={cn(
          'bg-white/5 border border-white/10 rounded-xl overflow-hidden transition-all',
          isInternal && 'border-amber-500/30 bg-amber-500/5'
        )}
      >
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          rows={isReply ? 2 : 3}
          className="w-full bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/30 resize-none focus:outline-none"
        />

        <div className="flex items-center justify-between px-3 py-2 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            {showInternalToggle && (
              <button
                type="button"
                onClick={() => setIsInternal(!isInternal)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
                  isInternal
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-white/5 text-white/40 hover:text-white/60'
                )}
              >
                <Lock className="w-3.5 h-3.5" />
                Internal
              </button>
            )}

            {isReply && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-2.5 py-1.5 rounded-md text-xs text-white/40 hover:text-white/60 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={!content.trim() || loading}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              'bg-[#23FD9E] text-[#1a1a1a] hover:bg-[#1ed189]',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                {isReply ? 'Reply' : 'Comment'}
              </>
            )}
          </button>
        </div>
      </div>

      {isInternal && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-amber-400/80 mt-2 flex items-center gap-1"
        >
          <Lock className="w-3 h-3" />
          This comment will only be visible to team members
        </motion.p>
      )}
    </form>
  )
}
