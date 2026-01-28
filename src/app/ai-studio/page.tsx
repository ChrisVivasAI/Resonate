'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  History,
  TrendingUp,
  Loader2,
  Check,
  X,
  Clock,
  Image as ImageIcon,
  Video,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout'
import { useGeneration, getGenerationOutputUrl } from '@/hooks/use-generation'
import { useAuth } from '@/hooks/use-auth'
import {
  ModeToggle,
  SettingsBar,
  PromptInput,
  CanvasPreview,
  SubModeTabs,
  ImageUploadZone,
  GenerationGallery,
} from '@/components/ai-studio'
import type { MediaCategory, SubMode } from '@/lib/ai/gemini-media'
import { getEndpoint } from '@/lib/ai/gemini-media'

export default function AIStudioPage() {
  const { user, loading: authLoading } = useAuth()
  const {
    mediaType,
    subMode,
    endpoint,
    generateData,
    imageSettings,
    videoSettings,
    generations,
    isGenerating,
    generationsLoading,
    setMediaType,
    setSubMode,
    setGenerateData,
    setImageSettings,
    setVideoSettings,
    generate,
    getCompletedGenerations,
    getPendingGenerations,
    removeGeneration,
  } = useGeneration()

  const [error, setError] = useState('')

  const handleGenerate = async () => {
    if (!generateData.prompt.trim()) return
    setError('')

    try {
      await generate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
      console.error('Generation error:', err)
    }
  }

  const currentEndpoint = getEndpoint(mediaType, subMode)
  const requiresImage = currentEndpoint?.requiresImage || false
  const pendingJobs = getPendingGenerations()
  const completedJobs = getCompletedGenerations(mediaType)

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="px-8 pt-8 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-end justify-between"
        >
          <div>
            <p className="text-[10px] text-charcoal-500 uppercase tracking-[0.2em] mb-2">AI Studio</p>
            <h1 className="font-display text-3xl text-white tracking-tight">
              Create with AI
            </h1>
            <p className="text-charcoal-500 mt-1">Generate stunning images and videos with Gemini AI</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-resonate-400/[0.05] border border-resonate-400/20 rounded-lg">
              <Zap className="w-3.5 h-3.5 text-resonate-400" />
              <span className="text-sm font-medium text-white">1,250</span>
              <span className="text-[10px] text-charcoal-500 uppercase tracking-[0.1em]">credits</span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="px-8 pb-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Studio Panel */}
          <div className="lg:col-span-2 space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white/[0.02] backdrop-blur-sm rounded-xl border border-white/[0.06] overflow-hidden"
            >
              {/* Mode Toggle Header */}
              <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
                <ModeToggle mode={mediaType} onModeChange={setMediaType} />

                {/* Endpoint info */}
                {currentEndpoint && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-charcoal-600 uppercase tracking-wide">
                      {currentEndpoint.name}
                    </span>
                  </div>
                )}
              </div>

              {/* Canvas Preview Area */}
              <div className="p-6">
                <CanvasPreview
                  mode={mediaType}
                  generations={generations}
                  isGenerating={isGenerating}
                />
              </div>

              {/* Settings Bar */}
              <div className="px-6 pb-4">
                <SettingsBar
                  mode={mediaType}
                  imageSettings={imageSettings}
                  videoSettings={videoSettings}
                  onImageSettingsChange={setImageSettings}
                  onVideoSettingsChange={setVideoSettings}
                />
              </div>

              {/* Sub-mode Tabs */}
              <div className="px-6 pb-4 border-t border-white/[0.06] pt-4">
                <SubModeTabs
                  mode={mediaType}
                  subMode={subMode}
                  onSubModeChange={setSubMode}
                />
              </div>

              {/* Image Upload (for image-to-X modes) */}
              <AnimatePresence>
                {requiresImage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-6 pb-4 overflow-hidden"
                  >
                    <ImageUploadZone
                      image={generateData.image || null}
                      onImageChange={(image) => setGenerateData({ image })}
                      label={subMode === 'edit' ? 'Upload image to edit' : 'Upload source image'}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Prompt Input */}
              <div className="p-6 pt-2">
                <PromptInput
                  prompt={generateData.prompt}
                  onPromptChange={(prompt) => setGenerateData({ prompt })}
                  onGenerate={handleGenerate}
                  isGenerating={isGenerating}
                  disabled={!user || (requiresImage && !generateData.image)}
                  mode={mediaType}
                  subMode={subMode}
                />
              </div>

              {/* Credits info */}
              <div className="px-6 pb-4 flex items-center justify-between border-t border-white/[0.06] pt-4">
                <div className="flex items-center gap-2 text-[10px] text-charcoal-500 uppercase tracking-[0.1em]">
                  <Zap className="w-3 h-3 text-resonate-400" />
                  <span>~{mediaType === 'video' ? '10' : '2'} credits per generation</span>
                </div>
                {!user && (
                  <span className="text-[10px] text-yellow-400/80 uppercase tracking-[0.1em]">
                    Sign in to generate
                  </span>
                )}
              </div>
            </motion.div>

            {/* Error Display */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pending Jobs */}
            <AnimatePresence>
              {pendingJobs.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg border border-resonate-400/20 overflow-hidden">
                    <div className="p-4 border-b border-resonate-400/10">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-resonate-400 animate-spin" />
                        <span className="text-sm text-white">
                          Generating {pendingJobs.length} item{pendingJobs.length > 1 ? 's' : ''}...
                        </span>
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      {pendingJobs.map((job) => (
                        <div key={job.id} className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-resonate-400/10 flex items-center justify-center">
                            {job.type === 'image' && <ImageIcon className="w-4 h-4 text-resonate-400" />}
                            {job.type === 'video' && <Video className="w-4 h-4 text-resonate-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white truncate">{job.prompt}</p>
                            <p className="text-[10px] text-charcoal-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {job.status === 'running' ? 'Processing...' : 'In queue'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Recent Generations Gallery */}
            <AnimatePresence>
              {completedJobs.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg border border-white/[0.06] overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
                      <span className="text-[10px] text-charcoal-500 uppercase tracking-[0.15em]">
                        Recent {mediaType === 'image' ? 'Images' : 'Videos'}
                      </span>
                      <span className="text-[10px] text-charcoal-600">
                        {completedJobs.length} items
                      </span>
                    </div>
                    <div className="p-4">
                      <GenerationGallery
                        generations={completedJobs}
                        mode={mediaType}
                        onDelete={removeGeneration}
                        maxItems={8}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Generation History */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg border border-white/[0.06] overflow-hidden">
                <div className="p-4 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-md bg-white/[0.04]">
                      <History className="w-3.5 h-3.5 text-charcoal-400" />
                    </div>
                    <span className="text-[10px] text-charcoal-500 uppercase tracking-[0.15em]">History</span>
                  </div>
                </div>
                <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
                  {generationsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 text-charcoal-500 animate-spin" />
                    </div>
                  ) : generations.length > 0 ? (
                    generations.slice(0, 15).map((gen, index) => (
                      <motion.div
                        key={gen.id}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.03 }}
                        className="flex items-start gap-3 p-3 rounded-md bg-transparent hover:bg-white/[0.02] transition-colors cursor-pointer group"
                      >
                        <div className={`w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 ${
                          gen.status === 'completed'
                            ? 'bg-resonate-400/[0.06] border border-resonate-400/10'
                            : gen.status === 'failed'
                            ? 'bg-red-400/[0.06] border border-red-400/10'
                            : 'bg-white/[0.03]'
                        }`}>
                          {gen.status === 'completed' && <Check className="w-4 h-4 text-resonate-400" />}
                          {gen.status === 'failed' && <X className="w-4 h-4 text-red-400" />}
                          {(gen.status === 'pending' || gen.status === 'running') && (
                            <Loader2 className="w-4 h-4 text-charcoal-400 animate-spin" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[9px] uppercase tracking-[0.1em] ${
                              gen.type === 'video' ? 'text-purple-400' : 'text-blue-400'
                            }`}>
                              {gen.type}
                            </span>
                            {gen.status === 'completed' && (
                              <span className="text-[9px] text-resonate-400">Done</span>
                            )}
                          </div>
                          <p className="text-xs text-charcoal-400 group-hover:text-charcoal-200 transition-colors line-clamp-2">
                            {gen.prompt}
                          </p>
                          <p className="text-[9px] text-charcoal-600 mt-1">
                            {new Date(gen.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <p className="text-xs text-charcoal-600 text-center py-4">
                      {user ? 'No generations yet' : 'Sign in to see history'}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Usage Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="relative bg-white/[0.02] backdrop-blur-sm rounded-lg border border-resonate-400/20 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-resonate-400/[0.02] to-transparent pointer-events-none" />

                <div className="relative p-4 border-b border-resonate-400/10">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-md bg-resonate-400/10">
                      <TrendingUp className="w-3.5 h-3.5 text-resonate-400" />
                    </div>
                    <span className="text-[10px] text-charcoal-500 uppercase tracking-[0.15em]">This Month</span>
                  </div>
                </div>

                <div className="relative p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-charcoal-500 uppercase tracking-[0.1em]">Images</span>
                    <span className="text-sm text-white">
                      {generations.filter(g => g.type === 'image' && g.status === 'completed').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-charcoal-500 uppercase tracking-[0.1em]">Videos</span>
                    <span className="text-sm text-white">
                      {generations.filter(g => g.type === 'video' && g.status === 'completed').length}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-charcoal-500 uppercase tracking-[0.1em]">Credits Used</span>
                      <span className="text-xs text-resonate-400">750 / 2,000</span>
                    </div>
                    <div className="h-1 bg-charcoal-800/50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '37.5%' }}
                        transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="h-full bg-resonate-400 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Model Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg border border-white/[0.06] overflow-hidden p-4">
                <p className="text-[10px] text-charcoal-500 uppercase tracking-[0.15em] mb-3">Current Model</p>
                <div className="space-y-2">
                  <p className="text-sm text-white font-medium">
                    {currentEndpoint?.name || 'Select a mode'}
                  </p>
                  <p className="text-xs text-charcoal-500">
                    {currentEndpoint?.description || 'Choose a generation mode to get started'}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
