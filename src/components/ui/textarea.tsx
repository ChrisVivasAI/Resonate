'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>}
        <textarea
          ref={ref}
          className={cn(
            'w-full bg-midnight-900/50 border border-midnight-700 rounded-lg px-4 py-3 text-slate-100 placeholder:text-slate-500',
            'focus:outline-none focus:border-resonate-500/50 focus:ring-2 focus:ring-resonate-500/20',
            'transition-all duration-300 min-h-[120px] resize-y disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
        {hint && !error && <p className="mt-1.5 text-sm text-slate-500">{hint}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
export { Textarea }
