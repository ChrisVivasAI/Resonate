'use client'

import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'highlight' | 'elevated' | 'gradient'
  glow?: boolean
  animate?: boolean
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', glow = false, animate = false, children, ...props }, ref) => {
    const variants = {
      default: 'glass',
      interactive: 'card-interactive',
      highlight: 'card-highlight',
      elevated: 'card-elevated',
      gradient: 'gradient-border-animated',
    }

    const glowClass = glow ? 'glow-ember' : ''
    const cardClassName = cn('rounded-2xl p-6', variants[variant], glowClass, className)

    const content = (
      <>
        {/* Top highlight line for default cards */}
        {variant === 'default' && (
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        )}
        {children}
      </>
    )

    if (animate) {
      return (
        <motion.div
          ref={ref}
          className={cardClassName}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {content}
        </motion.div>
      )
    }

    return (
      <div ref={ref} className={cardClassName} {...props}>
        {content}
      </div>
    )
  }
)

Card.displayName = 'Card'

const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 pb-6', className)} {...props} />
  )
)
CardHeader.displayName = 'CardHeader'

const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-xl font-semibold text-white tracking-tight', className)}
      {...props}
    />
  )
)
CardTitle.displayName = 'CardTitle'

const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-obsidian-400 leading-relaxed', className)} {...props} />
  )
)
CardDescription.displayName = 'CardDescription'

const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('', className)} {...props} />
)
CardContent.displayName = 'CardContent'

const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center pt-6 mt-6 border-t border-obsidian-800/50', className)}
      {...props}
    />
  )
)
CardFooter.displayName = 'CardFooter'

// Stat Card - specialized for displaying metrics
export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'ember' | 'accent' | 'success'
}

const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'stat-card',
      ember: 'stat-card stat-card-ember',
      accent: 'stat-card stat-card-accent',
      success: 'stat-card bg-gradient-to-br from-emerald-500/5 to-obsidian-900/40 border border-emerald-500/10',
    }

    return (
      <div ref={ref} className={cn(variants[variant], className)} {...props}>
        {children}
      </div>
    )
  }
)
StatCard.displayName = 'StatCard'

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, StatCard }
