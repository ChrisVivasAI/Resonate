'use client'

import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'glow'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  animate?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      animate = false,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary: cn(
        'relative overflow-hidden',
        'bg-white text-neutral-900 font-medium',
        'shadow-lg shadow-white/10',
        'hover:shadow-xl hover:shadow-white/20 hover:scale-[1.02]',
        'active:scale-[0.98]',
        'transition-all duration-300 ease-out',
        // Inner highlight on hover
        'before:absolute before:inset-0 before:bg-gradient-to-t before:from-transparent before:to-white/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity'
      ),
      secondary: cn(
        'relative overflow-hidden',
        'bg-neutral-800/80 text-neutral-100',
        'border border-neutral-700/50',
        'hover:bg-neutral-700/80 hover:border-neutral-600/50 hover:scale-[1.02]',
        'active:scale-[0.98]',
        'transition-all duration-300 ease-out'
      ),
      ghost: cn(
        'text-neutral-300',
        'hover:bg-neutral-800/50 hover:text-white',
        'transition-all duration-300 ease-out'
      ),
      danger: cn(
        'relative overflow-hidden',
        'bg-gradient-to-r from-red-600 to-red-700',
        'text-white font-medium',
        'shadow-lg shadow-red-500/20',
        'hover:shadow-xl hover:shadow-red-500/30 hover:scale-[1.02]',
        'active:scale-[0.98]',
        'transition-all duration-300 ease-out'
      ),
      outline: cn(
        'relative overflow-hidden',
        'bg-transparent border border-white/30 text-white',
        'hover:bg-white/10 hover:border-white/50 hover:scale-[1.02]',
        'active:scale-[0.98]',
        'transition-all duration-300 ease-out'
      ),
      glow: cn(
        'relative overflow-hidden',
        'bg-white text-neutral-900 font-medium',
        'shadow-glow-md',
        'hover:shadow-glow-lg hover:scale-[1.02]',
        'active:scale-[0.98]',
        'transition-all duration-300 ease-out',
        'animate-glow-pulse'
      ),
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
      md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
      lg: 'px-6 py-3 text-base rounded-xl gap-2',
      xl: 'px-8 py-4 text-lg rounded-2xl gap-3',
    }

    const iconSizes = {
      sm: 'w-3.5 h-3.5',
      md: 'w-4 h-4',
      lg: 'w-5 h-5',
      xl: 'w-6 h-6',
    }

    const buttonClassName = cn(
      'relative inline-flex items-center justify-center font-medium',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950',
      variants[variant],
      sizes[size],
      className
    )

    if (animate) {
      // Extract only safe props for motion.button
      const { onClick, onMouseEnter, onMouseLeave, onFocus, onBlur, type, form, name, value } = props
      return (
        <motion.button
          ref={ref}
          className={buttonClassName}
          disabled={disabled || isLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onFocus={onFocus}
          onBlur={onBlur}
          type={type}
          form={form}
          name={name}
          value={value}
        >
          {/* Shimmer effect on primary buttons */}
          {variant === 'primary' && (
            <span className="absolute inset-0 overflow-hidden rounded-inherit">
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-shimmer" />
            </span>
          )}

          {isLoading ? (
            <>
              <Loader2 className={cn('animate-spin', iconSizes[size])} />
              <span>Loading...</span>
            </>
          ) : (
            <>
              {leftIcon && (
                <span className={cn('flex-shrink-0', iconSizes[size])}>{leftIcon}</span>
              )}
              <span className="relative z-10">{children}</span>
              {rightIcon && (
                <span className={cn('flex-shrink-0', iconSizes[size])}>{rightIcon}</span>
              )}
            </>
          )}
        </motion.button>
      )
    }

    return (
      <button
        ref={ref}
        className={buttonClassName}
        disabled={disabled || isLoading}
        {...props}
      >
        {/* Shimmer effect on primary buttons */}
        {variant === 'primary' && (
          <span className="absolute inset-0 overflow-hidden rounded-inherit">
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-shimmer" />
          </span>
        )}

        {isLoading ? (
          <>
            <Loader2 className={cn('animate-spin', iconSizes[size])} />
            <span>Loading...</span>
          </>
        ) : (
          <>
            {leftIcon && (
              <span className={cn('flex-shrink-0', iconSizes[size])}>{leftIcon}</span>
            )}
            <span className="relative z-10">{children}</span>
            {rightIcon && (
              <span className={cn('flex-shrink-0', iconSizes[size])}>{rightIcon}</span>
            )}
          </>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

// Icon Button variant for icon-only buttons
export interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon'> {
  icon: React.ReactNode
  label: string
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = 'ghost', size = 'md', icon, label, ...props }, ref) => {
    const sizes = {
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12',
      xl: 'w-14 h-14',
    }

    return (
      <Button
        ref={ref}
        variant={variant}
        className={cn('!p-0', sizes[size], className)}
        aria-label={label}
        {...props}
      >
        {icon}
      </Button>
    )
  }
)

IconButton.displayName = 'IconButton'

export { Button, IconButton }
