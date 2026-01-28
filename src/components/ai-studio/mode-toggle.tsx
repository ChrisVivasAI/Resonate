'use client'

import { motion } from 'framer-motion'
import { Image, Video } from 'lucide-react'
import type { MediaCategory } from '@/lib/ai/gemini-media'

interface ModeToggleProps {
  mode: MediaCategory
  onModeChange: (mode: MediaCategory) => void
}

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-white/[0.02] rounded-lg">
      <ModeButton
        active={mode === 'image'}
        icon={Image}
        label="Image"
        onClick={() => onModeChange('image')}
      />
      <ModeButton
        active={mode === 'video'}
        icon={Video}
        label="Video"
        onClick={() => onModeChange('video')}
      />
    </div>
  )
}

interface ModeButtonProps {
  active: boolean
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
}

function ModeButton({ active, icon: Icon, label, onClick }: ModeButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 py-2 rounded-md text-sm tracking-wide transition-colors ${
        active ? 'text-white' : 'text-charcoal-500 hover:text-charcoal-300'
      }`}
    >
      {active && (
        <motion.div
          layoutId="mode-toggle-bg"
          className="absolute inset-0 bg-resonate-400/10 border border-resonate-400/20 rounded-md"
          transition={{ type: 'spring', duration: 0.3 }}
        />
      )}
      <Icon className="relative w-4 h-4" />
      <span className="relative">{label}</span>
    </motion.button>
  )
}
