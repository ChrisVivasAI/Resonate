const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta'

// Model configuration - using Gemini 3 models
export const GEMINI_MODELS = {
  FLASH: 'gemini-3-flash-preview',  // Fast model for basic tasks
  PRO: 'gemini-3-pro-preview',      // Advanced model for complex tasks
}

export interface GeminiMessage {
  role: 'user' | 'model'
  parts: { text: string }[]
}

export interface GeminiRequest {
  contents: GeminiMessage[]
  generationConfig?: {
    temperature?: number
    topP?: number
    topK?: number
    maxOutputTokens?: number
  }
}

export interface GeminiResponse {
  candidates: {
    content: { parts: { text: string }[]; role: string }
    finishReason: string
  }[]
  usageMetadata: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
  }
}

async function geminiRequest(model: string, request: GeminiRequest): Promise<GeminiResponse> {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const response = await fetch(
    `${GEMINI_API_URL}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
    throw new Error(error.error?.message || `Gemini API error: ${response.status}`)
  }

  return response.json()
}

export async function generateText(
  prompt: string,
  options?: { model?: string; temperature?: number; maxTokens?: number; systemPrompt?: string }
): Promise<string> {
  // Default to Flash model for fast responses
  const model = options?.model || GEMINI_MODELS.FLASH

  const messages: GeminiMessage[] = []

  if (options?.systemPrompt) {
    messages.push({ role: 'user', parts: [{ text: `System: ${options.systemPrompt}` }] })
    messages.push({ role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] })
  }

  messages.push({ role: 'user', parts: [{ text: prompt }] })

  const response = await geminiRequest(model, {
    contents: messages,
    generationConfig: {
      temperature: options?.temperature ?? 0.7,
      maxOutputTokens: options?.maxTokens ?? 2048,
    },
  })

  return response.candidates[0]?.content?.parts[0]?.text || ''
}

export async function generateCreativeContent(
  type: 'headline' | 'tagline' | 'description' | 'blog' | 'social',
  context: {
    brand?: string
    product?: string
    audience?: string
    tone?: string
    keywords?: string[]
    length?: 'short' | 'medium' | 'long'
  }
): Promise<string> {
  const lengthGuide = { short: '1-2 sentences', medium: '3-5 sentences', long: '2-3 paragraphs' }

  // Use Pro model for complex content like blog posts, Flash for simpler tasks
  const isComplexTask = type === 'blog' || type === 'description'
  const model = isComplexTask ? GEMINI_MODELS.PRO : GEMINI_MODELS.FLASH

  const prompts: Record<string, string> = {
    headline: `Create a compelling headline for ${context.brand || 'a brand'}'s ${context.product || 'product'}.
Target audience: ${context.audience || 'general'}. Tone: ${context.tone || 'professional'}.
Only output the headline, nothing else.`,
    tagline: `Create a memorable tagline for ${context.brand || 'a brand'}. Make it punchy and memorable.
Only output the tagline, nothing else.`,
    description: `Write a product description for ${context.brand || 'a brand'}'s ${context.product || 'offering'}.
Target audience: ${context.audience || 'general'}.
Length: ${lengthGuide[context.length || 'medium']}`,
    blog: `Write a blog post about ${context.product || 'the topic'} for ${context.brand || 'a brand'}.
Target audience: ${context.audience || 'general'}.
Length: ${lengthGuide[context.length || 'long']}`,
    social: `Create a social media post for ${context.brand || 'a brand'} about ${context.product || 'their offering'}.
Target audience: ${context.audience || 'general'}.
Include a call to action. Keep it engaging and concise.`,
  }

  return generateText(prompts[type], {
    model,
    temperature: 0.8,
    maxTokens: isComplexTask ? 4096 : 1024,
    systemPrompt: 'You are a creative marketing copywriter. Generate engaging, original content that resonates with the target audience.',
  })
}

// Available models for UI selection
export const AVAILABLE_MODELS = [
  { id: GEMINI_MODELS.FLASH, name: 'Gemini 3 Flash', description: 'Fast, efficient model', creditsPerUse: 1 },
  { id: GEMINI_MODELS.PRO, name: 'Gemini 3', description: 'Advanced model for complex tasks', creditsPerUse: 3 },
]
