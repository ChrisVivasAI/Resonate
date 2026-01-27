'use client'

import { cn } from '@/lib/utils'

export interface ProgressProps {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  variant?: 'default' | 'success' | 'warning' | 'error'
  className?: string
}

export function Progress({
  value,
  max = 100,
  size = 'md',
  showLabel = false,
  variant = 'default',
  className,
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  const sizes = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }

  const variants = {
    default: 'bg-gradient-to-r from-resonate-500 to-resonate-400',
    success: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
    warning: 'bg-gradient-to-r from-amber-500 to-amber-400',
    error: 'bg-gradient-to-r from-red-500 to-red-400',
  }

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between mb-2">
          <span className="text-sm text-slate-400">Progress</span>
          <span className="text-sm font-medium text-slate-200">{Math.round(percentage)}%</span>
        </div>
      )}
      <div
        className={cn(
          'w-full bg-midnight-800 rounded-full overflow-hidden',
          sizes[size]
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            variants[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
