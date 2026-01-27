import { GEMINI_MODELS } from './gemini'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta'

export interface DesignAnalysis {
  layout: {
    type: 'single-column' | 'multi-column' | 'grid' | 'hero-based' | 'split'
    sections: SectionAnalysis[]
  }
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
  }
  typography: {
    headingFont: string
    bodyFont: string
    headingSizes: string[]
    bodySizes: string[]
  }
  style: {
    theme: 'light' | 'dark' | 'mixed'
    aesthetic: string // e.g., "minimalist", "modern", "playful", "corporate"
    borderRadius: 'none' | 'small' | 'medium' | 'large' | 'full'
    shadowIntensity: 'none' | 'subtle' | 'medium' | 'strong'
  }
  content: {
    hasLogo: boolean
    hasNavigation: boolean
    hasHero: boolean
    hasFooter: boolean
    imageCount: number
    buttonCount: number
    formFields: string[]
  }
}

export interface SectionAnalysis {
  type: 'hero' | 'features' | 'testimonials' | 'cta' | 'contact' | 'gallery' | 'pricing' | 'stats' | 'text' | 'header' | 'footer' | 'unknown'
  position: number
  description: string
  elements: string[]
  suggestedComponent: string
}

interface GeminiVisionPart {
  text?: string
  inline_data?: {
    mime_type: string
    data: string
  }
}

interface GeminiVisionMessage {
  role: 'user' | 'model'
  parts: GeminiVisionPart[]
}

interface GeminiVisionRequest {
  contents: GeminiVisionMessage[]
  generationConfig?: {
    temperature?: number
    topP?: number
    topK?: number
    maxOutputTokens?: number
  }
}

async function geminiVisionRequest(
  model: string,
  request: GeminiVisionRequest
): Promise<any> {
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

async function fetchImageAsBase64(imageUrl: string): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`)
  }

  const contentType = response.headers.get('content-type') || 'image/png'
  const arrayBuffer = await response.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')

  return {
    data: base64,
    mimeType: contentType,
  }
}

const ANALYSIS_PROMPT = `You are a design analysis AI. Analyze this UI design image and extract structured information about its layout, colors, typography, and sections.

Respond with a valid JSON object (no markdown, no explanation, just the JSON) with this exact structure:

{
  "layout": {
    "type": "single-column" | "multi-column" | "grid" | "hero-based" | "split",
    "sections": [
      {
        "type": "hero" | "features" | "testimonials" | "cta" | "contact" | "gallery" | "pricing" | "stats" | "text" | "header" | "footer" | "unknown",
        "position": <number starting from 1>,
        "description": "<brief description of the section>",
        "elements": ["<list of UI elements in this section>"],
        "suggestedComponent": "<React component name suggestion>"
      }
    ]
  },
  "colors": {
    "primary": "<hex color>",
    "secondary": "<hex color>",
    "accent": "<hex color>",
    "background": "<hex color>",
    "text": "<hex color>"
  },
  "typography": {
    "headingFont": "<font family suggestion>",
    "bodyFont": "<font family suggestion>",
    "headingSizes": ["<size>", "<size>"],
    "bodySizes": ["<size>", "<size>"]
  },
  "style": {
    "theme": "light" | "dark" | "mixed",
    "aesthetic": "<e.g., minimalist, modern, playful, corporate, elegant>",
    "borderRadius": "none" | "small" | "medium" | "large" | "full",
    "shadowIntensity": "none" | "subtle" | "medium" | "strong"
  },
  "content": {
    "hasLogo": <boolean>,
    "hasNavigation": <boolean>,
    "hasHero": <boolean>,
    "hasFooter": <boolean>,
    "imageCount": <number>,
    "buttonCount": <number>,
    "formFields": ["<field names if any form is present>"]
  }
}

Be precise with color extraction - try to identify the exact hex colors used. For fonts, suggest appropriate Google Fonts alternatives if you can't identify the exact font.`

export async function analyzeDesign(imageUrl: string): Promise<DesignAnalysis> {
  // Fetch the image and convert to base64
  const { data, mimeType } = await fetchImageAsBase64(imageUrl)

  // Use the Pro model for vision tasks
  const model = GEMINI_MODELS.PRO

  const request: GeminiVisionRequest = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: ANALYSIS_PROMPT },
          {
            inline_data: {
              mime_type: mimeType,
              data: data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4096,
    },
  }

  const response = await geminiVisionRequest(model, request)
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text || ''

  // Parse the JSON response
  try {
    // Clean up the response - remove any markdown code blocks if present
    let jsonStr = text.trim()
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7)
    }
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3)
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3)
    }
    jsonStr = jsonStr.trim()

    const analysis: DesignAnalysis = JSON.parse(jsonStr)
    return analysis
  } catch (error) {
    console.error('Failed to parse design analysis response:', text)
    throw new Error('Failed to parse design analysis. Please try again.')
  }
}

export async function analyzeSVG(svgContent: string): Promise<DesignAnalysis> {
  // For SVGs, we can analyze the content directly
  const model = GEMINI_MODELS.PRO

  const svgPrompt = `You are a design analysis AI. Analyze this SVG design and extract structured information about its layout, colors, typography, and sections.

SVG Content:
\`\`\`
${svgContent.slice(0, 50000)} // Limit SVG content to prevent token overflow
\`\`\`

${ANALYSIS_PROMPT}`

  const request: GeminiVisionRequest = {
    contents: [
      {
        role: 'user',
        parts: [{ text: svgPrompt }],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4096,
    },
  }

  const response = await geminiVisionRequest(model, request)
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text || ''

  try {
    let jsonStr = text.trim()
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7)
    }
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3)
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3)
    }
    jsonStr = jsonStr.trim()

    const analysis: DesignAnalysis = JSON.parse(jsonStr)
    return analysis
  } catch (error) {
    console.error('Failed to parse SVG analysis response:', text)
    throw new Error('Failed to parse SVG analysis. Please try again.')
  }
}
