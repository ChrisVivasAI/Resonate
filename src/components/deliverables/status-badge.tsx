'use client'

import { cn } from '@/lib/utils'
import type { DeliverableStatus } from '@/types'
import { Clock, Eye, CheckCircle2, XCircle, Award } from 'lucide-react'

interface StatusBadgeProps {
  status: DeliverableStatus
  size?: 'sm' | 'md'
  showIcon?: boolean
}

const statusConfig: Record<
  DeliverableStatus,
  {
    label: string
    bgColor: string
    textColor: string
    borderColor: string
    icon: React.ComponentType<{ className?: string }>
  }
> = {
  draft: {
    label: 'Draft',
    bgColor: 'bg-white/5',
    textColor: 'text-white/60',
    borderColor: 'border-white/10',
    icon: Clock,
  },
  in_review: {
    label: 'In Review',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/20',
    icon: Eye,
  },
  approved: {
    label: 'Approved',
    bgColor: 'bg-[#23FD9E]/10',
    textColor: 'text-[#23FD9E]',
    borderColor: 'border-[#23FD9E]/20',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Rejected',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-400',
    borderColor: 'border-red-500/20',
    icon: XCircle,
  },
  final: {
    label: 'Final',
    bgColor: 'bg-violet-500/10',
    textColor: 'text-violet-400',
    borderColor: 'border-violet-500/20',
    icon: Award,
  },
}

export function StatusBadge({ status, size = 'md', showIcon = true }: StatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 border rounded-full font-medium',
        config.bgColor,
        config.textColor,
        config.borderColor,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      {showIcon && (
        <Icon className={cn(size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
      )}
      <span>{config.label}</span>
    </div>
  )
}
