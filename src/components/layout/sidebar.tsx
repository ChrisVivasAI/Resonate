'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CreditCard,
  Sparkles,
  MessageSquareText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Zap,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useClientNavigation } from '@/hooks/use-client-navigation'
import { ClientSubNav } from './client-sub-nav'

// Top-level navigation items (without Projects and Payments - they're now under Clients)
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Clients', href: '/clients', icon: Users, expandable: true },
  { name: 'Leads', href: '/leads', icon: MessageSquareText },
  { name: 'AI Studio', href: '/ai-studio', icon: Sparkles, highlight: true },
]

const bottomNavigation = [
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isClientsExpanded, setIsClientsExpanded] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const { activeClients, loading: clientsLoading } = useClientNavigation()

  // Create supabase client once
  const supabase = useMemo(() => createClient(), [])

  // Auto-expand clients section if on a client-related route
  useEffect(() => {
    if (pathname.startsWith('/clients')) {
      setIsClientsExpanded(true)
    }
  }, [pathname])

  const handleSignOut = async () => {
    if (isSigningOut) return

    setIsSigningOut(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error)
        setIsSigningOut(false)
        return
      }
      // Force a hard navigation to clear all state
      window.location.href = '/auth/login'
    } catch (error) {
      console.error('Sign out error:', error)
      setIsSigningOut(false)
    }
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 280 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed left-0 top-0 h-screen z-40 flex flex-col"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-charcoal-950/90 backdrop-blur-2xl" />

      {/* Subtle border */}
      <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />

      {/* Content */}
      <div className="relative flex flex-col h-full">
        {/* Logo */}
        <div className={cn(
          "h-20 flex items-center",
          isCollapsed ? "justify-center px-3" : "justify-between px-5"
        )}>
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="relative flex items-center"
            >
              {isCollapsed ? (
                <div className="w-10 h-10 rounded-lg bg-charcoal-900 flex items-center justify-center border border-white/[0.08] overflow-hidden">
                  <Image
                    src="/favicon.png"
                    alt="RESONATE"
                    width={28}
                    height={28}
                    className="w-7 h-7 object-contain"
                  />
                </div>
              ) : (
                <Image
                  src="/images/resonate-logo-white.png"
                  alt="RESONATE"
                  width={140}
                  height={28}
                  className="h-6 w-auto"
                />
              )}
              {/* Subtle glow on hover */}
              <div className="absolute inset-0 rounded-lg bg-white/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </motion.div>
          </Link>

          {!isCollapsed && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-lg text-charcoal-500 hover:text-white hover:bg-white/[0.04] transition-all duration-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
          )}
        </div>

        {/* Expand button when collapsed - positioned at bottom of logo area */}
        {isCollapsed && (
          <div className="flex justify-center -mt-2 mb-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsCollapsed(false)}
              className="p-1.5 rounded-md text-charcoal-500 hover:text-white hover:bg-white/[0.04] transition-all duration-300"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        )}

        {/* Divider */}
        <div className="mx-5 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {navigation.map((item, index) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            const isExpandable = item.expandable

            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
              >
                {isExpandable ? (
                  // Expandable Clients section
                  <div>
                    <button
                      onClick={() => {
                        if (!isCollapsed) {
                          setIsClientsExpanded(!isClientsExpanded)
                        } else {
                          router.push(item.href)
                        }
                      }}
                      className={cn(
                        'relative w-full flex items-center gap-3 py-3 rounded-lg transition-all duration-300 group',
                        isCollapsed ? 'justify-center px-0' : 'px-3',
                        isActive
                          ? 'text-white'
                          : 'text-charcoal-500 hover:text-charcoal-200'
                      )}
                    >
                      {/* Active background - frosted glass */}
                      {isActive && (
                        <motion.div
                          layoutId="activeNavBg"
                          className="absolute inset-0 rounded-lg bg-white/[0.04] backdrop-blur-sm border border-white/[0.06]"
                          transition={{ type: 'spring', duration: 0.5, bounce: 0.15 }}
                        />
                      )}

                      {/* Active indicator - subtle cyan accent */}
                      {isActive && (
                        <motion.div
                          layoutId="activeNavIndicator"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white rounded-r-full"
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
                        <item.icon
                          className={cn(
                            'w-[18px] h-[18px] transition-colors duration-300',
                            isActive
                              ? 'text-white'
                              : 'text-charcoal-500 group-hover:text-charcoal-300'
                          )}
                        />
                      </div>

                      <AnimatePresence mode="wait">
                        {!isCollapsed && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="relative text-sm tracking-wide flex-1 text-left"
                          >
                            {item.name}
                          </motion.span>
                        )}
                      </AnimatePresence>

                      {/* Expand/Collapse indicator */}
                      {!isCollapsed && (
                        <motion.div
                          animate={{ rotate: isClientsExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="relative"
                        >
                          <ChevronDown className="w-4 h-4 text-charcoal-500" />
                        </motion.div>
                      )}
                    </button>

                    {/* Expanded client list */}
                    <AnimatePresence>
                      {isClientsExpanded && !isCollapsed && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="pl-6 pt-2 pb-1 space-y-1">
                            {/* "All Clients" link */}
                            <Link
                              href="/clients"
                              className={cn(
                                'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200',
                                pathname === '/clients'
                                  ? 'text-white bg-white/[0.04]'
                                  : 'text-charcoal-500 hover:text-charcoal-300 hover:bg-white/[0.02]'
                              )}
                            >
                              <Users className="w-4 h-4" />
                              <span>All Clients</span>
                            </Link>

                            {/* Divider */}
                            {activeClients.length > 0 && (
                              <div className="h-px bg-white/[0.04] mx-3 my-2" />
                            )}

                            {/* Client list with sub-navigation */}
                            {clientsLoading ? (
                              <div className="px-3 py-2 text-xs text-charcoal-600">
                                Loading clients...
                              </div>
                            ) : activeClients.length > 0 ? (
                              <div className="space-y-1 max-h-64 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-charcoal-700 scrollbar-track-transparent">
                                {activeClients.map((client) => (
                                  <ClientSubNav
                                    key={client.id}
                                    client={client}
                                    isCollapsed={isCollapsed}
                                  />
                                ))}
                              </div>
                            ) : (
                              <div className="px-3 py-2 text-xs text-charcoal-600">
                                No active clients
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  // Regular navigation item
                  <Link
                    href={item.href}
                    className={cn(
                      'relative flex items-center gap-3 py-3 rounded-lg transition-all duration-300 group',
                      isCollapsed ? 'justify-center px-0' : 'px-3',
                      isActive
                        ? 'text-white'
                        : 'text-charcoal-500 hover:text-charcoal-200'
                    )}
                  >
                    {/* Active background - frosted glass */}
                    {isActive && (
                      <motion.div
                        layoutId="activeNavBg"
                        className="absolute inset-0 rounded-lg bg-white/[0.04] backdrop-blur-sm border border-white/[0.06]"
                        transition={{ type: 'spring', duration: 0.5, bounce: 0.15 }}
                      />
                    )}

                    {/* Active indicator - subtle cyan accent */}
                    {isActive && (
                      <motion.div
                        layoutId="activeNavIndicator"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white rounded-r-full"
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
                      <item.icon
                        className={cn(
                          'w-[18px] h-[18px] transition-colors duration-300',
                          isActive
                            ? item.highlight ? 'text-white' : 'text-white'
                            : 'text-charcoal-500 group-hover:text-charcoal-300'
                        )}
                      />
                      {item.highlight && isActive && (
                        <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-white rounded-full" />
                      )}
                    </div>

                    <AnimatePresence mode="wait">
                      {!isCollapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="relative text-sm tracking-wide"
                        >
                          {item.name}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {/* AI Badge */}
                    {item.highlight && !isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          "ml-auto px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.15em] rounded",
                          isActive
                            ? "text-white bg-white/10 border border-white/20"
                            : "text-charcoal-500 bg-white/[0.03] border border-white/[0.06]"
                        )}
                      >
                        AI
                      </motion.span>
                    )}
                  </Link>
                )}
              </motion.div>
            )
          })}
        </nav>

        {/* Credits indicator - frosted glass card */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mx-3 mb-4 p-4 rounded-lg bg-white/[0.02] backdrop-blur-sm border border-white/[0.06]"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-md bg-white/10 border border-white/20">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] text-charcoal-500 uppercase tracking-[0.15em]">Credits</p>
                  <p className="text-sm font-medium text-white">1,250</p>
                </div>
              </div>
              <div className="h-1 bg-charcoal-800/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '62%' }}
                  transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full bg-gradient-to-r from-white to-neutral-300 rounded-full"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Divider */}
        <div className="mx-5 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        {/* Bottom Navigation */}
        <div className="py-4 px-3 space-y-1">
          {bottomNavigation.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'relative flex items-center gap-3 py-3 rounded-lg transition-all duration-300',
                  isCollapsed ? 'justify-center px-0' : 'px-3',
                  isActive
                    ? 'bg-white/[0.04] text-white'
                    : 'text-charcoal-500 hover:bg-white/[0.02] hover:text-charcoal-300'
                )}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-md">
                  <item.icon className="w-[18px] h-[18px]" />
                </div>
                <AnimatePresence mode="wait">
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm tracking-wide"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            )
          })}

          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className={cn(
              "w-full flex items-center gap-3 py-3 rounded-lg transition-all duration-300",
              isCollapsed ? "justify-center px-0" : "px-3",
              isSigningOut
                ? "text-charcoal-600 cursor-not-allowed"
                : "text-charcoal-500 hover:bg-red-500/5 hover:text-red-400"
            )}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-md">
              {isSigningOut ? (
                <Loader2 className="w-[18px] h-[18px] animate-spin" />
              ) : (
                <LogOut className="w-[18px] h-[18px]" />
              )}
            </div>
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm tracking-wide"
                >
                  {isSigningOut ? 'Signing out...' : 'Sign Out'}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
    </motion.aside>
  )
}
