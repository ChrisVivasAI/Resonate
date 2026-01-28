// Model IDs
export const GEMINI_MEDIA_MODELS = {
  IMAGE: 'gemini-3-pro-image-preview',  // Gemini 3 Pro Image (Nano Banana Pro)
  VIDEO: 'veo-3.1-generate-preview',     // Veo 3.1 standard
  VIDEO_FAST: 'veo-3.1-fast-generate-preview', // Veo 3.1 fast
}

// Types
export type MediaCategory = 'image' | 'video'
export type ImageSubMode = 'text-to-image' | 'image-to-image' | 'edit'
export type VideoSubMode = 'text-to-video' | 'image-to-video' | 'extend'
export type SubMode = ImageSubMode | VideoSubMode

export interface GeminiEndpointConfig {
  id: string
  name: string
  description: string
  subMode: SubMode
  category: MediaCategory
  requiresImage?: boolean
  requiresMask?: boolean
}

// Image generation endpoints (Gemini 3 Pro Image)
export const IMAGE_ENDPOINTS: Record<string, GeminiEndpointConfig> = {
  'text-to-image': {
    id: GEMINI_MEDIA_MODELS.IMAGE,
    name: 'Text to Image',
    description: 'Generate high-quality images from text prompts using Gemini 3 Pro',
    subMode: 'text-to-image',
    category: 'image',
  },
  'image-to-image': {
    id: GEMINI_MEDIA_MODELS.IMAGE,
    name: 'Image to Image',
    description: 'Transform existing images with prompts using up to 14 reference images',
    subMode: 'image-to-image',
    category: 'image',
    requiresImage: true,
  },
  'edit': {
    id: GEMINI_MEDIA_MODELS.IMAGE,
    name: 'Edit Image',
    description: 'Edit specific regions of images with multi-turn conversational editing',
    subMode: 'edit',
    category: 'image',
    requiresImage: true,
    requiresMask: true,
  },
}

// Video generation endpoints (Veo 3.1)
export const VIDEO_ENDPOINTS: Record<string, GeminiEndpointConfig> = {
  'text-to-video': {
    id: GEMINI_MEDIA_MODELS.VIDEO,
    name: 'Text to Video',
    description: 'Generate videos from text prompts using Veo 3.1',
    subMode: 'text-to-video',
    category: 'video',
  },
  'image-to-video': {
    id: GEMINI_MEDIA_MODELS.VIDEO,
    name: 'Image to Video',
    description: 'Animate images into videos using first frame with Veo 3.1',
    subMode: 'image-to-video',
    category: 'video',
    requiresImage: true,
  },
  'extend': {
    id: GEMINI_MEDIA_MODELS.VIDEO,
    name: 'Extend Video',
    description: 'Extend existing videos (720p only) with Veo 3.1',
    subMode: 'extend',
    category: 'video',
    requiresImage: true,
  },
}

// Combined endpoints mapping
export const GEMINI_ENDPOINTS = {
  image: IMAGE_ENDPOINTS,
  video: VIDEO_ENDPOINTS,
}

// Helper to get endpoint by category and sub-mode
export function getEndpoint(category: MediaCategory, subMode: string): GeminiEndpointConfig | undefined {
  const endpoints = GEMINI_ENDPOINTS[category]
  return endpoints[subMode]
}

// Helper to get all endpoints for a category
export function getEndpointsForCategory(category: MediaCategory): GeminiEndpointConfig[] {
  return Object.values(GEMINI_ENDPOINTS[category])
}

// Helper to get available sub-modes for a category
export function getSubModesForCategory(category: MediaCategory): SubMode[] {
  if (category === 'image') {
    return ['text-to-image', 'image-to-image', 'edit']
  }
  return ['text-to-video', 'image-to-video', 'extend']
}

// Get sub-mode display name
export function getSubModeDisplayName(subMode: SubMode): string {
  const names: Record<SubMode, string> = {
    'text-to-image': 'Text to Image',
    'image-to-image': 'Image to Image',
    'edit': 'Edit',
    'text-to-video': 'Text to Video',
    'image-to-video': 'Image to Video',
    'extend': 'Extend',
  }
  return names[subMode]
}

// Image resolution type for Gemini
export type GeminiImageResolution = '1K' | '2K' | '4K'

// Video resolution type for Veo
export type GeminiVideoResolution = '720p' | '1080p' | '4K'

// Video duration type for Veo
export type GeminiVideoDuration = 4 | 6 | 8

// Video aspect ratio type for Veo
export type GeminiVideoAspectRatio = '16:9' | '9:16'

// Image aspect ratio type for Gemini
export type GeminiImageAspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9'

// Model information for UI
export const GEMINI_MEDIA_INFO = {
  IMAGE: {
    id: GEMINI_MEDIA_MODELS.IMAGE,
    name: 'Gemini 3 Pro Image',
    description: 'Generate and edit images with Gemini 3 Pro (Nano Banana Pro)',
    creditsPerUse: 2,
  },
  VIDEO: {
    id: GEMINI_MEDIA_MODELS.VIDEO,
    name: 'Veo 3.1',
    description: 'Generate high-quality videos with Veo 3.1',
    creditsPerUse: 10,
  },
  VIDEO_FAST: {
    id: GEMINI_MEDIA_MODELS.VIDEO_FAST,
    name: 'Veo 3.1 Fast',
    description: 'Generate videos quickly with Veo 3.1 Fast',
    creditsPerUse: 8,
  },
}
