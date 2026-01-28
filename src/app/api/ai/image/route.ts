import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@supabase/supabase-js'
import { GEMINI_MEDIA_MODELS } from '@/lib/ai/gemini-media'

// Initialize Supabase admin client for storage operations
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(`[${new Date().toISOString()}] !! Supabase configuration missing !! URL: ${!!supabaseUrl}, Key: ${!!serviceRoleKey}`)
    throw new Error('Supabase configuration is missing')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Initialize Gemini client
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }
  return new GoogleGenAI({ apiKey })
}

// Upload base64 image to Supabase storage
async function uploadToStorage(
  base64Data: string,
  mimeType: string,
  userId: string
): Promise<string> {
  const supabase = getSupabaseAdmin()

  // Create a unique filename
  const extension = mimeType.split('/')[1] || 'png'
  const filename = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`

  // Convert base64 to buffer
  const buffer = Buffer.from(base64Data, 'base64')

  // Ensure bucket exists (create if not)
  const { data: buckets } = await supabase.storage.listBuckets()
  const bucketExists = buckets?.some((b) => b.name === 'ai-generations')
  console.log(`[${new Date().toISOString()}] Checking bucket 'ai-generations'... Exists: ${bucketExists}`)

  if (!bucketExists) {
    const { error: createError } = await supabase.storage.createBucket('ai-generations', {
      public: true,
      fileSizeLimit: 5242880, // 5MB - smaller limit for free tier
    })
    if (createError) {
      console.error('Failed to create bucket:', createError)
      // Continue anyway - bucket might have been created by another request
    }
  }

  // Upload to storage
  const { data, error } = await supabase.storage
    .from('ai-generations')
    .upload(filename, buffer, {
      contentType: mimeType,
      upsert: false,
    })

  if (error) {
    console.error('Storage upload error:', error)
    throw new Error(`Failed to upload image: ${error.message}`)
  }

  // Get public URL
  const { data: publicUrl } = supabase.storage
    .from('ai-generations')
    .getPublicUrl(data.path)

  return publicUrl.publicUrl
}

interface ImageGenerationResult {
  images: Array<{
    url: string
    mimeType: string
  }>
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString()
  console.log(`\n[${timestamp}] >>>>> NEW IMAGE GENERATION REQUEST <<<<<`)
  try {
    const body = await request.json()
    const { prompt, aspectRatio, resolution, referenceImages, numberOfImages, userId } = body

    if (!prompt) {
      console.log('Error: Prompt is missing in request body')
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    console.log('=== Incoming Image Generation Request ===')
    console.log('User ID:', userId)
    console.log('Prompt:', prompt)
    console.log('Aspect Ratio:', aspectRatio)
    console.log('Resolution:', resolution)
    console.log('Number of Images:', numberOfImages)
    console.log('Reference Images:', referenceImages?.length || 0)

    const ai = getGeminiClient()

    // Build content parts
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = []

    // Add reference images first if provided (Gemini 3 Pro supports up to 14)
    if (referenceImages && Array.isArray(referenceImages) && referenceImages.length > 0) {
      console.log('Adding', referenceImages.length, 'reference images')
      for (const imageData of referenceImages) {
        parts.push({
          inlineData: {
            mimeType: 'image/png',
            data: imageData,
          },
        })
      }
    }

    // Add the prompt
    parts.push({ text: prompt })

    // Build configuration for Gemini 3 Pro Image (Nano Banana Pro)
    // Docs: https://ai.google.dev/gemini-api/docs/image-generation
    const config: Record<string, any> = {
      responseModalities: ['TEXT', 'IMAGE'],
    }

    // Add image configuration if provided
    if (aspectRatio || resolution) {
      config.imageConfig = {
        ...(aspectRatio && { aspectRatio }),
        ...(resolution && { imageSize: resolution }), // '1K', '2K', '4K'
      }
    }

    console.log(`[${new Date().toISOString()}] Prompt:`, prompt)
    console.log(`[${new Date().toISOString()}] Model:`, GEMINI_MEDIA_MODELS.IMAGE)
    console.log(`[${new Date().toISOString()}] Request Parts:`, JSON.stringify(parts.map(p => 'text' in p ? p : { inlineData: 'IMAGE_DATA' }), null, 2))
    console.log(`[${new Date().toISOString()}] Generation config:`, JSON.stringify(config, null, 2))

    console.log(`[${new Date().toISOString()}] Calling Gemini API (MODEL: ${GEMINI_MEDIA_MODELS.IMAGE})...`)

    const response = await ai.models.generateContent({
      model: GEMINI_MEDIA_MODELS.IMAGE,
      contents: parts,
      config: config,
    })

    console.log(`[${new Date().toISOString()}] <<<< Gemini Response Received >>>>`)
    if (!response) {
      console.log('Error: Response from Gemini is null or undefined')
    } else {
      console.log('Candidates count:', response.candidates?.length || 0)
    }

    // Extract images from response
    const generatedImages: Array<{ url: string; mimeType: string }> = []

    if (response.candidates && response.candidates.length > 0) {
      console.log('Processing', response.candidates.length, 'candidates')

      for (const candidate of response.candidates) {
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            // Check for inline data (base64 image)
            if (part.inlineData && part.inlineData.data) {
              const mimeType = part.inlineData.mimeType || 'image/png'
              const base64Data = part.inlineData.data

              console.log('Found image, mimeType:', mimeType, 'data length:', base64Data.length)

              // If userId provided, upload to Supabase storage
              if (userId) {
                try {
                  const publicUrl = await uploadToStorage(base64Data, mimeType, userId)
                  generatedImages.push({ url: publicUrl, mimeType })
                  console.log('Uploaded to storage:', publicUrl)
                } catch (uploadError) {
                  console.error('Upload failed, using data URL instead:', uploadError)
                  // Fallback to data URL
                  const dataUrl = `data:${mimeType};base64,${base64Data}`
                  generatedImages.push({ url: dataUrl, mimeType })
                }
              } else {
                // No userId, use data URL
                const dataUrl = `data:${mimeType};base64,${base64Data}`
                generatedImages.push({ url: dataUrl, mimeType })
              }
            }
          }
        }
      }
    } else {
      console.log('No candidates in response')
      if (response.promptFeedback) {
        console.log('Prompt feedback:', JSON.stringify(response.promptFeedback, null, 2))
      }
      console.log('Full response structure keys:', Object.keys(response))
    }

    if (generatedImages.length === 0) {
      // Check if there's text response (error or explanation)
      let textResponse = ''
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.text) {
            textResponse += part.text
          }
        }
      }

      console.error('No images generated. Text response:', textResponse)
      return NextResponse.json(
        {
          error: textResponse || 'No images were generated. The model may have returned text instead of images.',
        },
        { status: 500 }
      )
    }

    console.log('Successfully generated', generatedImages.length, 'images')

    // Save generation record to database (server-side to avoid RLS issues)
    let generationId: string | null = null
    if (userId) {
      try {
        const supabase = getSupabaseAdmin()
        const resultUrls = generatedImages.map(img => img.url)

        const { data: genRecord, error: genError } = await supabase
          .from('ai_generations')
          .insert({
            user_id: userId,
            type: 'image',
            prompt: prompt,
            model: 'Gemini 3 Pro',
            endpoint_id: GEMINI_MEDIA_MODELS.IMAGE,
            parameters: {
              aspectRatio: aspectRatio || null,
              resolution: resolution || null,
              numberOfImages: numberOfImages || 1,
            },
            result_url: resultUrls[0],
            result_data: { images: generatedImages, urls: resultUrls },
            status: 'completed',
            cost_credits: 2 * (numberOfImages || 1),
          })
          .select('id')
          .single()

        if (genError) {
          console.error('[API] Failed to save generation record:', genError.message, genError.code)
        } else {
          generationId = genRecord.id
          console.log('[API] Generation record saved:', generationId)
        }
      } catch (dbError) {
        console.error('[API] Database error saving generation:', dbError)
        // Don't fail the request - image was still generated successfully
      }
    }

    const result: ImageGenerationResult = { images: generatedImages }
    return NextResponse.json({ ...result, generationId })
  } catch (error) {
    console.error('=== Image Generation Error ===')
    console.error('Error:', error)

    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)

      // Check for specific API errors
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Invalid or missing Gemini API key. Please check your configuration.' },
          { status: 401 }
        )
      }

      if (error.message.includes('model')) {
        return NextResponse.json(
          { error: `Model error: ${error.message}. The model may not be available or may not support image generation.` },
          { status: 400 }
        )
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to generate image'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
