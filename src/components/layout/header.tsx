'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Command, X, FileText, FolderKanban, Users, Sparkles } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { NotificationBell } from '@/components/notifications'
import { HelpButton } from '@/components/help'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks'

interface HeaderProps {
  title?: string
  description?: string
  actions?: React.ReactNode
}

const quickActions = [
  { name: 'Projects', icon: FolderKanban, href: '/projects', shortcut: 'P' },
  { name: 'Clients', icon: Users, href: '/clients', shortcut: 'C' },
  { name: 'AI Studio', icon: Sparkles, href: '/ai-studio', shortcut: 'A' },
  { name: 'Pages', icon: FileText, href: '/pages', shortcut: 'G' },
]

export function Header({ title, description, actions }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { profile } = useAuth()

  // Get display name and role from profile
  const displayName = profile?.full_name || profile?.email?.split('@')[0] || 'User'
  const displayRole = profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 'User'

  // Handle keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <header className="sticky top-0 z-30 h-20 border-b border-obsidian-800/50">
        {/* Glass background */}
        <div className="absolute inset-0 bg-obsidian-950/80 backdrop-blur-xl" />

        <div className="relative h-full px-8 flex items-center justify-between">
          {/* Left side - Title */}
          <div className="flex items-center gap-6">
            {title && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h1 className="text-2xl font-display text-white tracking-tight">{title}</h1>
                {description && (
                  <p className="text-sm text-obsidian-400 mt-0.5">{description}</p>
                )}
              </motion.div>
            )}
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-3 px-4 py-2.5 bg-obsidian-900/50 border border-obsidian-700/50 rounded-xl text-obsidian-400 hover:border-obsidian-600/50 hover:text-obsidian-300 transition-all duration-300"
            >
              <Search className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Search...</span>
              <kbd className="hidden md:flex items-center gap-1 px-2 py-0.5 bg-obsidian-800/80 rounded-md text-xs text-obsidian-500 border border-obsidian-700/50">
                <Command className="w-3 h-3" />K
              </kbd>
            </motion.button>

            {/* Quick Actions */}
            {actions}

            {/* Help */}
            <HelpButton />

            {/* Notifications */}
            <NotificationBell />

            {/* Divider */}
            <div className="w-px h-8 bg-obsidian-800" />

            {/* User Menu */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="flex items-center gap-3 pl-3 cursor-pointer group"
            >
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-white group-hover:text-ember-400 transition-colors">{displayName}</p>
                <p className="text-xs text-obsidian-500">{displayRole}</p>
              </div>
              <div className="relative">
                <Avatar name={displayName} size="md" />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-obsidian-950" />
              </div>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Search Modal */}
      <AnimatePresence>
        {searchOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-obsidian-950/80 backdrop-blur-sm z-50"
              onClick={() => setSearchOpen(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-24 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="glass-solid rounded-2xl overflow-hidden shadow-elevated">
                {/* Search Input */}
                <div className="flex items-center gap-4 px-6 py-4 border-b border-obsidian-800/50">
                  <Search className="w-5 h-5 text-obsidian-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search projects, clients, pages..."
                    className="flex-1 bg-transparent text-white placeholder:text-obsidian-500 outline-none text-lg"
                    autoFocus
                  />
                  <button
                    onClick={() => setSearchOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-obsidian-800/50 text-obsidian-400 hover:text-obsidian-200 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Quick Actions */}
                <div className="p-4">
                  <p className="text-xs font-medium text-obsidian-500 uppercase tracking-wider mb-3 px-2">Quick Actions</p>
                  <div className="space-y-1">
                    {quickActions.map((action, index) => (
                      <motion.a
                        key={action.name}
                        href={action.href}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-obsidian-800/50 transition-colors group"
                      >
                        <div className="p-2 rounded-lg bg-obsidian-800/50 group-hover:bg-ember-500/10 transition-colors">
                          <action.icon className="w-4 h-4 text-obsidian-400 group-hover:text-ember-400 transition-colors" />
                        </div>
                        <span className="text-obsidian-200 group-hover:text-white transition-colors">{action.name}</span>
                        <kbd className="ml-auto px-2 py-1 rounded-md bg-obsidian-800/50 text-xs text-obsidian-500 border border-obsidian-700/50">
                          {action.shortcut}
                        </kbd>
                      </motion.a>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-obsidian-800/50 flex items-center justify-between text-xs text-obsidian-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-obsidian-800/50 border border-obsidian-700/50">↵</kbd>
                      to select
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-obsidian-800/50 border border-obsidian-700/50">↑↓</kbd>
                      to navigate
                    </span>
                  </div>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-obsidian-800/50 border border-obsidian-700/50">esc</kbd>
                    to close
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
