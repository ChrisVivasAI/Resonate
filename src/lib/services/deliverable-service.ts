import { createClient } from '@/lib/supabase/server'
import type { Deliverable, DeliverableVersion, DeliverableStatus } from '@/types'

export interface CreateDeliverableParams {
  projectId: string
  title: string
  description?: string
  type: 'image' | 'video' | 'audio' | 'document' | 'text'
  fileUrl?: string
  thumbnailUrl?: string
  aiGenerationId?: string
  createdBy: string
}

export interface UpdateDeliverableParams {
  title?: string
  description?: string
  fileUrl?: string
  thumbnailUrl?: string
  status?: DeliverableStatus
  draft_url?: string
  draft_platform?: 'frame_io' | 'vimeo' | 'youtube' | 'dropbox' | 'other'
  final_url?: string
  final_platform?: 'google_drive' | 'dropbox' | 'wetransfer' | 's3' | 'other'
  notes?: string
}

export async function createDeliverable(params: CreateDeliverableParams): Promise<Deliverable> {
  const supabase = await createClient()
  const { projectId, title, description, type, fileUrl, thumbnailUrl, aiGenerationId, createdBy } = params

  const { data, error } = await supabase
    .from('deliverables')
    .insert({
      project_id: projectId,
      title,
      description,
      type,
      file_url: fileUrl,
      thumbnail_url: thumbnailUrl,
      ai_generation_id: aiGenerationId,
      created_by: createdBy,
      status: 'draft',
      current_version: 1,
    })
    .select('*, project:projects(*), creator:profiles!created_by(*)')
    .single()

  if (error) throw new Error(error.message)

  // Create initial version if file is provided
  if (fileUrl) {
    await supabase.from('deliverable_versions').insert({
      deliverable_id: data.id,
      version_number: 1,
      file_url: fileUrl,
      thumbnail_url: thumbnailUrl,
      notes: 'Initial version',
      created_by: createdBy,
    })
  }

  // Log activity
  await logDeliverableActivity(data.id, projectId, createdBy, 'deliverable_created', {
    title,
    type,
  })

  return data as Deliverable
}

export async function getDeliverable(id: string): Promise<Deliverable | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('deliverables')
    .select(`
      *,
      project:projects(*),
      creator:profiles!created_by(*),
      versions:deliverable_versions(*, creator:profiles!created_by(*)),
      comments(*, user:profiles(*))
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }

  return data as Deliverable
}

export async function getProjectDeliverables(projectId: string): Promise<Deliverable[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('deliverables')
    .select(`
      *,
      creator:profiles!created_by(*),
      versions:deliverable_versions(count)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as Deliverable[]
}

export async function updateDeliverable(
  id: string,
  params: UpdateDeliverableParams
): Promise<Deliverable> {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {}
  if (params.title !== undefined) updateData.title = params.title
  if (params.description !== undefined) updateData.description = params.description
  if (params.fileUrl !== undefined) updateData.file_url = params.fileUrl
  if (params.thumbnailUrl !== undefined) updateData.thumbnail_url = params.thumbnailUrl
  if (params.status !== undefined) updateData.status = params.status
  if (params.draft_url !== undefined) updateData.draft_url = params.draft_url
  if (params.draft_platform !== undefined) updateData.draft_platform = params.draft_platform
  if (params.final_url !== undefined) updateData.final_url = params.final_url
  if (params.final_platform !== undefined) updateData.final_platform = params.final_platform
  if (params.notes !== undefined) updateData.notes = params.notes

  const { data, error } = await supabase
    .from('deliverables')
    .update(updateData)
    .eq('id', id)
    .select('*, project:projects(*), creator:profiles!created_by(*)')
    .single()

  if (error) throw new Error(error.message)
  return data as Deliverable
}

