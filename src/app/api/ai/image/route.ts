import { NextRequest, NextResponse } from 'next/server'
import { fal } from '@fal-ai/client'

// Configure fal client for server-side use
fal.config({
  credentials: process.env.FAL_KEY,
})

interface ImageGenerationResult {
  images: Array<{
    url: string
    width: number
    height: number
    content_type: string
  }>
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, negative_prompt, model, image_size, num_images } = body

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const endpointId = model || 'fal-ai/flux/dev'

    const result = await fal.subscribe(endpointId, {
      input: {
        prompt,
        negative_prompt,
        image_size: image_size || 'landscape_16_9',
        num_images: num_images || 1,
      },
    }) as unknown as ImageGenerationResult

    return NextResponse.json(result)
  } catch (error) {
    console.error('Image generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate image' },
      { status: 500 }
    )
  }
}
