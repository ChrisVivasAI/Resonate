'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const navigation = [
  { name: 'Dashboard', href: '/portal', icon: LayoutDashboard },
  { name: 'Projects', href: '/portal/projects', icon: FolderKanban },
  { name: 'Approvals', href: '/portal/approvals', icon: CheckSquare, badge: true },
]

const bottomNavigation = [
  { name: 'Notifications', href: '/portal/notifications', icon: Bell },
  { name: 'Settings', href: '/portal/settings', icon: Settings },
]

export function ClientSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 280 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed left-0 top-0 h-screen z-40 flex flex-col"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-[#1a1a1a]/95 backdrop-blur-2xl" />

      {/* Subtle border */}
      <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />

      {/* Content */}
      <div className="relative flex flex-col h-full">
        {/* Logo */}
        <div className="h-20 flex items-center justify-between px-5">
          <Link href="/portal" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="relative w-10 h-10 rounded-lg bg-[#2B2B2B] flex items-center justify-center border border-white/[0.08]"
            >
              <span className="text-white font-display text-xl tracking-tight">R</span>
              <div className="absolute inset-0 rounded-lg bg-[#23FD9E]/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </motion.div>
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col"
                >
                  <span className="font-display text-lg text-white tracking-wide">RESONATE</span>
                  <span className="text-[10px] text-white/40 uppercase tracking-[0.2em]">Client Portal</span>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.04] transition-all duration-300"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </motion.button>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {navigation.map((item, index) => {
            const isActive =
              item.href === '/portal'
                ? pathname === '/portal'
                : pathname.startsWith(item.href)
            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  href={item.href}
                  className={cn(
                    'relative flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-300 group',
                    isActive
                      ? 'text-white'
                      : 'text-white/40 hover:text-white/70'
                  )}
                >
                  {/* Active background - frosted glass */}
                  {isActive && (
                    <motion.div
                      layoutId="activeClientNavBg"
                      className="absolute inset-0 rounded-lg bg-white/[0.04] backdrop-blur-sm border border-white/[0.06]"
                      transition={{ type: 'spring', duration: 0.5, bounce: 0.15 }}
                    />
                  )}

                  {/* Active indicator - cyan accent */}
                  {isActive && (
                    <motion.div
                      layoutId="activeClientNavIndicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#23FD9E] rounded-r-full"
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
                          ? 'text-[#23FD9E]'
                          : 'text-white/40 group-hover:text-white/60'
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
                        className="relative text-sm tracking-wide"
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {/* Badge for approvals */}
                  {item.badge && !isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="ml-auto px-2 py-0.5 text-[9px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded"
                    >
                      NEW
                    </motion.span>
                  )}
                </Link>
              </motion.div>
            )
          })}
        </nav>

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
                  'relative flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-300',
                  isActive
                    ? 'bg-white/[0.04] text-white'
                    : 'text-white/40 hover:bg-white/[0.02] hover:text-white/60'
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
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white/40 hover:bg-red-500/5 hover:text-red-400 transition-all duration-300"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-md">
              <LogOut className="w-[18px] h-[18px]" />
            </div>
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm tracking-wide"
                >
                  Sign Out
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
    </motion.aside>
  )
}
