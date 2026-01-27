'use client'

import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { Image as ImageIcon, Video, Music, FileText, Code, MoreVertical, History, MessageSquare, ExternalLink, Folder } from 'lucide-react'
import { StatusBadge } from './status-badge'
import type { Deliverable } from '@/types'
import { cn } from '@/lib/utils'

// Platform icons/labels
const platformLabels = {
  frame_io: 'Frame.io',
  vimeo: 'Vimeo',
  youtube: 'YouTube',
  dropbox: 'Dropbox',
  google_drive: 'Drive',
  wetransfer: 'WeTransfer',
  s3: 'S3',
  other: 'Link',
}

interface DeliverableCardProps {
  deliverable: Deliverable
  onClick?: () => void
  onMenuClick?: (e: React.MouseEvent) => void
  index?: number
}

const typeIcons = {
  image: ImageIcon,
  video: Video,
  audio: Music,
  document: FileText,
  text: Code,
}

const typeColors = {
  image: 'text-pink-400 bg-pink-500/10',
  video: 'text-blue-400 bg-blue-500/10',
  audio: 'text-orange-400 bg-orange-500/10',
  document: 'text-emerald-400 bg-emerald-500/10',
  text: 'text-violet-400 bg-violet-500/10',
}

export function DeliverableCard({ deliverable, onClick, onMenuClick, index = 0 }: DeliverableCardProps) {
  const Icon = typeIcons[deliverable.type] || FileText
  const colorClass = typeColors[deliverable.type] || 'text-white/60 bg-white/5'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={onClick}
      className={cn(
        'group relative bg-[#2B2B2B]/60 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden transition-all cursor-pointer',
        'hover:border-white/20 hover:bg-[#2B2B2B]/80'
      )}
    >
      {/* Thumbnail / Preview */}
      <div className="aspect-video relative bg-[#1a1a1a] overflow-hidden">
        {deliverable.thumbnail_url || deliverable.file_url ? (
          <img
            src={deliverable.thumbnail_url || deliverable.file_url}
            alt={deliverable.title}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className={cn('w-16 h-16 rounded-xl flex items-center justify-center', colorClass)}>
              <Icon className="w-8 h-8" />
            </div>
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent opacity-60" />

        {/* Type badge */}
        <div className={cn('absolute top-3 left-3 px-2 py-1 rounded-md text-xs font-medium uppercase tracking-wider', colorClass)}>
          {deliverable.type}
        </div>

        {/* Menu button */}
        {onMenuClick && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMenuClick(e)
            }}
            className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
          >
            <MoreVertical className="w-4 h-4 text-white" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-medium text-white line-clamp-1">{deliverable.title}</h3>
          <StatusBadge status={deliverable.status} size="sm" showIcon={false} />
        </div>

        {deliverable.description && (
          <p className="text-sm text-white/50 line-clamp-2 mb-3">
            {deliverable.description}
          </p>
        )}

        {/* Link badges */}
        {(deliverable.draft_url || deliverable.final_url) && (
          <div className="flex items-center gap-2 mb-3">
            {deliverable.draft_url && (
              <a
                href={deliverable.draft_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                {platformLabels[deliverable.draft_platform || 'other']}
              </a>
            )}
            {deliverable.final_url && (
              <a
                href={deliverable.final_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-[#23FD9E]/10 text-[#23FD9E] hover:bg-[#23FD9E]/20 transition-colors"
              >
                <Folder className="w-3 h-3" />
                {platformLabels[deliverable.final_platform || 'other']}
              </a>
            )}
          </div>
        )}

        {/* Meta info */}
        <div className="flex items-center justify-between text-xs text-white/40">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <History className="w-3.5 h-3.5" />
              v{deliverable.current_version}
            </span>
            {deliverable.comments && deliverable.comments.length > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" />
                {deliverable.comments.length}
              </span>
            )}
          </div>
          <span>
            {formatDistanceToNow(new Date(deliverable.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    </motion.div>
  )
}
