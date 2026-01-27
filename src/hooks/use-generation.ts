'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  fal,
  AVAILABLE_ENDPOINTS,
  getEndpointById,
  mapInputKey,
  type MediaCategory,
} from '@/lib/ai/fal'
import { useAuth } from './use-auth'
import { useGenerations, type AIGeneration } from './use-data'

export interface GenerateData {
  prompt: string
  image?: File | string | null
  video_url?: File | string | null
  audio_url?: File | string | null
  reference_audio_url?: File | string | null
  duration: number
  voice: string
  advanced_camera_control?: {
    movement_value: number
    movement_type: string
  }
  [key: string]: unknown
}

const DEFAULT_GENERATE_DATA: GenerateData = {
  prompt: '',
  image: null,
  video_url: null,
  audio_url: null,
  reference_audio_url: null,
  duration: 30,
  voice: 'Dexter (English (US)/American)',
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

  // Local form state
  const [mediaType, setMediaType] = useState<MediaCategory>('image')
  const [endpointId, setEndpointIdState] = useState(AVAILABLE_ENDPOINTS[0].endpointId)
  const [generateData, setGenerateDataState] = useState<GenerateData>({ ...DEFAULT_GENERATE_DATA })
  const [isGenerating, setIsGenerating] = useState(false)

  const endpoint = getEndpointById(endpointId)

  // Update endpoint when media type changes
  const handleSetMediaType = useCallback((type: MediaCategory) => {
    const ep = AVAILABLE_ENDPOINTS.find((e) => e.category === type)
    setMediaType(type)
    setEndpointIdState(ep?.endpointId || AVAILABLE_ENDPOINTS[0].endpointId)
    setGenerateDataState({
      ...DEFAULT_GENERATE_DATA,
      ...(ep?.preset || {}),
      ...(ep?.initialInput || {}),
    })
  }, [])

  const handleSetEndpointId = useCallback((id: string) => {
    const ep = AVAILABLE_ENDPOINTS.find((e) => e.endpointId === id)
    setEndpointIdState(id)
    setGenerateDataState((prev) => ({
      ...prev,
      ...(ep?.preset || {}),
      ...(ep?.initialInput || {}),
    }))
  }, [])

  const setGenerateData = useCallback((data: Partial<GenerateData>) => {
    setGenerateDataState((prev) => ({ ...prev, ...data }))
  }, [])

  const resetGenerateData = useCallback(() => {
    const ep = AVAILABLE_ENDPOINTS.find((e) => e.endpointId === endpointId)
    setGenerateDataState({
      ...DEFAULT_GENERATE_DATA,
      ...(ep?.preset || {}),
      ...(ep?.initialInput || {}),
    })
  }, [endpointId])

  // Poll for generation status
  useEffect(() => {
    const pendingGens = getPendingGenerations()

    if (pendingGens.length === 0) return

    const pollInterval = setInterval(async () => {
      for (const gen of pendingGens) {
        if (!gen.request_id || !gen.endpoint_id) continue

        try {
          const status = await fal.queue.status(gen.endpoint_id, {
            requestId: gen.request_id,
          })

          if (status.status === 'IN_PROGRESS' && gen.status !== 'running') {
            await updateInDb(gen.id, { status: 'running' })
          } else if (status.status === 'COMPLETED') {
            const result = await fal.queue.result(gen.endpoint_id, {
              requestId: gen.request_id,
            })

            // Extract result URL
            const resultData = result.data as Record<string, unknown>
            let resultUrl: string | null = null

            if (resultData.images && Array.isArray(resultData.images)) {
              resultUrl = (resultData.images[0] as { url: string })?.url || null
            } else if (resultData.video && typeof resultData.video === 'object') {
              resultUrl = (resultData.video as { url: string })?.url || null
            } else if (resultData.audio && typeof resultData.audio === 'object') {
              resultUrl = (resultData.audio as { url: string })?.url || null
            } else if (resultData.audio_url) {
              resultUrl = resultData.audio_url as string
            } else if (resultData.url) {
              resultUrl = resultData.url as string
            }

            await updateInDb(gen.id, {
              status: 'completed',
              result_data: resultData,
              result_url: resultUrl,
              completed_at: new Date().toISOString(),
            })
          } else if ((status.status as string) === 'FAILED') {
            await updateInDb(gen.id, {
              status: 'failed',
              error_message: 'Generation failed',
              completed_at: new Date().toISOString(),
            })
          }
        } catch (error) {
          console.error('Error polling generation status:', error)
        }
      }
    }, 3000)

    return () => clearInterval(pollInterval)
  }, [generations, getPendingGenerations, updateInDb])

  const generate = useCallback(async () => {
    if (!endpoint || !user) return

    setIsGenerating(true)

    try {
      // Build input based on endpoint requirements
      const input: Record<string, unknown> = {
        ...(endpoint.initialInput || {}),
        prompt: generateData.prompt,
      }

      // Add image size/aspect ratio
      if (mediaType === 'image') {
        input.image_size = 'landscape_16_9'
      } else if (mediaType === 'video') {
        input.aspect_ratio = '16:9'
        if (generateData.duration) {
          input.seconds_total = generateData.duration
        }
      } else if (mediaType === 'music') {
        if (generateData.duration) {
          input.seconds_total = generateData.duration
        }
      }

      // Add optional assets
      if (generateData.image) {
        input.image_url = generateData.image
      }
      if (generateData.video_url) {
        input.video_url = generateData.video_url
      }
      if (generateData.audio_url) {
        input.audio_url = generateData.audio_url
      }
      if (generateData.reference_audio_url) {
        input.reference_audio_url = generateData.reference_audio_url
      }
      if (generateData.voice && endpointId === 'fal-ai/playht/tts/v3') {
        input.voice = generateData.voice
        input.input = generateData.prompt
      }
      if (generateData.advanced_camera_control) {
        input.advanced_camera_control = generateData.advanced_camera_control
      }

      // Handle F5-TTS special case
      if (endpointId === 'fal-ai/f5-tts') {
        input.gen_text = generateData.prompt
      }

      // Map input keys if needed
      const mappedInput = endpoint.inputMap
        ? mapInputKey(input, endpoint.inputMap)
        : input

      // Determine actual endpoint (handle image-to-video)
      let actualEndpoint = endpointId
      if (generateData.image && mediaType === 'video') {
        actualEndpoint = `${endpointId}/image-to-video`
      }

      // Submit to queue
      const result = await fal.queue.submit(actualEndpoint, {
        input: mappedInput,
      })

      // Create generation record in database
      const generation = await addToDb({
        type: mediaType,
        prompt: generateData.prompt,
        negative_prompt: null,
        model: endpoint.label,
        endpoint_id: actualEndpoint,
        request_id: result.request_id,
        parameters: mappedInput,
        result_url: null,
        result_data: null,
        status: 'pending',
        error_message: null,
        cost_credits: mediaType === 'video' ? 10 : mediaType === 'music' ? 5 : 2,
        project_id: null,
      })

      resetGenerateData()

      return generation
    } catch (error) {
      console.error('Generation error:', error)
      throw error
    } finally {
      setIsGenerating(false)
    }
  }, [
    endpoint,
    endpointId,
    mediaType,
    generateData,
    user,
    addToDb,
    resetGenerateData,
  ])

  const getEndpointsForCategory = useCallback((category: MediaCategory) => {
    return AVAILABLE_ENDPOINTS.filter((e) => e.category === category)
  }, [])

  return {
    // State
    mediaType,
    endpointId,
    endpoint,
    generateData,
    generations,
    isGenerating,
    generationsLoading,

    // Actions
    setMediaType: handleSetMediaType,
    setEndpointId: handleSetEndpointId,
    setGenerateData,
    resetGenerateData,
    generate,
    removeGeneration: deleteFromDb,

    // Helpers
    getEndpointsForCategory,
    getCompletedGenerations,
    getPendingGenerations,
  }
}

// Helper to get output URL from generation result
export function getGenerationOutputUrl(generation: AIGeneration): string | null {
  if (generation.result_url) return generation.result_url

  if (!generation.result_data) return null

  const output = generation.result_data

  // Handle different output formats
  if (output.images && Array.isArray(output.images)) {
    return (output.images[0] as { url: string })?.url || null
  }
  if (output.video && typeof output.video === 'object') {
    return (output.video as { url: string })?.url || null
  }
  if (output.audio && typeof output.audio === 'object') {
    return (output.audio as { url: string })?.url || null
  }
  if (output.audio_url) {
    return output.audio_url as string
  }
  if (output.url) {
    return output.url as string
  }

  return null
}
