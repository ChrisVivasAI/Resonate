'use client'

import { cn, getInitials } from '@/lib/utils'

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Avatar({ className, src, name, size = 'md', ...props }: AvatarProps) {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  }

  return (
    <div
      className={cn(
        'relative rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-resonate-500 to-resonate-700 text-white font-medium',
        sizes[size],
        className
      )}
      {...props}
    >
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  )
}
