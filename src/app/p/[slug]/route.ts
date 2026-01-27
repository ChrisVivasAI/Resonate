import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import type { Page, PageSection, PageSettings } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = await createClient()

  // Fetch the page by slug
  const { data: page, error } = await supabase
    .from('pages')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !page) {
    return new Response('Page not found', { status: 404 })
  }

  const pageData = page as Page
  const settings = (pageData.settings || {}) as PageSettings
  const sections = (pageData.sections || []) as PageSection[]

  // Build the full HTML page
  const htmlContent = buildFullHTML(pageData, sections, settings)

  return new Response(htmlContent, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}

function buildFullHTML(page: Page, sections: PageSection[], settings: PageSettings): string {
  const primaryColor = settings.primary_color || '#ed741c'
  const secondaryColor = settings.secondary_color || '#4f6da7'
  const fontFamily = settings.font_family || 'Inter'

  const sectionsHTML = sections
    .filter((s) => s.is_visible !== false)
    .sort((a, b) => a.order - b.order)
    .map((section) => renderSection(section, settings))
    .join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(page.title)}</title>
  ${page.description ? `<meta name="description" content="${escapeHtml(page.description)}">` : ''}
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --color-primary: ${primaryColor};
      --color-secondary: ${secondaryColor};
    }
    body {
      font-family: '${fontFamily}', sans-serif;
      margin: 0;
      padding: 0;
    }
    ${settings.custom_css || ''}
  </style>
</head>
<body class="min-h-screen bg-white">
  ${settings.show_header !== false ? `
  <header class="bg-slate-900 text-white py-4 px-6">
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <h1 class="text-xl font-bold">${escapeHtml(page.title)}</h1>
      <nav class="hidden md:flex items-center gap-6">
        <a href="#" class="text-gray-300 hover:text-white transition-colors">Home</a>
        <a href="#" class="text-gray-300 hover:text-white transition-colors">About</a>
        <a href="#" class="text-gray-300 hover:text-white transition-colors">Contact</a>
      </nav>
    </div>
  </header>` : ''}

  <main>
    ${sectionsHTML || `
    <div class="min-h-[60vh] flex items-center justify-center bg-gray-50">
      <p class="text-gray-500">This page has no content yet.</p>
    </div>`}
  </main>

  ${settings.show_footer !== false ? `
  <footer class="bg-slate-900 text-white py-12 px-6">
    <div class="max-w-6xl mx-auto text-center">
      <p class="text-gray-400 text-sm">&copy; ${new Date().getFullYear()} ${escapeHtml(page.title)}. All rights reserved.</p>
    </div>
  </footer>` : ''}

  ${settings.custom_js ? `<script>${settings.custom_js}</script>` : ''}
</body>
</html>`
}

function renderSection(section: PageSection, settings: PageSettings): string {
  const primaryColor = settings.primary_color || '#ed741c'

  // For custom sections (AI-generated), render the code directly
  if (section.type === 'custom' && section.content.code) {
    return `<!-- ${escapeHtml(section.content.name as string || 'Custom Section')} -->
${section.content.code as string}`
  }

  // Built-in section types
  switch (section.type) {
    case 'hero':
      return `<section class="py-24 px-6 text-center" style="background-color: #1a2337;">
  <div class="max-w-4xl mx-auto">
    <h1 class="text-4xl md:text-5xl font-bold text-white mb-6">
      ${escapeHtml(section.content.headline as string || 'Welcome')}
    </h1>
    <p class="text-xl text-gray-300 mb-8">
      ${escapeHtml(section.content.subheadline as string || '')}
    </p>
    ${section.content.cta_text ? `
    <a href="${escapeHtml(section.content.cta_url as string || '#')}"
       class="inline-block px-8 py-4 rounded-lg text-white font-semibold text-lg transition-transform hover:scale-105"
       style="background-color: ${primaryColor}">
      ${escapeHtml(section.content.cta_text as string)}
    </a>` : ''}
  </div>
