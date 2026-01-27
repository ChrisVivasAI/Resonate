'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'

interface NavChild {
  name: string
  href: string
  icon?: LucideIcon
}

interface SidebarNavItemProps {
  name: string
  href: string
  icon: LucideIcon
  isCollapsed: boolean
  highlight?: boolean
  children?: NavChild[]
  index: number
}

export function SidebarNavItem({
  name,
  href,
  icon: Icon,
  isCollapsed,
  highlight,
  children,
  index,
}: SidebarNavItemProps) {
  const pathname = usePathname()
  const [isExpanded, setIsExpanded] = useState(false)

  // Check if this item or any of its children are active
  const isActive = pathname === href || pathname.startsWith(href + '/')
  const hasChildren = children && children.length > 0

  // Auto-expand if a child is active
  useEffect(() => {
    if (hasChildren && children.some(child => pathname.startsWith(child.href))) {
      setIsExpanded(true)
    }
  }, [pathname, hasChildren, children])

  const handleClick = (e: React.MouseEvent) => {
    if (hasChildren && !isCollapsed) {
      e.preventDefault()
      setIsExpanded(!isExpanded)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={hasChildren && !isCollapsed ? '#' : href}
        onClick={handleClick}
        className={cn(
          'relative flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-300 group',
          isActive
            ? 'text-white'
            : 'text-charcoal-500 hover:text-charcoal-200'
        )}
      >
        {/* Active background - frosted glass */}
        {isActive && !hasChildren && (
          <motion.div
            layoutId="activeNavBg"
            className="absolute inset-0 rounded-lg bg-white/[0.04] backdrop-blur-sm border border-white/[0.06]"
            transition={{ type: 'spring', duration: 0.5, bounce: 0.15 }}
          />
        )}

        {/* Active indicator - subtle cyan accent */}
        {isActive && !hasChildren && (
          <motion.div
            layoutId="activeNavIndicator"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-resonate-400 rounded-r-full"
            transition={{ type: 'spring', duration: 0.5 }}
          />
        )}

        <div
          className={cn(
            'relative flex items-center justify-center w-8 h-8 rounded-md transition-all duration-300',
            isActive
              ? 'bg-white/[0.06]'
              : 'bg-transparent group-hover:bg-white/[0.03]'
          )}
        >
          <Icon
            className={cn(
              'w-[18px] h-[18px] transition-colors duration-300',
              isActive
                ? highlight ? 'text-resonate-400' : 'text-white'
                : 'text-charcoal-500 group-hover:text-charcoal-300'
            )}
          />
          {highlight && isActive && (
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-resonate-400 rounded-full" />
          )}
        </div>

        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative text-sm tracking-wide flex-1"
            >
              {name}
            </motion.span>
          )}
        </AnimatePresence>

        {/* AI Badge */}
        {highlight && !isCollapsed && (
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "ml-auto px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.15em] rounded",
              isActive
                ? "text-resonate-400 bg-resonate-400/10 border border-resonate-400/20"
                : "text-charcoal-500 bg-white/[0.03] border border-white/[0.06]"
            )}
          >
            AI
          </motion.span>
        )}

        {/* Expand/Collapse indicator for items with children */}
        {hasChildren && !isCollapsed && (
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="ml-auto"
          >
            <ChevronDown className="w-4 h-4 text-charcoal-500" />
          </motion.div>
        )}
      </Link>

      {/* Children (sub-navigation) */}
      <AnimatePresence>
        {hasChildren && isExpanded && !isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="pl-8 py-1 space-y-1">
              {children.map((child) => {
                const childActive = pathname === child.href || pathname.startsWith(child.href + '/')
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200',
                      childActive
                        ? 'text-white bg-white/[0.04]'
                        : 'text-charcoal-500 hover:text-charcoal-300 hover:bg-white/[0.02]'
                    )}
                  >
                    {child.icon && (
                      <child.icon className="w-4 h-4" />
                    )}
                    <span>{child.name}</span>
                  </Link>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
