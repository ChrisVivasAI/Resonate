'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'
import type { MediaCategory } from '@/lib/ai/gemini-media'
import type { ImageSettings, VideoSettings } from '@/lib/ai/presets'
import {
  IMAGE_RESOLUTIONS,
  IMAGE_ASPECT_RATIOS,
  IMAGE_COUNTS,
  VIDEO_RESOLUTIONS,
  VIDEO_ASPECT_RATIOS,
  VIDEO_COUNTS,
  VIDEO_DURATIONS,
} from '@/lib/ai/presets'

interface SettingsBarProps {
  mode: MediaCategory
  imageSettings: ImageSettings
  videoSettings: VideoSettings
  onImageSettingsChange: (settings: Partial<ImageSettings>) => void
  onVideoSettingsChange: (settings: Partial<VideoSettings>) => void
}

export function SettingsBar({
  mode,
  imageSettings,
  videoSettings,
  onImageSettingsChange,
  onVideoSettingsChange,
}: SettingsBarProps) {
  if (mode === 'image') {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <SettingsPill
          label="Resolution"
          value={imageSettings.resolution}
          options={IMAGE_RESOLUTIONS.map((r) => ({ value: r.value, label: r.label }))}
          onChange={(value) => onImageSettingsChange({ resolution: value as ImageSettings['resolution'] })}
        />
        <SettingsPill
          label="Aspect"
          value={imageSettings.aspectRatio}
          options={IMAGE_ASPECT_RATIOS.map((r) => ({ value: r.value, label: r.label }))}
          onChange={(value) => onImageSettingsChange({ aspectRatio: value as ImageSettings['aspectRatio'] })}
        />
        <SettingsPill
          label="Count"
          value={String(imageSettings.count)}
          options={IMAGE_COUNTS.map((r) => ({ value: String(r.value), label: r.label }))}
          onChange={(value) => onImageSettingsChange({ count: Number(value) as ImageSettings['count'] })}
        />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <SettingsPill
        label="Resolution"
        value={videoSettings.resolution}
        options={VIDEO_RESOLUTIONS.map((r) => ({ value: r.value, label: r.label }))}
        onChange={(value) => onVideoSettingsChange({ resolution: value as VideoSettings['resolution'] })}
      />
      <SettingsPill
        label="Aspect"
        value={videoSettings.aspectRatio}
        options={VIDEO_ASPECT_RATIOS.map((r) => ({ value: r.value, label: r.label }))}
        onChange={(value) => onVideoSettingsChange({ aspectRatio: value as VideoSettings['aspectRatio'] })}
      />
      <SettingsPill
        label="Duration"
        value={String(videoSettings.duration)}
        options={VIDEO_DURATIONS.map((r) => ({ value: String(r.value), label: r.label }))}
        onChange={(value) => onVideoSettingsChange({ duration: Number(value) as VideoSettings['duration'] })}
      />
      <SettingsPill
        label="Count"
        value={String(videoSettings.count)}
        options={VIDEO_COUNTS.map((r) => ({ value: String(r.value), label: r.label }))}
        onChange={(value) => onVideoSettingsChange({ count: Number(value) as VideoSettings['count'] })}
      />
    </div>
  )
}

interface SettingsPillProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

function SettingsPill({ label, value, options, onChange }: SettingsPillProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find((o) => o.value === value)

  return (
    <div className="relative" ref={ref}>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all duration-200 ${
          isOpen
            ? 'bg-resonate-400/10 border border-resonate-400/30 text-resonate-400'
            : 'bg-white/[0.03] border border-white/[0.06] text-charcoal-400 hover:text-white hover:border-white/[0.1]'
        }`}
      >
        <span className="text-charcoal-600">{label}:</span>
        <span className="font-medium">{selectedOption?.label || value}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 min-w-[160px] py-1 bg-charcoal-900 border border-white/[0.08] rounded-lg shadow-xl z-50"
          >
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors ${
                  value === option.value
                    ? 'text-resonate-400 bg-resonate-400/5'
                    : 'text-charcoal-400 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <span>{option.label}</span>
                {value === option.value && <Check className="w-3 h-3" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
