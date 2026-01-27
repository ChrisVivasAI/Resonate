'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Image as ImageIcon,
  Video,
  Type,
  Wand2,
  Download,
  Copy,
  RefreshCw,
  Settings2,
  ChevronRight,
  Zap,
  Layers,
  Eraser,
  ZoomIn,
  Palette,
  Play,
  History,
  TrendingUp,
  Music,
  Mic,
  Loader2,
  Check,
  X,
  Clock,
  ExternalLink,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout'
import { useGeneration, getGenerationOutputUrl } from '@/hooks/use-generation'
import { AVAILABLE_ENDPOINTS, type MediaCategory } from '@/lib/ai/fal'
import { useAuth } from '@/hooks/use-auth'
import type { AIGeneration } from '@/hooks/use-data'

const textTypes = [
  { value: 'headline', label: 'Headline' },
  { value: 'tagline', label: 'Tagline' },
  { value: 'description', label: 'Product Description' },
  { value: 'blog', label: 'Blog Post' },
  { value: 'social', label: 'Social Post' },
]

const tools = [
  { id: 'upscale', name: 'Upscale', icon: ZoomIn, description: 'Enhance resolution', credits: 3 },
  { id: 'remove-bg', name: 'Remove BG', icon: Eraser, description: 'Remove background', credits: 2 },
  { id: 'variations', name: 'Variations', icon: Layers, description: 'Generate variations', credits: 4 },
  { id: 'style-transfer', name: 'Style', icon: Palette, description: 'Apply art styles', credits: 5 },
]

const imageSizes = [
  { value: 'landscape_16_9', label: 'Landscape 16:9' },
  { value: 'landscape_4_3', label: 'Landscape 4:3' },
  { value: 'square_hd', label: 'Square HD (1024x1024)' },
  { value: 'portrait_4_3', label: 'Portrait 4:3' },
  { value: 'portrait_16_9', label: 'Portrait 16:9' },
]

const voiceOptions = [
  { value: 'Dexter (English (US)/American)', label: 'Dexter - American Male' },
  { value: 'Jennifer (English (US)/American)', label: 'Jennifer - American Female' },
  { value: 'Aria (English (US)/American)', label: 'Aria - American Female' },
  { value: 'Davis (English (US)/American)', label: 'Davis - American Male' },
  { value: 'Furio (English (IT)/Italian)', label: 'Furio - Italian Male' },
]

