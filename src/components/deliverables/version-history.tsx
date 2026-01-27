'use client'

import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { History, Download, Eye, User } from 'lucide-react'
import type { DeliverableVersion } from '@/types'
import { cn } from '@/lib/utils'

interface VersionHistoryProps {
  versions: DeliverableVersion[]
  currentVersion: number
  onViewVersion?: (version: DeliverableVersion) => void
  onDownloadVersion?: (version: DeliverableVersion) => void
}

export function VersionHistory({
  versions,
  currentVersion,
  onViewVersion,
  onDownloadVersion,
}: VersionHistoryProps) {
  if (versions.length === 0) {
    return (
      <div className="bg-[#2B2B2B]/40 border border-white/10 rounded-xl p-6 text-center">
        <History className="w-8 h-8 text-white/20 mx-auto mb-2" />
        <p className="text-sm text-white/40">No version history available</p>
      </div>
    )
  }

  return (
    <div className="bg-[#2B2B2B]/40 border border-white/10 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
        <History className="w-4 h-4 text-white/40" />
        <span className="text-sm font-medium text-white">Version History</span>
        <span className="text-xs text-white/40">({versions.length} versions)</span>
      </div>

      <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
        {versions.map((version, index) => {
          const isCurrent = version.version_number === currentVersion

          return (
            <motion.div
              key={version.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'p-4 transition-colors hover:bg-white/5',
                isCurrent && 'bg-[#23FD9E]/5'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-xs font-medium',
                        isCurrent
                          ? 'bg-[#23FD9E]/20 text-[#23FD9E]'
                          : 'bg-white/10 text-white/60'
                      )}
                    >
                      v{version.version_number}
                    </span>
                    {isCurrent && (
                      <span className="text-xs text-[#23FD9E]">Current</span>
                    )}
                  </div>

                  {version.notes && (
                    <p className="text-sm text-white/70 mb-2">{version.notes}</p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-white/40">
                    {version.creator && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {version.creator.full_name}
                      </span>
                    )}
                    <span>
                      {formatDistanceToNow(new Date(version.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {onViewVersion && (
                    <button
                      onClick={() => onViewVersion(version)}
                      className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                      title="View this version"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  {onDownloadVersion && (
                    <button
                      onClick={() => onDownloadVersion(version)}
                      className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                      title="Download this version"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
