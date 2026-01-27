import { GEMINI_MODELS } from './gemini'
import type { DesignAnalysis, SectionAnalysis } from './design-analyzer'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta'

export interface GeneratedSection {
  id: string
  type: SectionAnalysis['type']
  name: string
  code: string // Static HTML with Tailwind classes
}

export interface GeneratedPage {
  fullCode: string
  sections: GeneratedSection[]
  cssVariables: Record<string, string>
  dependencies: string[]
}

async function geminiRequest(model: string, prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const response = await fetch(
    `${GEMINI_API_URL}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 8192,
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
    throw new Error(error.error?.message || `Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

function generateCSSVariables(analysis: DesignAnalysis): Record<string, string> {
  return {
    '--color-primary': analysis.colors.primary,
    '--color-secondary': analysis.colors.secondary,
    '--color-accent': analysis.colors.accent,
    '--color-background': analysis.colors.background,
    '--color-text': analysis.colors.text,
    '--font-heading': analysis.typography.headingFont || 'Inter',
    '--font-body': analysis.typography.bodyFont || 'Inter',
    '--radius': analysis.style.borderRadius === 'none' ? '0' :
               analysis.style.borderRadius === 'small' ? '0.25rem' :
               analysis.style.borderRadius === 'medium' ? '0.5rem' :
               analysis.style.borderRadius === 'large' ? '1rem' : '9999px',
  }
}

const SECTION_TEMPLATES: Record<SectionAnalysis['type'], string> = {
  hero: `A hero section with a large headline, subtext, and CTA buttons. Use gradient backgrounds or images.`,
  header: `A navigation header with logo, nav links, and optional CTA button.`,
  footer: `A footer with columns for links, contact info, and social icons.`,
  features: `A features section with cards or icons showing product/service features.`,
  testimonials: `A testimonials section with customer quotes, photos, and names.`,
  cta: `A call-to-action section with compelling text and buttons.`,
  contact: `A contact form with input fields, labels, and submit button.`,
  gallery: `An image gallery with grid layout.`,
  pricing: `A pricing table with plans, features, and buy buttons.`,
  stats: `A statistics section with large numbers and descriptions.`,
  text: `A text content section with headings and paragraphs.`,
  unknown: `A generic section based on the provided description.`,
}

export async function generateSection(
  section: SectionAnalysis,
  analysis: DesignAnalysis,
  index: number
): Promise<GeneratedSection> {
  const template = SECTION_TEMPLATES[section.type]

  const prompt = `Generate STATIC HTML with Tailwind CSS classes for a website section.

**IMPORTANT:** Output ONLY pure HTML. NO JavaScript, NO React, NO imports, NO JSX syntax, NO curly braces for variables, NO template literals. Just plain HTML with Tailwind classes.

**Section Type:** ${section.type}
**Section Description:** ${section.description}
**Template Guidance:** ${template}
**UI Elements Present:** ${section.elements.join(', ')}

**Design Specifications:**
- Theme: ${analysis.style.theme}
- Aesthetic: ${analysis.style.aesthetic}
- Border Radius: ${analysis.style.borderRadius}
- Shadow Intensity: ${analysis.style.shadowIntensity}
- Primary Color: ${analysis.colors.primary}
- Secondary Color: ${analysis.colors.secondary}
- Accent Color: ${analysis.colors.accent}
- Background Color: ${analysis.colors.background}
- Text Color: ${analysis.colors.text}
- Heading Font: ${analysis.typography.headingFont}
- Body Font: ${analysis.typography.bodyFont}

**Requirements:**
1. Output ONLY static HTML - no JavaScript, no React, no JSX
2. Use Tailwind CSS classes for all styling
3. Use arbitrary value syntax for custom colors: style="background-color: ${analysis.colors.primary}"
4. Make it responsive with Tailwind breakpoints (sm:, md:, lg:)
5. Use semantic HTML elements (section, header, nav, article, etc.)
6. Include realistic placeholder text/content
7. Use placeholder images from https://images.unsplash.com or https://placehold.co
8. The HTML should be self-contained and render correctly when injected into a page

**Example of correct output:**
<section class="py-20 px-6 bg-gray-900">
  <div class="max-w-6xl mx-auto text-center">
    <h1 class="text-4xl md:text-6xl font-bold text-white mb-6">Welcome to Our Platform</h1>
    <p class="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">Discover amazing features that will transform your workflow.</p>
    <a href="#" class="inline-block px-8 py-4 rounded-lg text-white font-semibold" style="background-color: ${analysis.colors.primary}">Get Started</a>
  </div>
</section>

Output ONLY the HTML code, nothing else. No explanations, no markdown code blocks.`

  const model = GEMINI_MODELS.PRO
  const code = await geminiRequest(model, prompt)

  // Clean up the code - remove any markdown or extra content
  let cleanCode = code.trim()

  // Remove markdown code blocks
  if (cleanCode.startsWith('```html')) {
    cleanCode = cleanCode.slice(7)
  } else if (cleanCode.startsWith('```')) {
    cleanCode = cleanCode.slice(3)
  }
  if (cleanCode.endsWith('```')) {
    cleanCode = cleanCode.slice(0, -3)
  }
  cleanCode = cleanCode.trim()

  // If it still contains React/JSX patterns, try to extract just the HTML
  if (cleanCode.includes('import ') || cleanCode.includes('export ') || cleanCode.includes('const ')) {
    // Try to extract HTML from JSX return statement
    const returnMatch = cleanCode.match(/return\s*\(\s*([\s\S]*?)\s*\);?\s*\}/)
    if (returnMatch) {
      cleanCode = returnMatch[1].trim()
    }
  }

  // Remove any className= and convert to class=
  cleanCode = cleanCode.replace(/className=/g, 'class=')

  // Remove any JSX expressions like {variable}
  cleanCode = cleanCode.replace(/\{[^}]+\}/g, '')

  return {
    id: `section-${index + 1}`,
    type: section.type,
    name: section.suggestedComponent || `${section.type.charAt(0).toUpperCase() + section.type.slice(1)} Section`,
    code: cleanCode,
  }
}

