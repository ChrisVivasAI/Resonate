'use client'

import { createFalClient } from '@fal-ai/client'

// Safe localStorage access for SSR
const getCredentials = (): string | undefined => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem('falKey') || undefined
  }
  return undefined
}

export const fal = createFalClient({
  credentials: getCredentials,
  proxyUrl: '/api/fal',
})

export type InputAsset =
  | 'video'
  | 'image'
  | 'audio'
  | {
      type: 'video' | 'image' | 'audio'
      key: string
    }

export type MediaCategory = 'image' | 'video' | 'music' | 'voiceover'

export type ApiInfo = {
  endpointId: string
  label: string
  description: string
  cost: string
  inferenceTime?: string
  inputMap?: Record<string, string>
  inputAsset?: InputAsset[]
  initialInput?: Record<string, unknown>
  preset?: Record<string, unknown>
  cameraControl?: boolean
  imageForFrame?: boolean
  category: MediaCategory
  prompt?: boolean
}

export const AVAILABLE_ENDPOINTS: ApiInfo[] = [
  // Image Generation
  {
    endpointId: 'fal-ai/flux/dev',
    label: 'Flux Dev',
    description: 'High-quality image generation with excellent prompt adherence',
    cost: '',
    category: 'image',
    preset: {},
  },
  {
    endpointId: 'fal-ai/imagen4/preview',
    label: 'Google Imagen 4',
    description: 'Generate photorealistic images from text prompts',
    cost: '',
    category: 'image',
    preset: {},
  },
  {
    endpointId: 'fal-ai/flux/schnell',
    label: 'Flux Schnell',
    description: 'Fast image generation optimized for speed',
    cost: '',
    category: 'image',
    preset: {},
  },
  {
    endpointId: 'fal-ai/flux-pro/v1.1-ultra',
    label: 'Flux Pro 1.1 Ultra',
    description: 'Premium quality image generation',
    cost: '',
    category: 'image',
    preset: {},
  },
  {
    endpointId: 'fal-ai/stable-diffusion-v35-large',
    label: 'Stable Diffusion 3.5 Large',
    description: 'Image quality, typography, complex prompt understanding',
    cost: '',
    category: 'image',
    preset: {},
  },

  // Video Generation
  {
    endpointId: 'fal-ai/veo2',
    label: 'Veo 2',
    description: 'Creates videos with realistic motion and high quality output, up to 4K',
    cost: '',
    category: 'video',
    preset: { duration: 5 },
  },
  {
    endpointId: 'fal-ai/minimax/video-01-live',
    label: 'Minimax Video 01 Live',
    description: 'High quality video with realistic motion and physics',
    cost: '',
    category: 'video',
    inputAsset: ['image'],
    preset: { duration: 5 },
  },
  {
    endpointId: 'fal-ai/hunyuan-video',
    label: 'Hunyuan',
    description: 'High visual quality, motion diversity and text alignment',
    cost: '',
    category: 'video',
    preset: { duration: 5 },
  },
  {
    endpointId: 'fal-ai/kling-video/v1.5/pro',
    label: 'Kling 1.5 Pro',
    description: 'High quality video generation',
    cost: '',
    category: 'video',
    inputAsset: ['image'],
    preset: { duration: 5 },
  },
  {
    endpointId: 'fal-ai/kling-video/v1/standard/text-to-video',
    label: 'Kling 1.0 Standard',
    description: 'Standard quality video with camera control',
    cost: '',
    category: 'video',
    inputAsset: [],
    preset: { duration: 5 },
    cameraControl: true,
  },
  {
    endpointId: 'fal-ai/luma-dream-machine',
    label: 'Luma Dream Machine 1.5',
    description: 'High quality video generation',
    cost: '',
    category: 'video',
    inputAsset: ['image'],
    preset: { duration: 5 },
  },
  {
    endpointId: 'fal-ai/ltx-video-v095/multiconditioning',
    label: 'LTX Video v0.95',
    description: 'Generate videos from prompts and images',
    cost: '',
    imageForFrame: true,
    category: 'video',
    preset: { duration: 5 },
  },

  // Music Generation
  {
    endpointId: 'fal-ai/minimax-music',
    label: 'Minimax Music',
    description: 'Create high-quality, diverse musical compositions',
    cost: '',
    category: 'music',
    inputAsset: [
      {
        type: 'audio',
        key: 'reference_audio_url',
      },
    ],
    preset: { duration: 30 },
  },
  {
    endpointId: 'fal-ai/stable-audio',
    label: 'Stable Audio',
    description: 'High-quality music and audio generation',
    cost: '',
    category: 'music',
    preset: { duration: 30 },
  },

  // Voiceover/TTS
  {
    endpointId: 'fal-ai/playht/tts/v3',
    label: 'PlayHT TTS v3',
    description: 'Fluent and faithful speech with natural intonation',
    cost: '',
    category: 'voiceover',
    initialInput: {
      voice: 'Dexter (English (US)/American)',
    },
    preset: { duration: 30, voice: 'Dexter (English (US)/American)' },
  },
  {
    endpointId: 'fal-ai/playai/tts/dialog',
    label: 'PlayAI Dialog',
    description: 'Multi-speaker dialogues for storytelling and interactive media',
    cost: '',
    category: 'voiceover',
    inputMap: {
      prompt: 'input',
    },
    initialInput: {
      voices: [
        {
          voice: 'Jennifer (English (US)/American)',
          turn_prefix: 'Speaker 1: ',
        },
        {
          voice: 'Furio (English (IT)/Italian)',
          turn_prefix: 'Speaker 2: ',
        },
      ],
    },
    preset: { duration: 30 },
  },
  {
    endpointId: 'fal-ai/f5-tts',
    label: 'F5 TTS',
    description: 'Fluent and faithful speech with flow matching',
    cost: '',
    category: 'voiceover',
    initialInput: {
      ref_audio_url:
        'https://github.com/SWivid/F5-TTS/raw/21900ba97d5020a5a70bcc9a0575dc7dec5021cb/tests/ref_audio/test_en_1_ref_short.wav',
      ref_text: 'Some call me nature, others call me mother nature.',
      model_type: 'F5-TTS',
      remove_silence: true,
    },
    preset: { duration: 30 },
  },
]