export async function deleteDeliverable(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('deliverables')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function submitForReview(
  id: string,
  userId: string
): Promise<Deliverable> {
  const supabase = await createClient()

  // Get the deliverable first to get project_id
  const { data: deliverable } = await supabase
    .from('deliverables')
    .select('project_id, title')
    .eq('id', id)
    .single()

  if (!deliverable) throw new Error('Deliverable not found')

  const { data, error } = await supabase
    .from('deliverables')
    .update({ status: 'in_review' })
    .eq('id', id)
    .select('*, project:projects(*), creator:profiles!created_by(*)')
    .single()

  if (error) throw new Error(error.message)

  // Log activity
  await logDeliverableActivity(id, deliverable.project_id, userId, 'deliverable_submitted', {
    title: deliverable.title,
  })

  return data as Deliverable
}

export interface CreateVersionParams {
  deliverableId: string
  fileUrl: string
  thumbnailUrl?: string
  notes?: string
  createdBy: string
}

export async function createVersion(params: CreateVersionParams): Promise<DeliverableVersion> {
  const supabase = await createClient()
  const { deliverableId, fileUrl, thumbnailUrl, notes, createdBy } = params

  // Get current version number
  const { data: deliverable } = await supabase
    .from('deliverables')
    .select('current_version, project_id, title')
    .eq('id', deliverableId)
    .single()

  if (!deliverable) throw new Error('Deliverable not found')

  const newVersionNumber = deliverable.current_version + 1

  // Create new version
  const { data: version, error: versionError } = await supabase
    .from('deliverable_versions')
    .insert({
      deliverable_id: deliverableId,
      version_number: newVersionNumber,
      file_url: fileUrl,
      thumbnail_url: thumbnailUrl,
      notes,
      created_by: createdBy,
    })
    .select('*, creator:profiles!created_by(*)')
    .single()

  if (versionError) throw new Error(versionError.message)

  // Update deliverable with new version number and file
  const { error: updateError } = await supabase
    .from('deliverables')
    .update({
      current_version: newVersionNumber,
      file_url: fileUrl,
      thumbnail_url: thumbnailUrl,
      status: 'draft', // Reset to draft when new version is uploaded
    })
    .eq('id', deliverableId)

  if (updateError) throw new Error(updateError.message)

  // Log activity
  await logDeliverableActivity(deliverableId, deliverable.project_id, createdBy, 'deliverable_updated', {
    title: deliverable.title,
    version: newVersionNumber,
  })

  return version as DeliverableVersion
}

export async function getDeliverableVersions(deliverableId: string): Promise<DeliverableVersion[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('deliverable_versions')
    .select('*, creator:profiles!created_by(*)')
    .eq('deliverable_id', deliverableId)
    .order('version_number', { ascending: false })

  if (error) throw new Error(error.message)
  return data as DeliverableVersion[]
}

export interface ApproveDeliverableParams {
  deliverableId: string
  userId: string
  action: 'approved' | 'rejected' | 'requested_changes'
  feedback?: string
}

export async function approveDeliverable(params: ApproveDeliverableParams): Promise<Deliverable> {
  const supabase = await createClient()
  const { deliverableId, userId, action, feedback } = params

  // Get current deliverable info
  const { data: deliverable } = await supabase
    .from('deliverables')
    .select('current_version, project_id, title')
    .eq('id', deliverableId)
    .single()

  if (!deliverable) throw new Error('Deliverable not found')

  // Create approval record
  const { error: approvalError } = await supabase
    .from('approval_records')
    .insert({
      deliverable_id: deliverableId,
      user_id: userId,
      action,
      feedback,
      version_number: deliverable.current_version,
    })

  if (approvalError) throw new Error(approvalError.message)

  // Update deliverable status based on action
  const newStatus = action === 'approved' ? 'approved' : action === 'rejected' ? 'rejected' : 'draft'

  const { data: updated, error: updateError } = await supabase
    .from('deliverables')
    .update({ status: newStatus })
    .eq('id', deliverableId)
    .select('*, project:projects(*), creator:profiles!created_by(*)')
    .single()

  if (updateError) throw new Error(updateError.message)

  // Log activity
  const activityType = action === 'approved' ? 'deliverable_approved' : 'deliverable_rejected'
  await logDeliverableActivity(deliverableId, deliverable.project_id, userId, activityType, {
    title: deliverable.title,
    action,
    feedback,
  })

  return updated as Deliverable
}

export async function markAsFinal(id: string, userId: string): Promise<Deliverable> {
  const supabase = await createClient()

  // Verify the deliverable is approved first
  const { data: deliverable } = await supabase
    .from('deliverables')
    .select('status, project_id, title')
    .eq('id', id)
    .single()

  if (!deliverable) throw new Error('Deliverable not found')
  if (deliverable.status !== 'approved') throw new Error('Only approved deliverables can be marked as final')

  const { data, error } = await supabase
    .from('deliverables')
    .update({ status: 'final' })
    .eq('id', id)
    .select('*, project:projects(*), creator:profiles!created_by(*)')
    .single()

  if (error) throw new Error(error.message)

  // Log activity
  await logDeliverableActivity(id, deliverable.project_id, userId, 'deliverable_updated', {
    title: deliverable.title,
    status: 'final',
  })

  return data as Deliverable
}

async function logDeliverableActivity(
  entityId: string,
  projectId: string,
  userId: string,
  activityType: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient()

  await supabase.from('activity_feed').insert({
    project_id: projectId,
    user_id: userId,
    activity_type: activityType,
    entity_type: 'deliverable',
    entity_id: entityId,
    metadata,
    is_client_visible: true,
  })
}
