'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Copy,
  Check,
  Download,
  Eye,
  Code,
  Maximize2,
  Minimize2,
  RefreshCw,
  Loader2,
  Save,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui'
import type { GeneratedSection } from '@/lib/ai/page-generator'

interface GeneratedPreviewProps {
  code: string
  sections: GeneratedSection[]
  cssVariables: Record<string, string>
  onRegenerate?: () => void
  onSave?: () => void
  isRegenerating?: boolean
  isSaving?: boolean
  pageTitle?: string
  onPageTitleChange?: (title: string) => void
}

export function GeneratedPreview({
  code,
  sections,
  cssVariables,
  onRegenerate,
  onSave,
  isRegenerating = false,
  isSaving = false,
  pageTitle = '',
  onPageTitleChange,
}: GeneratedPreviewProps) {
  const [view, setView] = useState<'code' | 'sections'>('code')
  const [copiedSection, setCopiedSection] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedSection, setSelectedSection] = useState<string | null>(null)

  const handleCopyCode = async (text: string, id?: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedSection(id || 'full')
      setTimeout(() => setCopiedSection(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'generated-page.tsx'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className={cn(
        'flex flex-col bg-charcoal-900/50 rounded-xl border border-white/10 overflow-hidden',
        isFullscreen && 'fixed inset-4 z-50'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-charcoal-900/50">
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center bg-charcoal-800 rounded-lg p-1">
            <button
              onClick={() => setView('code')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                view === 'code'
                  ? 'bg-white/10 text-white'
                  : 'text-charcoal-400 hover:text-white'
              )}
            >
              <Code className="w-4 h-4" />
              Full Code
            </button>
            <button
              onClick={() => setView('sections')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                view === 'sections'
                  ? 'bg-white/10 text-white'
                  : 'text-charcoal-400 hover:text-white'
              )}
            >
              <Eye className="w-4 h-4" />
              Sections ({sections.length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRegenerate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRegenerate}
              disabled={isRegenerating}
              leftIcon={<RefreshCw className={cn('w-4 h-4', isRegenerating && 'animate-spin')} />}
            >
              Regenerate
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCopyCode(code)}
            leftIcon={copiedSection === 'full' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          >
            {copiedSection === 'full' ? 'Copied!' : 'Copy All'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Download
          </Button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-lg text-charcoal-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {view === 'code' ? (
            <motion.div
              key="code"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full overflow-auto"
            >
              <pre className="p-4 text-sm font-mono text-charcoal-200 whitespace-pre-wrap">
                {code}
              </pre>
            </motion.div>
          ) : (
            <motion.div
              key="sections"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full overflow-auto p-4"
            >
              <div className="space-y-4">
                {sections.map((section) => (
                  <div
                    key={section.id}
                    className={cn(
                      'border rounded-lg overflow-hidden transition-colors',
                      selectedSection === section.id
                        ? 'border-resonate-400/50 bg-resonate-400/5'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                    )}
                  >
                    {/* Section Header */}
                    <button
                      onClick={() =>
                        setSelectedSection(
                          selectedSection === section.id ? null : section.id
                        )
                      }
                      className="w-full flex items-center justify-between px-4 py-3 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'px-2 py-0.5 text-xs font-medium rounded',
                            section.type === 'hero'
                              ? 'bg-violet-500/20 text-violet-400'
                              : section.type === 'features'
                              ? 'bg-blue-500/20 text-blue-400'
                              : section.type === 'cta'
                              ? 'bg-amber-500/20 text-amber-400'
                              : section.type === 'contact'
                              ? 'bg-green-500/20 text-green-400'
                              : section.type === 'testimonials'
                              ? 'bg-pink-500/20 text-pink-400'
                              : 'bg-charcoal-700 text-charcoal-300'
                          )}
                        >
                          {section.type}
                        </span>
                        <span className="font-medium text-white">
                          {section.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopyCode(section.code, section.id)
                          }}
                          className="p-1.5 rounded hover:bg-white/10 transition-colors"
                        >
                          {copiedSection === section.id ? (
                            <Check className="w-4 h-4 text-resonate-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-charcoal-400" />
                          )}
                        </button>
                      </div>
                    </button>

                    {/* Section Code */}
                    <AnimatePresence>
                      {selectedSection === section.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-white/10 overflow-hidden"
                        >
                          <pre className="p-4 text-sm font-mono text-charcoal-300 whitespace-pre-wrap max-h-96 overflow-auto">
                            {section.code}
                          </pre>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CSS Variables Display */}
      <div className="px-4 py-3 border-t border-white/10 bg-charcoal-900/50">
        <div className="flex items-center gap-4 overflow-x-auto pb-1">
          <span className="text-xs text-charcoal-500 font-medium shrink-0">Colors:</span>
          {Object.entries(cssVariables)
            .filter(([key]) => key.startsWith('--color'))
            .map(([key, value]) => (
              <div key={key} className="flex items-center gap-2 shrink-0">
                <div
                  className="w-4 h-4 rounded border border-white/20"
                  style={{ backgroundColor: value }}
                />
                <span className="text-xs text-charcoal-400">{value}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Save Section */}
      {onSave && (
        <div className="px-4 py-3 border-t border-white/10 bg-charcoal-900/50">
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Enter page title..."
              value={pageTitle}
              onChange={(e) => onPageTitleChange?.(e.target.value)}
              className="flex-1 px-3 py-2 bg-charcoal-800 border border-white/10 rounded-lg text-white placeholder:text-charcoal-500 focus:outline-none focus:border-resonate-400/50"
            />
            <Button
              onClick={onSave}
              disabled={isSaving || !pageTitle.trim()}
              leftIcon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            >
              {isSaving ? 'Saving...' : 'Save Page'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
