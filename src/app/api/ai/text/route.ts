import { NextRequest, NextResponse } from 'next/server'
import { generateText, generateCreativeContent } from '@/lib/ai/gemini'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, type, context } = body

    if (!prompt && !type) {
      return NextResponse.json({ error: 'Prompt or type is required' }, { status: 400 })
    }

    let result

    if (type && context) {
      result = await generateCreativeContent(type, context)
    } else {
      result = await generateText(prompt, {
        temperature: 0.7,
        maxTokens: 2048,
      })
    }

    return NextResponse.json({ text: result })
  } catch (error) {
    console.error('Text generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate text' },
      { status: 500 }
    )
  }
}
