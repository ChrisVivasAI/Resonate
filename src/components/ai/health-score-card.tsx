'use client'

import { motion } from 'framer-motion'
import { Activity, TrendingUp, TrendingDown, Minus, RefreshCw, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { HealthStatus } from '@/types'

interface HealthScoreCardProps {
  score: number | null
  status: HealthStatus | null
  previousScore?: number
  lastChecked?: string
  onRunAnalysis?: () => void
  analyzing?: boolean
  compact?: boolean
}

const statusConfig: Record<HealthStatus, { color: string; bgColor: string; label: string }> = {
  healthy: {
    color: 'text-[#23FD9E]',
    bgColor: 'bg-[#23FD9E]',
    label: 'Healthy',
  },
  at_risk: {
    color: 'text-amber-400',
    bgColor: 'bg-amber-400',
    label: 'At Risk',
  },
  critical: {
    color: 'text-red-400',
    bgColor: 'bg-red-400',
    label: 'Critical',
  },
}

export function HealthScoreCard({
  score,
  status,
  previousScore,
  lastChecked,
  onRunAnalysis,
  analyzing = false,
  compact = false,
}: HealthScoreCardProps) {
  const config = status ? statusConfig[status] : null
  const trend = previousScore !== undefined && score !== null ? score - previousScore : null

  // Calculate the stroke dashoffset for the circular progress
  const circumference = 2 * Math.PI * 45 // radius = 45
  const strokeDashoffset = score !== null ? circumference - (score / 100) * circumference : circumference

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="relative w-12 h-12">
          <svg className="w-12 h-12 -rotate-90">
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              className="text-white/10"
            />
            {score !== null && (
              <motion.circle
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className={config?.color || 'text-white/40'}
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 20}
                initial={{ strokeDashoffset: 2 * Math.PI * 20 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 20 - (score / 100) * 2 * Math.PI * 20 }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn('text-sm font-bold', config?.color || 'text-white/40')}>
              {score !== null ? score : '—'}
            </span>
          </div>
        </div>
        <div>
          <p className={cn('text-sm font-medium', config?.color || 'text-white/40')}>
            {config?.label || 'No Data'}
          </p>
          {trend !== null && trend !== 0 && (
            <p className={cn('text-xs flex items-center gap-0.5', trend > 0 ? 'text-[#23FD9E]' : 'text-red-400')}>
              {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(trend)} pts
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#2B2B2B]/60 backdrop-blur-sm border border-white/10 rounded-xl p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-white/40" />
          <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">
            Project Health
          </h3>
        </div>
        {onRunAnalysis && (
          <button
            onClick={onRunAnalysis}
            disabled={analyzing}
            className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors disabled:opacity-50"
            title="Run analysis"
          >
            {analyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      <div className="flex items-center gap-6">
        {/* Score circle */}
        <div className="relative w-28 h-28">
          <svg className="w-28 h-28 -rotate-90">
            <circle
              cx="56"
              cy="56"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-white/10"
            />
            {score !== null && (
              <motion.circle
                cx="56"
                cy="56"
                r="45"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className={config?.color || 'text-white/40'}
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className={cn('text-3xl font-bold', config?.color || 'text-white/40')}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              {score !== null ? score : '—'}
            </motion.span>
            <span className="text-xs text-white/40">/ 100</span>
          </div>
        </div>

        {/* Status and trend */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className={cn('w-2 h-2 rounded-full', config?.bgColor || 'bg-white/20')} />
            <span className={cn('text-lg font-semibold', config?.color || 'text-white/40')}>
              {config?.label || 'No Data'}
            </span>
          </div>

          {trend !== null && (
            <div className={cn(
              'flex items-center gap-1 text-sm',
              trend > 0 ? 'text-[#23FD9E]' : trend < 0 ? 'text-red-400' : 'text-white/40'
            )}>
              {trend > 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : trend < 0 ? (
                <TrendingDown className="w-4 h-4" />
              ) : (
                <Minus className="w-4 h-4" />
              )}
              <span>
                {trend > 0 ? '+' : ''}{trend} from last check
              </span>
            </div>
          )}

          {lastChecked && (
            <p className="text-xs text-white/30 mt-2">
              Last checked: {new Date(lastChecked).toLocaleDateString()} at{' '}
              {new Date(lastChecked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
