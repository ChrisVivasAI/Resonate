import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@supabase/supabase-js'
import { GEMINI_MEDIA_MODELS } from '@/lib/ai/gemini-media'

// Test endpoint to debug Gemini API and Supabase storage
export async function GET(request: NextRequest) {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    tests: {},
  }

  // Test 1: Check environment variables
  results.tests = {
    ...results.tests as object,
    env: {
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      geminiKeyLength: process.env.GEMINI_API_KEY?.length || 0,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  }

  // Test 2: Test Supabase connection and bucket
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

    if (bucketsError) {
      results.tests = {
        ...results.tests as object,
        supabase: { error: bucketsError.message },
      }
    } else {
      const aiGenerationsBucket = buckets?.find(b => b.name === 'ai-generations')

      // Create bucket if it doesn't exist
      if (!aiGenerationsBucket) {
        const { error: createError } = await supabase.storage.createBucket('ai-generations', {
          public: true,
          // Use smaller limit - 5MB for free tier compatibility
        })

        results.tests = {
          ...results.tests as object,
          supabase: {
            bucketExisted: false,
            bucketCreated: !createError,
            createError: createError?.message,
          },
        }
      } else {
        results.tests = {
          ...results.tests as object,
          supabase: {
            bucketExisted: true,
            bucketName: aiGenerationsBucket.name,
            bucketPublic: aiGenerationsBucket.public,
          },
        }
      }
    }
  } catch (error) {
    results.tests = {
      ...results.tests as object,
      supabase: { error: error instanceof Error ? error.message : 'Unknown error' },
    }
  }

  // Test 3: Test Gemini API connection (simple text request, not image)
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

    console.log('Testing Gemini API connection...')
    console.log('Image Model:', GEMINI_MEDIA_MODELS.IMAGE)
    console.log('Video Model:', GEMINI_MEDIA_MODELS.VIDEO)

    // Just test the connection with a simple text request
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: 'Say "API working" in 2 words',
    })

    results.tests = {
      ...results.tests as object,
      gemini: {
        connected: true,
        response: response.text?.substring(0, 100),
        imageModel: GEMINI_MEDIA_MODELS.IMAGE,
        videoModel: GEMINI_MEDIA_MODELS.VIDEO,
      },
    }
  } catch (error) {
    console.error('Gemini API error:', error)
    results.tests = {
      ...results.tests as object,
      gemini: {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    }
  }

  return NextResponse.json(results, { status: 200 })
}