// Helper functions
export function getAssetType(asset: InputAsset): string {
  return typeof asset === 'string' ? asset : asset.type
}

export function getAssetKey(asset: InputAsset): string {
  if (typeof asset === 'string') {
    const keyMap: Record<string, string> = {
      video: 'video_url',
      image: 'image',
      audio: 'audio_url',
    }
    return keyMap[asset] || asset
  }
  return asset.key
}

export function mapInputKey(
  input: Record<string, unknown>,
  inputMap: Record<string, string>
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    const mappedKey = inputMap[key] || key
    mapped[mappedKey] = value
  }
  return mapped
}

export const assetKeyMap: Record<string, string> = {
  video: 'video_url',
  image: 'image',
  music: 'audio_url',
  voiceover: 'audio_url',
}

export function getEndpointsByCategory(category: MediaCategory): ApiInfo[] {
  return AVAILABLE_ENDPOINTS.filter((endpoint) => endpoint.category === category)
}

export function getEndpointById(endpointId: string): ApiInfo | undefined {
  return AVAILABLE_ENDPOINTS.find((endpoint) => endpoint.endpointId === endpointId)
}

// Legacy exports for backward compatibility
export const FAL_MODELS = {
  IMAGE: AVAILABLE_ENDPOINTS.filter((e) => e.category === 'image').map((e) => ({
    id: e.endpointId,
    name: e.label,
    description: e.description,
    creditsPerUse: 2,
  })),
  VIDEO: AVAILABLE_ENDPOINTS.filter((e) => e.category === 'video').map((e) => ({
    id: e.endpointId,
    name: e.label,
    description: e.description,
    creditsPerUse: 10,
  })),
  MUSIC: AVAILABLE_ENDPOINTS.filter((e) => e.category === 'music').map((e) => ({
    id: e.endpointId,
    name: e.label,
    description: e.description,
    creditsPerUse: 5,
  })),
  VOICEOVER: AVAILABLE_ENDPOINTS.filter((e) => e.category === 'voiceover').map((e) => ({
    id: e.endpointId,
    name: e.label,
    description: e.description,
    creditsPerUse: 3,
  })),
}
