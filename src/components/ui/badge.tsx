'use client'

import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline' | 'ember'
  size?: 'sm' | 'md'
}

export function Badge({ className, variant = 'default', size = 'sm', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-obsidian-800/80 text-obsidian-300 border-obsidian-700/50',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger: 'bg-red-500/10 text-red-400 border-red-500/20',
    info: 'bg-accent-500/10 text-accent-400 border-accent-500/20',
    outline: 'bg-transparent text-ember-400 border-ember-500/30',
    ember: 'bg-ember-500/10 text-ember-400 border-ember-500/20',
  }

  const sizes = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg font-medium border capitalize',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
}
