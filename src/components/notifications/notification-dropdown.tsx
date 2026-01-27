'use client'

import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import {
  Bell,
  Check,
  CheckCheck,
  X,
  Activity,
  AlertTriangle,
  Package,
  MessageSquare,
  Flag,
  Settings,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Notification } from '@/hooks/use-notifications'
import Link from 'next/link'

interface NotificationDropdownProps {
  notifications: Notification[]
  onMarkAsRead: (ids: string[]) => Promise<void>
  onMarkAllAsRead: () => Promise<void>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
}

const notificationIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  health_alert: Activity,
  project_update: Flag,
  deliverable_ready: Package,
  comment: MessageSquare,
  approval_needed: AlertTriangle,
  settings: Settings,
  default: Bell,
}

const notificationColors: Record<string, string> = {
  health_alert: 'bg-amber-500/10 text-amber-400',
  project_update: 'bg-violet-500/10 text-violet-400',
  deliverable_ready: 'bg-[#23FD9E]/10 text-[#23FD9E]',
  comment: 'bg-blue-500/10 text-blue-400',
  approval_needed: 'bg-red-500/10 text-red-400',
  settings: 'bg-white/10 text-white/60',
  default: 'bg-white/10 text-white/60',
}

export function NotificationDropdown({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClose,
}: NotificationDropdownProps) {
  const unreadNotifications = notifications.filter((n) => !n.is_read)

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await onMarkAsRead([notification.id])
    }
    if (notification.link) {
      onClose()
    }
  }

  return (
    <div className="w-[380px] bg-[#2B2B2B] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <h3 className="font-semibold text-white">Notifications</h3>
        {unreadNotifications.length > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="text-xs text-[#23FD9E] hover:text-[#1ed189] transition-colors flex items-center gap-1"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-h-[400px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <Bell className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No notifications yet</p>
            <p className="text-white/30 text-xs mt-1">
              We'll notify you when something important happens
            </p>
          </div>
        ) : (
          <div>
            {notifications.map((notification, index) => {
              const Icon = notificationIcons[notification.type] || notificationIcons.default
              const colorClass = notificationColors[notification.type] || notificationColors.default

              const content = (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'relative px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer group',
                    !notification.is_read && 'bg-white/[0.02]'
                  )}
                >
                  {/* Unread indicator */}
                  {!notification.is_read && (
                    <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#23FD9E]" />
                  )}

                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', colorClass)}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          'text-sm font-medium line-clamp-1',
                          notification.is_read ? 'text-white/60' : 'text-white'
                        )}>
                          {notification.title}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onDelete(notification.id)
                          }}
                          className="p-1 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3.5 h-3.5 text-white/40" />
                        </button>
                      </div>

                      {notification.message && (
                        <p className="text-xs text-white/40 line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-white/30">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                        {notification.link && (
                          <ExternalLink className="w-3 h-3 text-white/30" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick actions */}
                  {!notification.is_read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onMarkAsRead([notification.id])
                      }}
                      className="absolute right-2 top-2 p-1 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5 text-white/40" />
                    </button>
                  )}
                </motion.div>
              )

              if (notification.link) {
                return (
                  <Link key={notification.id} href={notification.link}>
                    {content}
                  </Link>
                )
              }

              return <div key={notification.id}>{content}</div>
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2.5 border-t border-white/[0.06]">
          <Link
            href="/notifications"
            onClick={onClose}
            className="text-xs text-white/40 hover:text-white transition-colors flex items-center justify-center gap-1"
          >
            View all notifications
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  )
}
