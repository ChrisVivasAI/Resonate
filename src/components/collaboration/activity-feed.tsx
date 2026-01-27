'use client'

import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import {
  Package,
  Send,
  CheckCircle2,
  XCircle,
  MessageSquare,
  CheckSquare,
  Flag,
  Activity,
  Loader2,
} from 'lucide-react'
import { Avatar } from '@/components/ui'
import type { ActivityFeedItem, ActivityType } from '@/types'
import { cn } from '@/lib/utils'

interface ActivityFeedProps {
  activities: ActivityFeedItem[]
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  emptyMessage?: string
}

const activityConfig: Record<
  ActivityType,
  {
    icon: React.ComponentType<{ className?: string }>
    color: string
    label: (metadata: Record<string, unknown>) => string
  }
> = {
  deliverable_created: {
    icon: Package,
    color: 'text-blue-400 bg-blue-500/10',
    label: (m) => `created "${m.title || 'a deliverable'}"`,
  },
  deliverable_updated: {
    icon: Package,
    color: 'text-violet-400 bg-violet-500/10',
    label: (m) => m.status === 'final' ? `marked "${m.title}" as final` : `updated "${m.title || 'a deliverable'}"${m.version ? ` to v${m.version}` : ''}`,
  },
  deliverable_submitted: {
    icon: Send,
    color: 'text-amber-400 bg-amber-500/10',
    label: (m) => `submitted "${m.title || 'a deliverable'}" for review`,
  },
  deliverable_approved: {
    icon: CheckCircle2,
    color: 'text-[#23FD9E] bg-[#23FD9E]/10',
    label: (m) => `approved "${m.title || 'a deliverable'}"`,
  },
  deliverable_rejected: {
    icon: XCircle,
    color: 'text-red-400 bg-red-500/10',
    label: (m) => m.action === 'requested_changes' ? `requested changes on "${m.title || 'a deliverable'}"` : `rejected "${m.title || 'a deliverable'}"`,
  },
  comment_added: {
    icon: MessageSquare,
    color: 'text-cyan-400 bg-cyan-500/10',
    label: (m) => `commented on "${m.deliverable_title || 'a deliverable'}"`,
  },
  task_completed: {
    icon: CheckSquare,
    color: 'text-emerald-400 bg-emerald-500/10',
    label: (m) => `completed task "${m.title || 'a task'}"`,
  },
  milestone_completed: {
    icon: Flag,
    color: 'text-purple-400 bg-purple-500/10',
    label: (m) => `reached milestone "${m.title || 'a milestone'}"`,
  },
  project_status_changed: {
    icon: Activity,
    color: 'text-orange-400 bg-orange-500/10',
    label: (m) => `changed project status to "${m.new_status || 'unknown'}"`,
  },
  health_check_completed: {
    icon: Activity,
    color: 'text-pink-400 bg-pink-500/10',
    label: (m) => `completed health check (score: ${m.score || 'N/A'})`,
  },
}

export function ActivityFeed({
  activities,
  loading = false,
  hasMore = false,
  onLoadMore,
  emptyMessage = 'No activity yet',
}: ActivityFeedProps) {
  if (!loading && activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="w-8 h-8 text-white/20 mx-auto mb-2" />
        <p className="text-white/40 text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {activities.map((activity, index) => {
        const config = activityConfig[activity.activity_type] || {
          icon: Activity,
          color: 'text-white/40 bg-white/5',
          label: () => activity.activity_type.replace(/_/g, ' '),
        }
        const Icon = config.icon

        return (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/[0.02] transition-colors group"
          >
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', config.color)}>
              <Icon className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/80">
                <span className="font-medium text-white">
                  {activity.user?.full_name || 'System'}
                </span>{' '}
                {config.label(activity.metadata)}
              </p>
              <p className="text-xs text-white/40 mt-0.5">
                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
              </p>
            </div>

            {activity.user && (
              <Avatar
                name={activity.user.full_name || ''}
                src={activity.user.avatar_url}
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              />
            )}
          </motion.div>
        )
      })}

      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 text-[#23FD9E] animate-spin" />
        </div>
      )}

      {hasMore && !loading && onLoadMore && (
        <button
          onClick={onLoadMore}
          className="w-full py-3 text-sm text-[#23FD9E] hover:text-[#23FD9E]/80 transition-colors"
        >
          Load more
        </button>
      )}
    </div>
  )
}
