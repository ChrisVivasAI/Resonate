import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@supabase/supabase-js'
import { GEMINI_MEDIA_MODELS } from '@/lib/ai/gemini-media'

// Initialize Gemini client
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }
  return new GoogleGenAI({ apiKey })
}

// Initialize Supabase admin client for storage operations
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase configuration is missing')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Download video from URL and upload to Supabase storage
async function downloadAndUploadVideo(
  videoUrl: string,
  userId: string
): Promise<string> {
  const supabase = getSupabaseAdmin()

  // Download the video from Gemini's temporary URL
  console.log('Downloading video from:', videoUrl)
  const response = await fetch(videoUrl)

  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.statusText}`)
  }

  const videoBuffer = Buffer.from(await response.arrayBuffer())
  console.log('Video downloaded, size:', videoBuffer.length, 'bytes')

  // Create a unique filename
  const filename = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`

  // Ensure bucket exists (create if not)
  const { data: buckets } = await supabase.storage.listBuckets()
  const bucketExists = buckets?.some((b) => b.name === 'ai-generations')

  if (!bucketExists) {
    const { error: createError } = await supabase.storage.createBucket('ai-generations', {
      public: true,
      fileSizeLimit: 52428800, // 50MB for videos
    })
    if (createError) {
      console.error('Failed to create bucket:', createError)
      // Continue anyway - bucket might have been created by another request
    }
  }

  // Upload to storage
  const { data, error } = await supabase.storage
    .from('ai-generations')
    .upload(filename, videoBuffer, {
      contentType: 'video/mp4',
      upsert: false,
    })

  if (error) {
    console.error('Storage upload error:', error)
    throw new Error(`Failed to upload video: ${error.message}`)
  }

  // Get public URL
  const { data: publicUrl } = supabase.storage
    .from('ai-generations')
    .getPublicUrl(data.path)

  console.log('Video uploaded to Supabase:', publicUrl.publicUrl)
  return publicUrl.publicUrl
}

// POST: Start video generation with Veo 3.1
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString()
  console.log(`\n[${timestamp}] >>>>> NEW VIDEO GENERATION REQUEST <<<<<`)
  try {
    const body = await request.json()
    const { prompt, aspectRatio, duration, resolution, image, lastFrame, userId } = body

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    console.log('=== Starting Video Generation (Veo 3.1) ===')
    console.log('Model:', GEMINI_MEDIA_MODELS.VIDEO)
    console.log('Prompt:', prompt)
    console.log('Aspect Ratio:', aspectRatio)
    console.log('Duration:', duration)
    console.log('Resolution:', resolution)

    const ai = getGeminiClient()

    // Build the request config for Veo 3.1
    // Docs: https://ai.google.dev/gemini-api/docs/video
    const config: Record<string, unknown> = {}

    if (aspectRatio) {
      config.aspectRatio = aspectRatio // '16:9' or '9:16'
    }

    if (duration) {
      config.durationSeconds = duration // 4, 6, or 8
    }

    // Note: resolution parameter is NOT supported in Gemini API SDK
    // The API outputs at default resolution (720p)
    // Higher resolutions (1080p, 4K) may require Vertex AI SDK instead
    if (resolution && resolution !== '720p') {
      console.log('Note: Resolution', resolution, 'requested but Gemini API defaults to 720p')
    }
    // Enforce 8s duration for high resolution requests (for future Vertex AI support)
    if (resolution && (resolution === '1080p' || resolution === '4k' || resolution === '4K') &&
        (!duration || duration < 8)) {
      config.durationSeconds = 8
      console.log('Enforcing 8s duration for high resolution request')
    }

    console.log('Final Video Config:', JSON.stringify(config, null, 2))

    // Build request parameters for Veo 3.1
    // Using proper types from @google/genai SDK
    interface GenerateVideosParams {
      model: string
      prompt?: string
      image?: { imageBytes: string; mimeType: string }
      config?: Record<string, unknown>
    }

    const genRequest: GenerateVideosParams = {
      model: GEMINI_MEDIA_MODELS.VIDEO,
      prompt,
      config,
    }

    // Add image for image-to-video mode
    if (image) {
      genRequest.image = {
        imageBytes: image,
        mimeType: 'image/png',
      }
      console.log('Image-to-video mode enabled')
    }

    // Add last frame if provided (for first-to-last frame interpolation)
    if (lastFrame) {
      config.lastFrame = {
        imageBytes: lastFrame,
        mimeType: 'image/png',
      }
      console.log('Last frame provided for interpolation')
    }

    // Store userId in response for later use when uploading to Supabase
    console.log(`[${new Date().toISOString()}] Calling Veo 3.1 API (MODEL: ${GEMINI_MEDIA_MODELS.VIDEO})...`)

    // Start the video generation operation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const operation = await ai.models.generateVideos(genRequest as any)

    if (!operation.name) {
      console.error('No operation name returned from Veo 3.1')
      console.log('Full operation object:', JSON.stringify(operation, null, 2))
      return NextResponse.json(
        { error: 'Failed to start video generation operation' },
        { status: 500 }
      )
    }

    console.log('Veo 3.1 video generation started, operation:', operation.name)

    return NextResponse.json({
      operationId: operation.name,
      status: 'pending',
      userId, // Pass through for polling endpoint
    })
  } catch (error) {
    console.error('=== Veo 3.1 Video Generation Error ===')
    console.error('Error:', error)

    if (error instanceof Error) {
      console.error('Error message:', error.message)

      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Invalid or missing Gemini API key.' },
          { status: 401 }
        )
      }

      if (error.message.includes('quota') || error.message.includes('rate')) {
        return NextResponse.json(
          { error: 'API quota exceeded or rate limited. Please try again later.' },
          { status: 429 }
        )
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start video generation' },
      { status: 500 }
    )
  }
}