</section>`

    case 'features':
      const features = (section.content.features as { title: string; description: string }[]) || []
      return `<section class="py-20 px-6 bg-gray-50">
  <div class="max-w-6xl mx-auto">
    <h2 class="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
      ${escapeHtml(section.content.headline as string || 'Features')}
    </h2>
    <div class="grid md:grid-cols-3 gap-8">
      ${features.map(f => `
      <div class="bg-white p-6 rounded-xl shadow-sm">
        <h3 class="text-xl font-semibold text-gray-900 mb-3">${escapeHtml(f.title)}</h3>
        <p class="text-gray-600">${escapeHtml(f.description)}</p>
      </div>`).join('')}
    </div>
  </div>
</section>`

    case 'text':
      return `<section class="py-16 px-6 bg-white">
  <div class="max-w-3xl mx-auto prose prose-lg">
    ${section.content.content as string || ''}
  </div>
</section>`

    case 'contact':
      const fields = (section.content.fields as { name: string; label: string; type: string; required?: boolean }[]) || []
      return `<section class="py-20 px-6 bg-gray-50">
  <div class="max-w-xl mx-auto">
    <h2 class="text-3xl font-bold text-gray-900 text-center mb-8">
      ${escapeHtml(section.content.headline as string || 'Contact Us')}
    </h2>
    <form class="space-y-6">
      ${fields.map(f => `
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          ${escapeHtml(f.label)}${f.required ? '<span class="text-red-500 ml-1">*</span>' : ''}
        </label>
        ${f.type === 'textarea'
          ? `<textarea name="${escapeHtml(f.name)}" ${f.required ? 'required' : ''} rows="4" class="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>`
          : `<input type="${escapeHtml(f.type)}" name="${escapeHtml(f.name)}" ${f.required ? 'required' : ''} class="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">`}
      </div>`).join('')}
      <button type="submit" class="w-full py-4 rounded-lg text-white font-semibold text-lg" style="background-color: ${primaryColor}">
        ${escapeHtml(section.content.submit_text as string || 'Submit')}
      </button>
    </form>
  </div>
</section>`

    case 'cta':
      return `<section class="py-20 px-6 text-center" style="background-color: ${primaryColor}">
  <div class="max-w-3xl mx-auto">
    <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">
      ${escapeHtml(section.content.headline as string || 'Ready to get started?')}
    </h2>
    <p class="text-xl text-white/80 mb-8">
      ${escapeHtml(section.content.description as string || '')}
    </p>
    ${section.content.cta_text ? `
    <a href="${escapeHtml(section.content.cta_url as string || '#')}"
       class="inline-block px-8 py-4 rounded-lg bg-white text-gray-900 font-semibold text-lg transition-transform hover:scale-105">
      ${escapeHtml(section.content.cta_text as string)}
    </a>` : ''}
  </div>
</section>`

    case 'testimonials':
      const testimonials = (section.content.testimonials as { name: string; role: string; company: string; quote: string }[]) || []
      return `<section class="py-20 px-6 bg-white">
  <div class="max-w-6xl mx-auto">
    <h2 class="text-3xl font-bold text-gray-900 text-center mb-12">What Our Clients Say</h2>
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      ${testimonials.map(t => `
      <div class="bg-gray-50 p-6 rounded-xl">
        <p class="text-gray-700 mb-4 italic">"${escapeHtml(t.quote)}"</p>
        <div>
          <p class="font-semibold text-gray-900">${escapeHtml(t.name)}</p>
          <p class="text-sm text-gray-500">${escapeHtml(t.role)}, ${escapeHtml(t.company)}</p>
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>`

    case 'gallery':
      const images = (section.content.images as string[]) || []
      return `<section class="py-20 px-6 bg-gray-50">
  <div class="max-w-6xl mx-auto">
    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
      ${images.map((img, i) => `
      <div class="aspect-square rounded-lg overflow-hidden">
        <img src="${escapeHtml(img)}" alt="Gallery image ${i + 1}" class="w-full h-full object-cover hover:scale-105 transition-transform duration-300">
      </div>`).join('')}
    </div>
  </div>
</section>`

    default:
      return `<section class="py-16 px-6 bg-gray-100 text-center">
  <p class="text-gray-500">Section type: ${escapeHtml(section.type)}</p>
</section>`
  }
}

function escapeHtml(text: string): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
