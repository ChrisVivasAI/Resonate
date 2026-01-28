// Image resolution presets (Gemini uses 1K/2K/4K)
export const IMAGE_RESOLUTIONS = [
  { value: '1K', label: '1K (Standard)' },
  { value: '2K', label: '2K (High Quality)' },
  { value: '4K', label: '4K (Ultra HD)' },
] as const

// Video resolution presets (Veo 3.1)
export const VIDEO_RESOLUTIONS = [
  { value: '720p', label: '720p (HD)' },
  { value: '1080p', label: '1080p (Full HD)', requiresDuration8: true },
  { value: '4K', label: '4K (Ultra HD)', requiresDuration8: true },
] as const

// Image aspect ratios (Gemini supported)
export const IMAGE_ASPECT_RATIOS = [
  { value: '1:1', label: '1:1 (Square)', ratio: 1 },
  { value: '3:2', label: '3:2', ratio: 3 / 2 },
  { value: '2:3', label: '2:3 (Portrait)', ratio: 2 / 3 },
  { value: '4:3', label: '4:3', ratio: 4 / 3 },
  { value: '3:4', label: '3:4', ratio: 3 / 4 },
  { value: '16:9', label: '16:9 (Landscape)', ratio: 16 / 9 },
  { value: '9:16', label: '9:16 (Portrait)', ratio: 9 / 16 },
  { value: '21:9', label: '21:9 (Cinematic)', ratio: 21 / 9 },
  { value: '4:5', label: '4:5', ratio: 4 / 5 },
  { value: '5:4', label: '5:4', ratio: 5 / 4 },
] as const

// Video aspect ratios (Veo 3.1 supported)
export const VIDEO_ASPECT_RATIOS = [
  { value: '16:9', label: '16:9 (Landscape)', ratio: 16 / 9 },
  { value: '9:16', label: '9:16 (Portrait)', ratio: 9 / 16 },
] as const

// Image output count options
export const IMAGE_COUNTS = [
  { value: 1, label: '1 image' },
  { value: 2, label: '2 images' },
  { value: 4, label: '4 images' },
] as const

// Video output count options (Veo generates 1 at a time)
export const VIDEO_COUNTS = [
  { value: 1, label: '1 video' },
] as const

// Video duration options (Veo 3.1 supported)
export const VIDEO_DURATIONS = [
  { value: 4, label: '4 seconds' },
  { value: 6, label: '6 seconds' },
  { value: 8, label: '8 seconds' },
] as const

// Image quality options (mapped to resolution for Gemini)
export const IMAGE_QUALITY = [
  { value: 'standard', label: 'Standard' },
  { value: 'hd', label: 'HD' },
] as const

// Types
export type ImageResolution = typeof IMAGE_RESOLUTIONS[number]['value']
export type VideoResolution = typeof VIDEO_RESOLUTIONS[number]['value']
export type ImageAspectRatio = typeof IMAGE_ASPECT_RATIOS[number]['value']
export type VideoAspectRatio = typeof VIDEO_ASPECT_RATIOS[number]['value']
export type ImageCount = typeof IMAGE_COUNTS[number]['value']
export type VideoCount = typeof VIDEO_COUNTS[number]['value']
export type VideoDuration = typeof VIDEO_DURATIONS[number]['value']
export type ImageQuality = typeof IMAGE_QUALITY[number]['value']

export interface ImageSettings {
  resolution: ImageResolution
  aspectRatio: ImageAspectRatio
  count: ImageCount
  quality: ImageQuality
}

export interface VideoSettings {
  resolution: VideoResolution
  aspectRatio: VideoAspectRatio
  count: VideoCount
  duration: VideoDuration
}

// Default settings
export const DEFAULT_IMAGE_SETTINGS: ImageSettings = {
  resolution: '1K',
  aspectRatio: '1:1',
  count: 1,
  quality: 'standard',
}

export const DEFAULT_VIDEO_SETTINGS: VideoSettings = {
  resolution: '720p',
  aspectRatio: '16:9',
  count: 1,
  duration: 4,
}

// Helper to check if video resolution requires 8s duration
export function videoResolutionRequires8s(resolution: VideoResolution): boolean {
  const preset = VIDEO_RESOLUTIONS.find((r) => r.value === resolution)
  return preset && 'requiresDuration8' in preset ? preset.requiresDuration8 : false
}

// Helper to get valid duration for a video resolution
export function getValidVideoDuration(resolution: VideoResolution, duration: VideoDuration): VideoDuration {
  if (videoResolutionRequires8s(resolution) && duration < 8) {
    return 8
  }
  return duration
}