export default function AIStudioPage() {
  const { user, loading: authLoading } = useAuth()
  const {
    mediaType,
    endpointId,
    endpoint,
    generateData,
    generations,
    isGenerating,
    generationsLoading,
    setMediaType,
    setEndpointId,
    setGenerateData,
    generate,
    getEndpointsForCategory,
    getCompletedGenerations,
    getPendingGenerations,
  } = useGeneration()

  const [activeTab, setActiveTab] = useState<MediaCategory | 'text'>('image')
  const [textType, setTextType] = useState('headline')
  const [generatedText, setGeneratedText] = useState('')
  const [brandName, setBrandName] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [error, setError] = useState('')
  const [textGenerating, setTextGenerating] = useState(false)
  const [imageSize, setImageSize] = useState('landscape_16_9')
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false)
  const [falKey, setFalKey] = useState('')

  // Load FAL key from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('falKey')
      if (savedKey) setFalKey(savedKey)
    }
  }, [])

  const saveFalKey = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('falKey', falKey)
      setApiKeyDialogOpen(false)
    }
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as MediaCategory | 'text')
    if (tab !== 'text') {
      setMediaType(tab as MediaCategory)
    }
  }

  const handleGenerate = async () => {
    if (!generateData.prompt.trim()) return
    setError('')

    try {
      if (activeTab === 'text') {
        // Text generation with Gemini
        setTextGenerating(true)
        const response = await fetch('/api/ai/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: textType,
            context: {
              brand: brandName || undefined,
              product: generateData.prompt,
              audience: targetAudience || undefined,
              tone: 'professional',
              length: textType === 'blog' ? 'long' : textType === 'description' ? 'medium' : 'short',
            },
          }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to generate text')
        }
        setGeneratedText(data.text)
      } else {
        // Media generation with FAL.ai
        await generate()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
      console.error('Generation error:', err)
    } finally {
      setTextGenerating(false)
    }
  }

  const tabs = [
    { id: 'image', label: 'Image', icon: ImageIcon },
    { id: 'video', label: 'Video', icon: Video },
    { id: 'music', label: 'Music', icon: Music },
    { id: 'voiceover', label: 'Voice', icon: Mic },
    { id: 'text', label: 'Text', icon: Type },
  ]

  const endpoints = activeTab !== 'text' ? getEndpointsForCategory(activeTab as MediaCategory) : []
  const pendingJobs = getPendingGenerations()
  const completedJobs = getCompletedGenerations(activeTab !== 'text' ? activeTab as MediaCategory : undefined).slice(0, 5)

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
            <p className="text-charcoal-500 mt-1">Generate stunning visuals, videos, music, and compelling copy.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-resonate-400/[0.05] border border-resonate-400/20 rounded-lg">
              <Zap className="w-3.5 h-3.5 text-resonate-400" />
              <span className="text-sm font-medium text-white">1,250</span>
              <span className="text-[10px] text-charcoal-500 uppercase tracking-[0.1em]">credits</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setApiKeyDialogOpen(true)}
              className="p-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg transition-all duration-300"
            >
              <Settings2 className="w-4 h-4 text-charcoal-400" />
            </motion.button>
          </div>
        </motion.div>
      </div>

      <div className="px-8 pb-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Generation Panel */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg border border-white/[0.06] overflow-hidden">
                {/* Tab Header */}
                <div className="p-4 border-b border-white/[0.06]">
                  <div className="flex items-center gap-1 p-1 bg-white/[0.02] rounded-lg w-fit">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs tracking-wide transition-all duration-300 ${
                          activeTab === tab.id
                            ? 'bg-white/[0.06] text-white'
                            : 'text-charcoal-500 hover:text-charcoal-300'
                        }`}
                      >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                  {/* Image Tab */}
                  {activeTab === 'image' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] text-charcoal-500 uppercase tracking-[0.15em]">Model</label>
                        <select
                          value={endpointId}
                          onChange={(e) => setEndpointId(e.target.value)}
                          className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-resonate-400/30 transition-all duration-300 appearance-none cursor-pointer"
                        >
                          {endpoints.map((ep) => (
                            <option key={ep.endpointId} value={ep.endpointId} className="bg-charcoal-900">
                              {ep.label}
                            </option>
                          ))}
                        </select>
                        {endpoint && (
                          <p className="text-[10px] text-charcoal-600">{endpoint.description}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] text-charcoal-500 uppercase tracking-[0.15em]">Prompt</label>
                        <textarea
                          placeholder="Describe the image you want to generate..."
                          value={generateData.prompt}
                          onChange={(e) => setGenerateData({ prompt: e.target.value })}
                          className="w-full min-h-[100px] bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-3 text-sm text-white placeholder:text-charcoal-600 focus:outline-none focus:border-resonate-400/30 focus:ring-1 focus:ring-resonate-400/20 resize-none transition-all duration-300"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] text-charcoal-500 uppercase tracking-[0.15em]">Size</label>
                        <select
                          value={imageSize}
                          onChange={(e) => setImageSize(e.target.value)}
                          className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-resonate-400/30 transition-all duration-300 appearance-none cursor-pointer"
                        >
                          {imageSizes.map((size) => (
                            <option key={size.value} value={size.value} className="bg-charcoal-900">
                              {size.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {/* Video Tab */}
                  {activeTab === 'video' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] text-charcoal-500 uppercase tracking-[0.15em]">Model</label>
                        <select
                          value={endpointId}
                          onChange={(e) => setEndpointId(e.target.value)}
                          className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-resonate-400/30 transition-all duration-300 appearance-none cursor-pointer"
                        >
                          {endpoints.map((ep) => (
                            <option key={ep.endpointId} value={ep.endpointId} className="bg-charcoal-900">
                              {ep.label}
                            </option>
                          ))}
                        </select>
                        {endpoint && (
                          <p className="text-[10px] text-charcoal-600">{endpoint.description}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] text-charcoal-500 uppercase tracking-[0.15em]">Prompt</label>
                        <textarea
                          placeholder="Describe the video you want to generate..."
                          value={generateData.prompt}
                          onChange={(e) => setGenerateData({ prompt: e.target.value })}
                          className="w-full min-h-[100px] bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-3 text-sm text-white placeholder:text-charcoal-600 focus:outline-none focus:border-resonate-400/30 focus:ring-1 focus:ring-resonate-400/20 resize-none transition-all duration-300"
                        />
                      </div>

                      {endpoint?.inputAsset?.includes('image') && (
                        <div className="p-8 rounded-lg border border-dashed border-white/[0.08] text-center hover:border-white/[0.15] transition-colors cursor-pointer group">
                          <div className="w-14 h-14 mx-auto mb-4 rounded-lg bg-white/[0.04] flex items-center justify-center group-hover:bg-white/[0.06] transition-colors">
                            <ImageIcon className="w-6 h-6 text-charcoal-500 group-hover:text-charcoal-400 transition-colors" />
                          </div>
                          <p className="text-sm text-charcoal-400 mb-1">Upload an image for image-to-video</p>
                          <p className="text-[10px] text-charcoal-600 uppercase tracking-[0.1em]">PNG, JPG up to 10MB</p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-[10px] text-charcoal-500 uppercase tracking-[0.15em]">Duration</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="3"
                            max="10"
                            value={generateData.duration || 5}
                            onChange={(e) => setGenerateData({ duration: parseInt(e.target.value) })}
                            className="flex-1 h-1 bg-charcoal-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-resonate-400"
                          />
                          <span className="text-sm text-white w-12 text-center">{generateData.duration || 5}s</span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Music Tab */}
                  {activeTab === 'music' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] text-charcoal-500 uppercase tracking-[0.15em]">Model</label>
                        <select
                          value={endpointId}
                          onChange={(e) => setEndpointId(e.target.value)}
                          className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-resonate-400/30 transition-all duration-300 appearance-none cursor-pointer"
                        >
                          {endpoints.map((ep) => (
                            <option key={ep.endpointId} value={ep.endpointId} className="bg-charcoal-900">
                              {ep.label}
                            </option>
                          ))}
                        </select>
                        {endpoint && (
                          <p className="text-[10px] text-charcoal-600">{endpoint.description}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] text-charcoal-500 uppercase tracking-[0.15em]">Description</label>
                        <textarea
                          placeholder="Describe the music you want to generate... (e.g., 'Upbeat electronic music with synth melodies')"
                          value={generateData.prompt}
                          onChange={(e) => setGenerateData({ prompt: e.target.value })}
                          className="w-full min-h-[100px] bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-3 text-sm text-white placeholder:text-charcoal-600 focus:outline-none focus:border-resonate-400/30 focus:ring-1 focus:ring-resonate-400/20 resize-none transition-all duration-300"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] text-charcoal-500 uppercase tracking-[0.15em]">Duration</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="10"
                            max="60"
                            step="5"
                            value={generateData.duration || 30}
                            onChange={(e) => setGenerateData({ duration: parseInt(e.target.value) })}
                            className="flex-1 h-1 bg-charcoal-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-resonate-400"
                          />
                          <span className="text-sm text-white w-12 text-center">{generateData.duration || 30}s</span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Voiceover Tab */}
                  {activeTab === 'voiceover' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] text-charcoal-500 uppercase tracking-[0.15em]">Model</label>
                        <select
                          value={endpointId}
                          onChange={(e) => setEndpointId(e.target.value)}
                          className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-resonate-400/30 transition-all duration-300 appearance-none cursor-pointer"
                        >
                          {endpoints.map((ep) => (
                            <option key={ep.endpointId} value={ep.endpointId} className="bg-charcoal-900">
                              {ep.label}
                            </option>
                          ))}
                        </select>
                        {endpoint && (
                          <p className="text-[10px] text-charcoal-600">{endpoint.description}</p>
                        )}
                      </div>

                      {endpointId === 'fal-ai/playht/tts/v3' && (
                        <div className="space-y-2">
                          <label className="text-[10px] text-charcoal-500 uppercase tracking-[0.15em]">Voice</label>
                          <select
                            value={generateData.voice || 'Dexter (English (US)/American)'}
                            onChange={(e) => setGenerateData({ voice: e.target.value })}
                            className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-resonate-400/30 transition-all duration-300 appearance-none cursor-pointer"
                          >
                            {voiceOptions.map((voice) => (
                              <option key={voice.value} value={voice.value} className="bg-charcoal-900">
                                {voice.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-[10px] text-charcoal-500 uppercase tracking-[0.15em]">Text to Speak</label>
                        <textarea
                          placeholder="Enter the text you want to convert to speech..."
                          value={generateData.prompt}
                          onChange={(e) => setGenerateData({ prompt: e.target.value })}
                          className="w-full min-h-[120px] bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-3 text-sm text-white placeholder:text-charcoal-600 focus:outline-none focus:border-resonate-400/30 focus:ring-1 focus:ring-resonate-400/20 resize-none transition-all duration-300"
                        />
                      </div>
                    </>
                  )}

                  {/* Text Tab */}
                  {activeTab === 'text' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] text-charcoal-500 uppercase tracking-[0.15em]">Content Type</label>
                        <select
                          value={textType}
                          onChange={(e) => setTextType(e.target.value)}
                          className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-resonate-400/30 transition-all duration-300 appearance-none cursor-pointer"
                        >
                          {textTypes.map((type) => (
                            <option key={type.value} value={type.value} className="bg-charcoal-900">
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] text-charcoal-500 uppercase tracking-[0.15em]">Context / Brief</label>
                        <textarea
                          placeholder="Describe your brand, product, or what you need copy for..."
                          value={generateData.prompt}
                          onChange={(e) => setGenerateData({ prompt: e.target.value })}
                          className="w-full min-h-[100px] bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-3 text-sm text-white placeholder:text-charcoal-600 focus:outline-none focus:border-resonate-400/30 focus:ring-1 focus:ring-resonate-400/20 resize-none transition-all duration-300"
                        />
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] text-charcoal-500 uppercase tracking-[0.15em]">Brand Name</label>
                          <input
                            type="text"
                            placeholder="Your brand name"
                            value={brandName}
                            onChange={(e) => setBrandName(e.target.value)}
                            className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-charcoal-600 focus:outline-none focus:border-resonate-400/30 transition-all duration-300"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] text-charcoal-500 uppercase tracking-[0.15em]">Target Audience</label>
                          <input
                            type="text"
                            placeholder="Who is this for?"
                            value={targetAudience}
                            onChange={(e) => setTargetAudience(e.target.value)}
                            className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-charcoal-600 focus:outline-none focus:border-resonate-400/30 transition-all duration-300"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-5 border-t border-white/[0.06]">
                    <div className="flex items-center gap-2 text-[10px] text-charcoal-500 uppercase tracking-[0.1em]">
                      <Zap className="w-3 h-3 text-resonate-400" />
                      <span>
                        ~{activeTab === 'video' ? '10' : activeTab === 'music' ? '5' : activeTab === 'voiceover' ? '3' : activeTab === 'text' ? '1' : '2'} credits
                      </span>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleGenerate}
                      disabled={!generateData.prompt.trim() || isGenerating || textGenerating || (!user && activeTab !== 'text')}
                      className="flex items-center gap-2 px-5 py-2.5 bg-resonate-400/10 hover:bg-resonate-400/20 border border-resonate-400/30 rounded-lg text-resonate-400 text-sm tracking-wide transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGenerating || textGenerating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Wand2 className="w-4 h-4" />
                      )}
                      {!user && activeTab !== 'text' ? 'Sign in to Generate' : isGenerating || textGenerating ? 'Generating...' : 'Generate'}
                    </motion.button>
                  </div>
                </div>
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
                        <span className="text-sm text-white">Generating {pendingJobs.length} item{pendingJobs.length > 1 ? 's' : ''}...</span>
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      {pendingJobs.map((job) => (
                        <div key={job.id} className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-resonate-400/10 flex items-center justify-center">
                            {job.type === 'image' && <ImageIcon className="w-4 h-4 text-resonate-400" />}
                            {job.type === 'video' && <Video className="w-4 h-4 text-resonate-400" />}
                            {job.type === 'music' && <Music className="w-4 h-4 text-resonate-400" />}
                            {job.type === 'voiceover' && <Mic className="w-4 h-4 text-resonate-400" />}
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

            {/* Text Results */}
            <AnimatePresence>
              {generatedText && activeTab === 'text' && !textGenerating && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg border border-resonate-400/20 overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-resonate-400/10">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-resonate-400 animate-pulse" />
                        <span className="text-[10px] text-charcoal-500 uppercase tracking-[0.15em]">Generated with Gemini</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleGenerate}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] text-charcoal-500 hover:text-white uppercase tracking-[0.1em] transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Regenerate
                        </button>
                        <button
                          onClick={() => navigator.clipboard.writeText(generatedText)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-resonate-400/10 hover:bg-resonate-400/20 border border-resonate-400/20 rounded text-[10px] text-resonate-400 uppercase tracking-[0.1em] transition-all duration-300"
                        >
                          <Copy className="w-3 h-3" />
                          Copy
                        </button>
                      </div>
                    </div>
                    <div className="p-6">
                      <p className="text-charcoal-200 leading-relaxed whitespace-pre-wrap">
                        {generatedText}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Completed Generations */}
            <AnimatePresence>
              {completedJobs.length > 0 && activeTab !== 'text' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg border border-white/[0.06] overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
                      <span className="text-[10px] text-charcoal-500 uppercase tracking-[0.15em]">Recent Generations</span>
                    </div>
                    <div className="p-4 grid gap-4 sm:grid-cols-2">
                      {completedJobs.map((job) => {
                        const outputUrl = getGenerationOutputUrl(job)
                        return (
                          <div key={job.id} className="rounded-lg bg-charcoal-900/50 overflow-hidden group">
                            {job.type === 'image' && outputUrl && (
                              <div className="aspect-video relative">
                                <img src={outputUrl} alt={job.prompt} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <a
                                    href={outputUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                                  >
                                    <ExternalLink className="w-4 h-4 text-white" />
                                  </a>
                                  <a
                                    href={outputUrl}
                                    download
                                    className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                                  >
                                    <Download className="w-4 h-4 text-white" />
                                  </a>
                                </div>
                              </div>
                            )}
                            {job.type === 'video' && outputUrl && (
                              <div className="aspect-video relative">
                                <video src={outputUrl} className="w-full h-full object-cover" controls />
                              </div>
                            )}
                            {(job.type === 'music' || job.type === 'voiceover') && outputUrl && (
                              <div className="p-4">
                                <audio src={outputUrl} controls className="w-full" />
                              </div>
                            )}
                            <div className="p-3">
                              <p className="text-xs text-charcoal-400 line-clamp-2">{job.prompt}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Tools */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg border border-white/[0.06] overflow-hidden">
                <div className="p-4 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-md bg-white/[0.04]">
                      <Wand2 className="w-3.5 h-3.5 text-charcoal-400" />
                    </div>
                    <span className="text-[10px] text-charcoal-500 uppercase tracking-[0.15em]">Quick Tools</span>
                  </div>
                </div>
                <div className="p-3 space-y-1">
                  {tools.map((tool, index) => (
                    <motion.button
                      key={tool.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
                      className="w-full flex items-center gap-3 p-3 rounded-md bg-transparent hover:bg-white/[0.03] transition-all duration-300 text-left group"
                    >
                      <div className="p-2 rounded-md bg-white/[0.03] group-hover:bg-resonate-400/10 transition-colors">
                        <tool.icon className="w-3.5 h-3.5 text-charcoal-500 group-hover:text-resonate-400 transition-colors" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-charcoal-300 group-hover:text-white transition-colors">{tool.name}</p>
                        <p className="text-[9px] text-charcoal-600">{tool.description}</p>
                      </div>
                      <div className="flex items-center gap-1 text-[9px] text-charcoal-600">
                        <Zap className="w-2.5 h-2.5" />
                        {tool.credits}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Generation History */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
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
                <div className="p-3 space-y-2">
                  {generationsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 text-charcoal-500 animate-spin" />
                    </div>
                  ) : generations.length > 0 ? (
                    generations.slice(0, 10).map((gen, index) => (
                      <motion.div
                        key={gen.id}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
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
                            <span className="text-[9px] text-charcoal-500 uppercase tracking-[0.1em]">{gen.type}</span>
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
              transition={{ duration: 0.5, delay: 0.4 }}
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
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-charcoal-500 uppercase tracking-[0.1em]">Music</span>
                    <span className="text-sm text-white">
                      {generations.filter(g => g.type === 'music' && g.status === 'completed').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-charcoal-500 uppercase tracking-[0.1em]">Voiceovers</span>
                    <span className="text-sm text-white">
                      {generations.filter(g => g.type === 'voiceover' && g.status === 'completed').length}
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
          </div>
        </div>
      </div>

      {/* API Key Dialog */}
      <AnimatePresence>
        {apiKeyDialogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setApiKeyDialogOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-charcoal-900 border border-white/[0.08] rounded-xl p-6 w-full max-w-md"
            >
              <h3 className="text-lg font-medium text-white mb-2">API Settings</h3>
              <p className="text-sm text-charcoal-500 mb-6">
                Enter your FAL.ai API key to enable AI generation features.
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-charcoal-500 uppercase tracking-[0.15em]">FAL.ai API Key</label>
                  <input
                    type="password"
                    value={falKey}
                    onChange={(e) => setFalKey(e.target.value)}
                    placeholder="Enter your FAL.ai API key"
                    className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-charcoal-600 focus:outline-none focus:border-resonate-400/30 transition-all duration-300"
                  />
                  <p className="text-[10px] text-charcoal-600">
                    Get your API key from{' '}
                    <a href="https://fal.ai" target="_blank" rel="noopener noreferrer" className="text-resonate-400 hover:underline">
                      fal.ai
                    </a>
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setApiKeyDialogOpen(false)}
                    className="px-4 py-2 text-sm text-charcoal-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveFalKey}
                    className="px-4 py-2 bg-resonate-400/10 hover:bg-resonate-400/20 border border-resonate-400/30 rounded-lg text-sm text-resonate-400 transition-all duration-300"
                  >
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  )
}