// GET: Check video generation status and upload to Supabase when complete
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString()
  try {
    const { searchParams } = new URL(request.url)
    const operationId = searchParams.get('operationId')
    const userId = searchParams.get('userId')

    console.log(`[${timestamp}] Checking Video Operation Status: ${operationId}`)

    if (!operationId) {
      return NextResponse.json({ error: 'Operation ID is required' }, { status: 400 })
    }

    console.log('Checking Veo 3.1 video status for operation:', operationId)

    const ai = getGeminiClient()

    // Check operation status using operations.get()
    // Pass operation object with name property
    const operation = await ai.operations.get({
      operation: { name: operationId }
    })

    console.log('Operation update for', operationId, 'Done:', operation.done)
    if (operation.error) {
      console.log('Operation error details:', JSON.stringify(operation.error, null, 2))
    }

    if (!operation.done) {
      console.log('Video generation still in progress...')
      return NextResponse.json({
        done: false,
        status: 'running',
      })
    }

    // Check for errors
    if (operation.error) {
      console.error('Veo 3.1 video generation failed:', operation.error)
      const errorObj = operation.error as { message?: string }
      return NextResponse.json({
        done: true,
        status: 'failed',
        error: errorObj.message || 'Video generation failed',
      })
    }

    // Extract video URL from response
    // Type assertion for the response structure
    const response = operation.response as {
      generatedVideos?: Array<{ video?: { uri?: string } }>
    } | undefined

    if (
      response &&
      response.generatedVideos &&
      response.generatedVideos.length > 0
    ) {
      const video = response.generatedVideos[0]
      if (video.video && video.video.uri) {
        const tempVideoUrl = video.video.uri
        console.log('Veo 3.1 video generated, temporary URL:', tempVideoUrl)

        // If userId provided, download and upload to Supabase for permanent storage
        // (Veo video URLs expire after 2 days)
        if (userId) {
          try {
            const permanentUrl = await downloadAndUploadVideo(tempVideoUrl, userId)
            return NextResponse.json({
              done: true,
              status: 'completed',
              videoUrl: permanentUrl,
            })
          } catch (uploadError) {
            console.error('Failed to upload video to Supabase:', uploadError)
            // Return temporary URL as fallback
            return NextResponse.json({
              done: true,
              status: 'completed',
              videoUrl: tempVideoUrl,
              warning: 'Video stored temporarily. URL expires in 2 days.',
            })
          }
        }

        // No userId, return temporary URL with warning
        return NextResponse.json({
          done: true,
          status: 'completed',
          videoUrl: tempVideoUrl,
          warning: 'Video stored temporarily. URL expires in 2 days.',
        })
      }
    }

    return NextResponse.json({
      done: true,
      status: 'failed',
      error: 'No video was generated',
    })
  } catch (error) {
    console.error('Veo 3.1 video status check error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check video status' },
      { status: 500 }
    )
  }
}
