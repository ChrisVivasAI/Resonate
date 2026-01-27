'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, MessageSquare, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ApprovalButtonsProps {
  onApprove: (feedback?: string) => Promise<void>
  onReject: (feedback: string, requestChanges?: boolean) => Promise<void>
  disabled?: boolean
}

export function ApprovalButtons({ onApprove, onReject, disabled }: ApprovalButtonsProps) {
  const [mode, setMode] = useState<'idle' | 'approve' | 'reject'>('idle')
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [requestChanges, setRequestChanges] = useState(true)

  const handleApprove = async () => {
    setLoading(true)
    try {
      await onApprove(feedback || undefined)
      setMode('idle')
      setFeedback('')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!feedback.trim()) return
    setLoading(true)
    try {
      await onReject(feedback, requestChanges)
      setMode('idle')
      setFeedback('')
    } finally {
      setLoading(false)
    }
  }

  if (mode !== 'idle') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#2B2B2B]/80 backdrop-blur-sm border border-white/10 rounded-xl p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          {mode === 'approve' ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-[#23FD9E]" />
              <span className="font-medium text-white">Approve Deliverable</span>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5 text-red-400" />
              <span className="font-medium text-white">
                {requestChanges ? 'Request Changes' : 'Reject Deliverable'}
              </span>
            </>
          )}
        </div>

        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder={
            mode === 'approve'
              ? 'Add optional feedback...'
              : 'Explain what needs to change...'
          }
          className={cn(
            'w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder:text-white/30 resize-none focus:outline-none transition-all',
            mode === 'approve'
              ? 'focus:border-[#23FD9E]/50 focus:ring-1 focus:ring-[#23FD9E]/50'
              : 'focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50'
          )}
          rows={3}
        />

        {mode === 'reject' && (
          <label className="flex items-center gap-2 mt-3 cursor-pointer">
            <input
              type="checkbox"
              checked={requestChanges}
              onChange={(e) => setRequestChanges(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#23FD9E] focus:ring-[#23FD9E]/50"
            />
            <span className="text-sm text-white/60">
              Request changes (allow revision) instead of full rejection
            </span>
          </label>
        )}

        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => {
              setMode('idle')
              setFeedback('')
            }}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg bg-white/5 text-white/60 font-medium text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={mode === 'approve' ? handleApprove : handleReject}
            disabled={loading || (mode === 'reject' && !feedback.trim())}
            className={cn(
              'flex-1 px-4 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50',
              mode === 'approve'
                ? 'bg-[#23FD9E] text-[#1a1a1a] hover:bg-[#1ed189]'
                : 'bg-red-500 text-white hover:bg-red-600'
            )}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {mode === 'approve' ? 'Approving...' : 'Submitting...'}
              </>
            ) : (
              <>
                {mode === 'approve' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm Approval
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    {requestChanges ? 'Request Changes' : 'Reject'}
                  </>
                )}
              </>
            )}
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setMode('approve')}
        disabled={disabled}
        className="flex-1 px-4 py-3 rounded-xl bg-[#23FD9E] text-[#1a1a1a] font-semibold flex items-center justify-center gap-2 hover:bg-[#1ed189] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <CheckCircle2 className="w-5 h-5" />
        Approve
      </button>
      <button
        onClick={() => setMode('reject')}
        disabled={disabled}
        className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-semibold flex items-center justify-center gap-2 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <MessageSquare className="w-5 h-5" />
        Request Changes
      </button>
    </div>
  )
}
