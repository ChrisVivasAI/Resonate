'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, FolderKanban, CreditCard, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'

interface ClientNavItem {
  id: string
  name: string
}

interface ClientSubNavProps {
  client: ClientNavItem
  isCollapsed: boolean
}

export function ClientSubNav({ client, isCollapsed }: ClientSubNavProps) {
  const pathname = usePathname()
  const [isExpanded, setIsExpanded] = useState(false)

  const clientBasePath = `/clients/${client.id}`
  const isActive = pathname.startsWith(clientBasePath)

  // Auto-expand if this client's routes are active
  useEffect(() => {
    if (isActive) {
      setIsExpanded(true)
    }
  }, [isActive])

  const subItems = [
    { name: 'Overview', href: clientBasePath, icon: User },
    { name: 'Projects', href: `${clientBasePath}/projects`, icon: FolderKanban },
    { name: 'Payments', href: `${clientBasePath}/payments`, icon: CreditCard },
  ]

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200',
          isActive
            ? 'text-white bg-white/[0.04]'
            : 'text-charcoal-500 hover:text-charcoal-300 hover:bg-white/[0.02]'
        )}
      >
        <div className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium',
          isActive ? 'bg-resonate-400/20 text-resonate-400' : 'bg-charcoal-800 text-charcoal-400'
        )}>
          {client.name.charAt(0).toUpperCase()}
        </div>
        {!isCollapsed && (
          <>
            <span className="flex-1 text-left truncate">{client.name}</span>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-3 h-3 text-charcoal-600" />
            </motion.div>
          </>
        )}
      </button>

      <AnimatePresence>
        {isExpanded && !isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-6 py-1 space-y-0.5">
              {subItems.map((item) => {
                // For overview, only match exact path
                const isItemActive = item.name === 'Overview'
                  ? pathname === item.href
                  : pathname.startsWith(item.href) && item.name !== 'Overview'

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-all duration-200',
                      isItemActive
                        ? 'text-white bg-white/[0.04]'
                        : 'text-charcoal-600 hover:text-charcoal-400 hover:bg-white/[0.02]'
                    )}
                  >
                    <item.icon className="w-3.5 h-3.5" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
