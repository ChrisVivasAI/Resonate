'use client'

import { motion } from 'framer-motion'
import { Type, Image, Pencil, Film, Play, FastForward } from 'lucide-react'
import type { MediaCategory, SubMode } from '@/lib/ai/gemini-media'
import { getSubModesForCategory, getSubModeDisplayName } from '@/lib/ai/gemini-media'

interface SubModeTabsProps {
  mode: MediaCategory
  subMode: SubMode
  onSubModeChange: (subMode: SubMode) => void
}

const subModeIcons: Record<SubMode, React.ComponentType<{ className?: string }>> = {
  'text-to-image': Type,
  'image-to-image': Image,
  'edit': Pencil,
  'text-to-video': Film,
  'image-to-video': Play,
  'extend': FastForward,
}

export function SubModeTabs({ mode, subMode, onSubModeChange }: SubModeTabsProps) {
  const availableSubModes = getSubModesForCategory(mode)

  return (
    <div className="flex items-center gap-1">
      {availableSubModes.map((sm) => {
        const Icon = subModeIcons[sm]
        const isActive = sm === subMode

        return (
          <motion.button
            key={sm}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSubModeChange(sm)}
            className={`relative flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors ${
              isActive
                ? 'text-white'
                : 'text-charcoal-500 hover:text-charcoal-300'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="sub-mode-bg"
                className="absolute inset-0 bg-white/[0.06] rounded-md"
                transition={{ type: 'spring', duration: 0.3 }}
              />
            )}
            <Icon className="relative w-3.5 h-3.5" />
            <span className="relative">{getSubModeDisplayName(sm)}</span>
          </motion.button>
        )
      })}
    </div>
  )
}
