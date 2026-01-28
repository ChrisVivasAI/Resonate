'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Download, ExternalLink, Trash2, Image as ImageIcon, Video, Clock, Check, X, Loader2 } from 'lucide-react'
import type { AIGeneration } from '@/hooks/use-data'
import { getGenerationOutputUrl, getGenerationOutputUrls } from '@/hooks/use-generation'
import type { MediaCategory } from '@/lib/ai/gemini-media'

interface GenerationGalleryProps {
  generations: AIGeneration[]
  mode?: MediaCategory
  onDelete?: (id: string) => void
  maxItems?: number
}

export function GenerationGallery({
  generations,
  mode,
  onDelete,
  maxItems = 12,
}: GenerationGalleryProps) {
  const filteredGenerations = mode
    ? generations.filter((g) => g.type === mode)
    : generations

  const displayGenerations = filteredGenerations.slice(0, maxItems)

  if (displayGenerations.length === 0) {
    return (
      <div className="text-center py-12 bg-white/[0.02] rounded-lg border border-white/[0.06]">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-white/[0.03] flex items-center justify-center">
          <ImageIcon className="w-5 h-5 text-charcoal-600" />
        </div>
        <p className="text-sm text-charcoal-500">No generations yet</p>
        <p className="text-xs text-charcoal-600 mt-1">Your creations will appear here</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <AnimatePresence>
        {displayGenerations.map((generation, index) => (
          <GenerationCard
            key={generation.id}
            generation={generation}
            onDelete={onDelete}
            index={index}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

interface GenerationCardProps {
  generation: AIGeneration
  onDelete?: (id: string) => void
  index: number
}

function GenerationCard({ generation, onDelete, index }: GenerationCardProps) {
  const outputUrl = getGenerationOutputUrl(generation)
  const isPending = generation.status === 'pending' || generation.status === 'running'
  const isFailed = generation.status === 'failed'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.03 }}
      className="group relative rounded-lg overflow-hidden bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-all"
    >
      {/* Preview */}
      <div className="aspect-square relative">
        {isPending ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/[0.02]">
            <div className="text-center">
              <Loader2 className="w-6 h-6 text-resonate-400 animate-spin mx-auto mb-2" />
              <p className="text-[10px] text-charcoal-500 uppercase tracking-wide">
                {generation.status === 'running' ? 'Creating...' : 'In Queue'}
              </p>
            </div>
          </div>
        ) : isFailed ? (
          <div className="absolute inset-0 flex items-center justify-center bg-red-500/5">
            <div className="text-center">
              <X className="w-6 h-6 text-red-400 mx-auto mb-2" />
              <p className="text-[10px] text-red-400 uppercase tracking-wide">Failed</p>
            </div>
          </div>
        ) : outputUrl ? (
          generation.type === 'video' ? (
            <video
              src={outputUrl}
              className="w-full h-full object-cover"
              muted
              loop
              onMouseEnter={(e) => e.currentTarget.play()}
              onMouseLeave={(e) => {
                e.currentTarget.pause()
                e.currentTarget.currentTime = 0
              }}
            />
          ) : (
            <img
              src={outputUrl}
              alt={generation.prompt}
              className="w-full h-full object-cover"
            />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-charcoal-600" />
          </div>
        )}

        {/* Hover overlay */}
        {outputUrl && !isPending && !isFailed && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
            <div className="flex items-center gap-2">
              <a
                href={outputUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-white" />
              </a>
              <a
                href={outputUrl}
                download
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4 text-white" />
              </a>
              {onDelete && (
                <button
                  onClick={() => onDelete(generation.id)}
                  className="p-2 bg-white/10 hover:bg-red-500/50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Type badge */}
        <div className="absolute top-2 left-2">
          <div className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-wide ${
            generation.type === 'video'
              ? 'bg-purple-500/20 text-purple-300'
              : 'bg-blue-500/20 text-blue-300'
          }`}>
            {generation.type === 'video' ? (
              <Video className="w-3 h-3 inline-block mr-1" />
            ) : (
              <ImageIcon className="w-3 h-3 inline-block mr-1" />
            )}
            {generation.type}
          </div>
        </div>

        {/* Status indicator */}
        <div className="absolute top-2 right-2">
          {generation.status === 'completed' && (
            <div className="w-5 h-5 rounded-full bg-resonate-400/20 flex items-center justify-center">
              <Check className="w-3 h-3 text-resonate-400" />
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-xs text-charcoal-400 line-clamp-2 leading-relaxed">
          {generation.prompt}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <Clock className="w-3 h-3 text-charcoal-600" />
          <span className="text-[10px] text-charcoal-600">
            {new Date(generation.created_at).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </motion.div>
  )
}
