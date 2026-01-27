import { createClient } from '@/lib/supabase/client'
import type { Page } from '@/types'

const supabase = createClient()

export interface CreatePageInput {
  title: string
  slug: string
  description?: string
  projectId?: string
  clientId?: string
  generatedPageId?: string
  template?: string
  sections?: any[]
  settings?: Record<string, any>
}

export interface UpdatePageInput {
  title?: string
  slug?: string
  description?: string
  status?: 'draft' | 'published' | 'archived'
  sections?: any[]
  settings?: Record<string, any>
}

export async function createPage(input: CreatePageInput): Promise<Page> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('pages')
    .insert({
      user_id: user.id,
      title: input.title,
      slug: input.slug,
      description: input.description || null,
      project_id: input.projectId || null,
      client_id: input.clientId || null,
      generated_page_id: input.generatedPageId || null,
      template: input.template || 'custom',
      sections: input.sections || [],
      settings: input.settings || {},
      status: 'draft',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updatePage(id: string, input: UpdatePageInput): Promise<Page> {
  const updates: Record<string, any> = {}

  if (input.title !== undefined) updates.title = input.title
  if (input.slug !== undefined) updates.slug = input.slug
  if (input.description !== undefined) updates.description = input.description
  if (input.status !== undefined) {
    updates.status = input.status
    if (input.status === 'published') {
      updates.published_at = new Date().toISOString()
    }
  }
  if (input.sections !== undefined) updates.sections = input.sections
  if (input.settings !== undefined) updates.settings = input.settings

  const { data, error } = await supabase
    .from('pages')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deletePage(id: string): Promise<void> {
  const { error } = await supabase
    .from('pages')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getPage(id: string): Promise<Page | null> {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

export async function getPageBySlug(slug: string): Promise<Page | null> {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

export async function listPages(filters?: {
  status?: string
  projectId?: string
  clientId?: string
}): Promise<Page[]> {
  let query = supabase
    .from('pages')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.projectId) {
    query = query.eq('project_id', filters.projectId)
  }
  if (filters?.clientId) {
    query = query.eq('client_id', filters.clientId)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

export async function publishPage(id: string): Promise<Page> {
  return updatePage(id, { status: 'published' })
}

export async function archivePage(id: string): Promise<Page> {
  return updatePage(id, { status: 'archived' })
}

export async function duplicatePage(id: string): Promise<Page> {
  const original = await getPage(id)
  if (!original) throw new Error('Page not found')

  // Generate unique slug
  const baseSlug = original.slug.replace(/-copy(-\d+)?$/, '')
  let newSlug = `${baseSlug}-copy`
  let counter = 1

  while (await getPageBySlug(newSlug)) {
    newSlug = `${baseSlug}-copy-${counter}`
    counter++
  }

  return createPage({
    title: `${original.title} (Copy)`,
    slug: newSlug,
    description: original.description,
    projectId: original.project_id,
    clientId: original.client_id,
    template: original.template,
    sections: original.sections,
    settings: original.settings,
  })
}

export async function incrementPageViews(id: string): Promise<void> {
  const { error } = await supabase.rpc('increment_page_views', { page_id: id })
  if (error) {
    console.error('Failed to increment page views:', error)
  }
}

export async function incrementPageSubmissions(id: string): Promise<void> {
  const { error } = await supabase.rpc('increment_page_submissions', { page_id: id })
  if (error) {
    console.error('Failed to increment page submissions:', error)
  }
}
