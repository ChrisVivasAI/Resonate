'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Image as ImageIcon, Video, Loader2, Sparkles } from 'lucide-react'
import type { MediaCategory } from '@/lib/ai/gemini-media'
import type { AIGeneration } from '@/hooks/use-data'
import { getGenerationOutputUrl, getGenerationOutputUrls } from '@/hooks/use-generation'

interface CanvasPreviewProps {
  mode: MediaCategory
  generations: AIGeneration[]
  isGenerating: boolean
}

export function CanvasPreview({ mode, generations, isGenerating }: CanvasPreviewProps) {
  // Get the most recent pending or completed generation for current mode
  const recentGenerations = generations
    .filter((g) => g.type === mode)
    .slice(0, 4)

  const pendingGeneration = recentGenerations.find(
    (g) => g.status === 'pending' || g.status === 'running'
  )

  const latestCompleted = recentGenerations.filter((g) => g.status === 'completed')

  // Show loading state
  if (pendingGeneration || isGenerating) {
    return (
      <div className="relative aspect-[16/9] bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-resonate-400/[0.03] to-transparent" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative mb-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 mx-auto rounded-full border-2 border-resonate-400/20 border-t-resonate-400"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-resonate-400" />
            </div>
          </div>
          <p className="text-sm text-charcoal-400">Creating your {mode}...</p>
          {pendingGeneration && (
            <p className="text-xs text-charcoal-600 mt-1 max-w-[300px] truncate">
              {pendingGeneration.prompt}
            </p>
          )}
        </motion.div>
      </div>
    )
  }

  // Show latest results
  if (latestCompleted.length > 0) {
    const displayGenerations = latestCompleted.slice(0, 4)
    const firstGen = displayGenerations[0]
    const outputUrls = getGenerationOutputUrls(firstGen)

    // Single result or multiple from same generation
    if (outputUrls.length === 1) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative aspect-[16/9] bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden"
        >
          {mode === 'image' ? (
            <img
              src={outputUrls[0]}
              alt={firstGen.prompt}
              className="w-full h-full object-contain bg-charcoal-950"
            />
          ) : (
            <video
              src={outputUrls[0]}
              className="w-full h-full object-contain bg-charcoal-950"
              controls
              autoPlay
              loop
              muted
            />
          )}
        </motion.div>
      )
    }

    // Multiple results - show grid
    if (outputUrls.length > 1) {
      return (
        <div className="grid grid-cols-2 gap-3">
          {outputUrls.slice(0, 4).map((url, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="relative aspect-square bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden"
            >
              {mode === 'image' ? (
                <img
                  src={url}
                  alt={`${firstGen.prompt} ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  src={url}
                  className="w-full h-full object-cover"
                  controls
                  muted
                />
              )}
            </motion.div>
          ))}
        </div>
      )
    }
  }

  // Empty state
  return (
    <div className="relative aspect-[16/9] bg-white/[0.02] border border-dashed border-white/[0.08] rounded-xl overflow-hidden flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/[0.03] flex items-center justify-center">
          {mode === 'image' ? (
            <ImageIcon className="w-7 h-7 text-charcoal-600" />
          ) : (
            <Video className="w-7 h-7 text-charcoal-600" />
          )}
        </div>
        <p className="text-sm text-charcoal-500">Your generated {mode}s will appear here</p>
        <p className="text-xs text-charcoal-600 mt-1">Enter a prompt and click Generate</p>
      </div>
    </div>
  )
}
