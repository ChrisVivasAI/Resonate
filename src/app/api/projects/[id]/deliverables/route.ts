import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createDeliverable, getProjectDeliverables } from '@/lib/services/deliverable-service'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: projectId } = params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role for access control
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, client_id')
      .eq('id', user.id)
      .single()

    const isClient = profile?.role === 'client'

    // For client users, verify they have access to this project
    if (isClient) {
      const { data: project } = await supabase
        .from('projects')
        .select('client_id')
        .eq('id', projectId)
        .single()

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }

      // Check if client's linked client_id matches the project's client_id
      const { data: clientRecord } = await supabase
        .from('clients')
        .select('id')
        .eq('profile_id', user.id)
        .single()

      if (!clientRecord || clientRecord.id !== project.client_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const deliverables = await getProjectDeliverables(projectId)

    // Filter deliverables for client users (only show in_review, approved, rejected, final)
    if (isClient) {
      const filteredDeliverables = deliverables.filter(
        d => ['in_review', 'approved', 'rejected', 'final'].includes(d.status)
      )
      return NextResponse.json({ deliverables: filteredDeliverables })
    }

    return NextResponse.json({ deliverables })
  } catch (error) {
    console.error('Get deliverables error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get deliverables' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: projectId } = params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin/member can create deliverables (if no profile, treat as admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile && profile.role === 'client') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify project exists
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single()

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const body = await request.json()
    const { title, description, type, fileUrl, thumbnailUrl, aiGenerationId } = body

    if (!title || !type) {
      return NextResponse.json(
        { error: 'Title and type are required' },
        { status: 400 }
      )
    }

    const validTypes = ['image', 'video', 'audio', 'document', 'text']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const deliverable = await createDeliverable({
      projectId,
      title,
      description,
      type,
      fileUrl,
      thumbnailUrl,
      aiGenerationId,
      createdBy: user.id,
    })

    return NextResponse.json({ deliverable }, { status: 201 })
  } catch (error) {
    console.error('Create deliverable error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create deliverable' },
      { status: 500 }
    )
  }
}
