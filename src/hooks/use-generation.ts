'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  getEndpoint,
  getSubModesForCategory,
  type MediaCategory,
  type SubMode,
  type GeminiEndpointConfig,
} from '@/lib/ai/gemini-media'
import {
  DEFAULT_IMAGE_SETTINGS,
  DEFAULT_VIDEO_SETTINGS,
  getValidVideoDuration,
  type ImageSettings,
  type VideoSettings,
} from '@/lib/ai/presets'
import { useAuth } from './use-auth'
import { useGenerations, type AIGeneration } from './use-data'

export interface GenerateData {
  prompt: string
  image?: File | string | null
  mask?: File | string | null
}

const DEFAULT_GENERATE_DATA: GenerateData = {
  prompt: '',
  image: null,
  mask: null,
}

// Convert file to base64
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove the data URL prefix to get just the base64 data
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function useGeneration() {
  const { user } = useAuth()
  const {
    generations,
    loading: generationsLoading,
    addGeneration: addToDb,
    updateGeneration: updateInDb,
    deleteGeneration: deleteFromDb,
    getPendingGenerations,
    getCompletedGenerations,
  } = useGenerations(user?.id)

  // Mode state
  const [mediaType, setMediaTypeState] = useState<MediaCategory>('image')
  const [subMode, setSubModeState] = useState<SubMode>('text-to-image')

  // Settings state
  const [imageSettings, setImageSettingsState] = useState<ImageSettings>({ ...DEFAULT_IMAGE_SETTINGS })
  const [videoSettings, setVideoSettingsState] = useState<VideoSettings>({ ...DEFAULT_VIDEO_SETTINGS })

  // Form state
  const [generateData, setGenerateDataState] = useState<GenerateData>({ ...DEFAULT_GENERATE_DATA })
  const [isGenerating, setIsGenerating] = useState(false)

  // Latest result (for immediate display even if DB insert fails)
  const [latestResult, setLatestResult] = useState<AIGeneration | null>(null)

  // Get current endpoint config
  const endpoint = getEndpoint(mediaType, subMode)

  // Handle media type change
  const setMediaType = useCallback((type: MediaCategory) => {
    setMediaTypeState(type)
    const availableSubModes = getSubModesForCategory(type)
    setSubModeState(availableSubModes[0])
    setGenerateDataState({ ...DEFAULT_GENERATE_DATA })
  }, [])

  // Handle sub-mode change
  const setSubMode = useCallback((mode: SubMode) => {
    setSubModeState(mode)
    setGenerateDataState({ ...DEFAULT_GENERATE_DATA })
  }, [])

  // Settings setters
  const setImageSettings = useCallback((settings: Partial<ImageSettings>) => {
    setImageSettingsState((prev) => ({ ...prev, ...settings }))
  }, [])

  const setVideoSettings = useCallback((settings: Partial<VideoSettings>) => {
    setVideoSettingsState((prev) => {
      const newSettings = { ...prev, ...settings }
      // Enforce duration constraints for high resolutions
      if (settings.resolution) {
        newSettings.duration = getValidVideoDuration(newSettings.resolution, newSettings.duration)
      }
      return newSettings
    })
  }, [])

  const setGenerateData = useCallback((data: Partial<GenerateData>) => {
    setGenerateDataState((prev) => ({ ...prev, ...data }))
  }, [])

  const resetGenerateData = useCallback(() => {
    setGenerateDataState({ ...DEFAULT_GENERATE_DATA })
  }, [])

  // Poll for video generation status (Veo 3.1)
  useEffect(() => {
    const pendingGens = getPendingGenerations()
    // Video generations store operationId in request_id field
    const videoGens = pendingGens.filter((g) => g.type === 'video' && g.request_id)

    if (videoGens.length === 0) return

    const pollInterval = setInterval(async () => {
      for (const gen of videoGens) {
        const operationId = gen.request_id
        if (!operationId) continue

        try {
          // Pass userId for Supabase storage upload when video is ready
          const userId = gen.user_id || user?.id
          const params = new URLSearchParams({ operationId })
          if (userId) params.append('userId', userId)

          const response = await fetch(`/api/ai/video?${params.toString()}`)
          const status = await response.json()

          if (status.status === 'running' && gen.status !== 'running') {
            await updateInDb(gen.id, { status: 'running' })
          } else if (status.done && status.status === 'completed' && status.videoUrl) {
            await updateInDb(gen.id, {
              status: 'completed',
              result_url: status.videoUrl,
              result_data: { videoUrl: status.videoUrl, urls: [status.videoUrl] },
              completed_at: new Date().toISOString(),
            })
          } else if (status.done && status.status === 'failed') {
            await updateInDb(gen.id, {
              status: 'failed',
              error_message: status.error || 'Video generation failed',
              completed_at: new Date().toISOString(),
            })
          }
        } catch (error) {
          console.error('Error polling video status:', error)
        }
      }
    }, 10000) // Poll every 10 seconds for video

    return () => clearInterval(pollInterval)
  }, [generations, getPendingGenerations, updateInDb])

  const generate = useCallback(async () => {
    if (!endpoint || !user) return

    setIsGenerating(true)

    try {
      if (mediaType === 'image') {
        // Image generation via Gemini 3 Pro Image API
        const body: Record<string, unknown> = {
          prompt: generateData.prompt,
          aspectRatio: imageSettings.aspectRatio,
          resolution: imageSettings.resolution, // '1K', '2K', or '4K'
          numberOfImages: imageSettings.count,
          userId: user.id, // Pass userId for Supabase storage upload
        }

        // Add reference image for image-to-image or edit modes
        if (generateData.image && (subMode === 'image-to-image' || subMode === 'edit')) {
          let imageData: string
          if (typeof generateData.image === 'string') {
            // If it's a data URL, extract base64
            if (generateData.image.startsWith('data:')) {
              imageData = generateData.image.split(',')[1]
            } else {
              imageData = generateData.image
            }
          } else {
            imageData = await fileToBase64(generateData.image)
          }
          body.referenceImages = [imageData]
        }

        // Call API first, then create database record on success
        console.log('[useGeneration] Calling image API with body:', JSON.stringify(body, null, 2))

        // Make API call FIRST
        const response = await fetch('/api/ai/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          const error = await response.json()
          console.error('[useGeneration] API error:', error)
          throw new Error(error.error || 'Image generation failed')
        }

        const result = await response.json()
        console.log('[useGeneration] API result:', result)

        // Extract image URLs from result
        const images = result.images as Array<{ url: string; mimeType: string }>
        const resultUrls = images.map((img) => img.url)

        // Create a local generation object for immediate display
        const localGeneration: AIGeneration = {
          id: `local-${Date.now()}`,
          user_id: user.id,
          project_id: null,
          type: mediaType,
          prompt: generateData.prompt,
          negative_prompt: null,
          model: 'Gemini 3 Pro',
          endpoint_id: endpoint.id,
          request_id: null,
          parameters: {
            subMode,
            aspectRatio: imageSettings.aspectRatio,
            resolution: imageSettings.resolution,
            count: imageSettings.count,
          },
          result_url: resultUrls[0],
          result_data: { images, urls: resultUrls },
          status: 'completed',
          error_message: null,
          cost_credits: 2 * imageSettings.count,
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        }

        // Set latest result for immediate display
        setLatestResult(localGeneration)
        console.log('[useGeneration] Set latest result for display:', resultUrls[0])

        // Try to save to database (but don't block on it)
        let generation = localGeneration
        try {
          const dbGeneration = await addToDb({
            type: mediaType,
            prompt: generateData.prompt,
            negative_prompt: null,
            model: 'Gemini 3 Pro',
            endpoint_id: endpoint.id,
            request_id: null,
            parameters: {
              subMode,
              aspectRatio: imageSettings.aspectRatio,
              resolution: imageSettings.resolution,
              count: imageSettings.count,
            },
            result_url: resultUrls[0],
            result_data: { images, urls: resultUrls },
            status: 'completed',
            error_message: null,
            cost_credits: 2 * imageSettings.count,
            project_id: null,
          })
          generation = dbGeneration
          console.log('[useGeneration] Database record created:', dbGeneration.id)
          // Clear local result since DB has it now
          setLatestResult(null)
        } catch (dbError) {
          console.error('[useGeneration] Database error (image still displays):', dbError)
          // Keep latestResult so image still shows
        }

        resetGenerateData()
        return generation
      } else {
        // Video generation via Veo 3.1 API (async with polling)
        const body: Record<string, unknown> = {
          prompt: generateData.prompt,
          aspectRatio: videoSettings.aspectRatio,
          duration: videoSettings.duration,
          resolution: videoSettings.resolution,
          userId: user.id, // Pass userId for Supabase storage upload
        }

        // Add image for image-to-video mode
        if (generateData.image && subMode === 'image-to-video') {
          let imageData: string
          if (typeof generateData.image === 'string') {
            if (generateData.image.startsWith('data:')) {
              imageData = generateData.image.split(',')[1]
            } else {
              imageData = generateData.image
            }
          } else {
            imageData = await fileToBase64(generateData.image)
          }
          body.image = imageData
        }

        // Make API call to start video generation
        const response = await fetch('/api/ai/video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Video generation failed')
        }

        const result = await response.json()

        // Create generation record with operation ID in parameters for polling
        const generation = await addToDb({
          type: mediaType,
          prompt: generateData.prompt,
          negative_prompt: null,
          model: 'Veo',
          endpoint_id: endpoint.id,
          request_id: result.operationId, // Store operation ID in request_id
          parameters: {
            subMode,
            aspectRatio: videoSettings.aspectRatio,
            duration: videoSettings.duration,
            resolution: videoSettings.resolution,
            operationId: result.operationId, // Also store in parameters for easy access
          },
          result_url: null,
          result_data: null,
          status: 'pending',
          error_message: null,
          cost_credits: 10,
          project_id: null,
        })

        resetGenerateData()
        return generation
      }
    } catch (error) {
      console.error('Generation error:', error)
      throw error
    } finally {
      setIsGenerating(false)
    }
  }, [
    endpoint,
    mediaType,
    subMode,
    generateData,
    imageSettings,
    videoSettings,
    user,
    addToDb,
    updateInDb,
    resetGenerateData,
  ])

  // Combine database generations with latest local result
  const allGenerations = latestResult
    ? [latestResult, ...generations.filter(g => g.id !== latestResult.id)]
    : generations

  // Updated helper that includes latestResult
  const getCompletedGenerationsWithLocal = useCallback(
    (type?: MediaCategory) => {
      const all = latestResult
        ? [latestResult, ...generations.filter(g => g.id !== latestResult.id)]
        : generations
      return all.filter((g) => g.status === 'completed' && (!type || g.type === type))
    },
    [generations, latestResult]
  )

  return {
    // State
    mediaType,
    subMode,
    endpoint,
    generateData,
    imageSettings,
    videoSettings,
    generations: allGenerations,
    isGenerating,
    generationsLoading,

    // Actions
    setMediaType,
    setSubMode,
    setGenerateData,
    setImageSettings,
    setVideoSettings,
    resetGenerateData,
    generate,
    removeGeneration: deleteFromDb,

    // Helpers
    getCompletedGenerations: getCompletedGenerationsWithLocal,
    getPendingGenerations,
  }
}

// Helper to get output URL from generation result
export function getGenerationOutputUrl(generation: AIGeneration): string | null {
  // First check direct result_url
  if (generation.result_url) return generation.result_url

  if (!generation.result_data) return null

  const output = generation.result_data

  // Check for urls array in result_data
  if (output.urls && Array.isArray(output.urls) && output.urls.length > 0) {
    return output.urls[0] as string
  }

  // Handle image response (can have url or data format)
  if (output.images && Array.isArray(output.images)) {
    const firstImage = output.images[0] as { url?: string; data?: string; mimeType?: string }
    if (firstImage.url) {
      return firstImage.url
    }
    if (firstImage.data && firstImage.mimeType) {
      return `data:${firstImage.mimeType};base64,${firstImage.data}`
    }
  }

  // Handle video response
  if (output.videoUrl) {
    return output.videoUrl as string
  }

  return null
}

// Helper to get all output URLs from generation result
export function getGenerationOutputUrls(generation: AIGeneration): string[] {
  // Check for urls stored in result_data
  if (generation.result_data && generation.result_data.urls && Array.isArray(generation.result_data.urls)) {
    return generation.result_data.urls as string[]
  }

  const url = getGenerationOutputUrl(generation)
  return url ? [url] : []
}