export async function generateFullPage(analysis: DesignAnalysis): Promise<GeneratedPage> {
  const cssVariables = generateCSSVariables(analysis)
  const sections: GeneratedSection[] = []

  // Generate each section
  for (let i = 0; i < analysis.layout.sections.length; i++) {
    const section = analysis.layout.sections[i]
    const generatedSection = await generateSection(section, analysis, i)
    sections.push(generatedSection)
  }

  // Combine all sections into full HTML page
  const fullCode = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated Page</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(analysis.typography.headingFont || 'Inter')}:wght@400;500;600;700&family=${encodeURIComponent(analysis.typography.bodyFont || 'Inter')}:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --color-primary: ${analysis.colors.primary};
      --color-secondary: ${analysis.colors.secondary};
      --color-accent: ${analysis.colors.accent};
      --color-background: ${analysis.colors.background};
      --color-text: ${analysis.colors.text};
    }
    body {
      font-family: '${analysis.typography.bodyFont || 'Inter'}', sans-serif;
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: '${analysis.typography.headingFont || 'Inter'}', sans-serif;
    }
  </style>
</head>
<body class="min-h-screen" style="background-color: ${analysis.colors.background}; color: ${analysis.colors.text};">
${sections.map(s => `  <!-- ${s.name} -->\n${s.code}`).join('\n\n')}
</body>
</html>`

  return {
    fullCode,
    sections,
    cssVariables,
    dependencies: [],
  }
}

export async function generateSingleComponent(
  description: string,
  analysis: DesignAnalysis
): Promise<string> {
  const prompt = `Generate STATIC HTML with Tailwind CSS classes.

**IMPORTANT:** Output ONLY pure HTML. NO JavaScript, NO React, NO imports, NO JSX. Just plain HTML with Tailwind classes.

**Component Description:** ${description}

**Design Specifications:**
- Theme: ${analysis.style.theme}
- Aesthetic: ${analysis.style.aesthetic}
- Border Radius: ${analysis.style.borderRadius}
- Shadow Intensity: ${analysis.style.shadowIntensity}
- Primary Color: ${analysis.colors.primary}
- Secondary Color: ${analysis.colors.secondary}
- Accent Color: ${analysis.colors.accent}
- Background Color: ${analysis.colors.background}
- Text Color: ${analysis.colors.text}
- Heading Font: ${analysis.typography.headingFont}
- Body Font: ${analysis.typography.bodyFont}

**Requirements:**
1. Output ONLY static HTML - no JavaScript, no React
2. Use Tailwind CSS classes for all styling
3. Use inline styles for custom colors: style="background-color: ${analysis.colors.primary}"
4. Make it responsive with Tailwind breakpoints
5. Use semantic HTML elements

Output ONLY the HTML code, nothing else.`

  const model = GEMINI_MODELS.PRO
  const code = await geminiRequest(model, prompt)

  // Clean up the code
  let cleanCode = code.trim()
  if (cleanCode.startsWith('```html')) {
    cleanCode = cleanCode.slice(7)
  } else if (cleanCode.startsWith('```')) {
    cleanCode = cleanCode.slice(3)
  }
  if (cleanCode.endsWith('```')) {
    cleanCode = cleanCode.slice(0, -3)
  }
  cleanCode = cleanCode.replace(/className=/g, 'class=')

  return cleanCode.trim()
}
