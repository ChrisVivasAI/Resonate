'use client'

import { motion } from 'framer-motion'
import { Sparkles, Loader2 } from 'lucide-react'
import type { MediaCategory, SubMode } from '@/lib/ai/gemini-media'

interface PromptInputProps {
  prompt: string
  onPromptChange: (prompt: string) => void
  onGenerate: () => void
  isGenerating: boolean
  disabled?: boolean
  mode: MediaCategory
  subMode: SubMode
}

export function PromptInput({
  prompt,
  onPromptChange,
  onGenerate,
  isGenerating,
  disabled = false,
  mode,
  subMode,
}: PromptInputProps) {
  const getPlaceholder = () => {
    if (mode === 'image') {
      switch (subMode) {
        case 'text-to-image':
          return 'Describe the image you want to create...'
        case 'image-to-image':
          return 'Describe how to transform your image...'
        case 'edit':
          return 'Describe what to add or change in the masked area...'
        default:
          return 'Enter your prompt...'
      }
    }
    switch (subMode) {
      case 'text-to-video':
        return 'Describe the video you want to create...'
      case 'image-to-video':
        return 'Describe how to animate your image...'
      default:
        return 'Enter your prompt...'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (prompt.trim() && !isGenerating && !disabled) {
        onGenerate()
      }
    }
  }

  return (
    <div className="relative">
      <div className="flex items-end gap-3 bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-xl p-3 focus-within:border-resonate-400/30 transition-colors">
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
          rows={2}
          className="flex-1 bg-transparent text-white placeholder:text-charcoal-600 text-sm resize-none focus:outline-none min-h-[52px]"
        />
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onGenerate}
          disabled={!prompt.trim() || isGenerating || disabled}
          className="flex items-center gap-2 px-5 py-2.5 bg-resonate-400 hover:bg-resonate-500 rounded-lg text-charcoal-900 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-resonate-400"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {isGenerating ? 'Creating...' : 'Generate'}
        </motion.button>
      </div>
      <p className="mt-2 text-[10px] text-charcoal-600 text-center">
        Press Enter to generate, Shift+Enter for new line
      </p>
    </div>
  )
}
