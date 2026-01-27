import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getDeliverable,
  updateDeliverable,
  deleteDeliverable,
} from '@/lib/services/deliverable-service'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const deliverable = await getDeliverable(id)

    if (!deliverable) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 })
    }

    // Check user has access
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, client_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // For client users, verify access and filter internal comments
    if (profile.role === 'client') {
      // Check they have access to this project
      const { data: clientRecord } = await supabase
        .from('clients')
        .select('id')
        .eq('profile_id', user.id)
        .single()

      if (!clientRecord || clientRecord.id !== deliverable.project?.client_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Only show if status allows
      if (!['in_review', 'approved', 'rejected', 'final'].includes(deliverable.status)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Filter out internal comments
      if (deliverable.comments) {
        deliverable.comments = deliverable.comments.filter(c => !c.is_internal)
      }
    }

    return NextResponse.json({ deliverable })
  } catch (error) {
    console.error('Get deliverable error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get deliverable' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin/member can update deliverables
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'member'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      title,
      description,
      fileUrl,
      thumbnailUrl,
      status,
      draft_url,
      draft_platform,
      final_url,
      final_platform,
      notes,
    } = body

    const deliverable = await updateDeliverable(id, {
      title,
      description,
      fileUrl,
      thumbnailUrl,
      status,
      draft_url,
      draft_platform,
      final_url,
      final_platform,
      notes,
    })

    return NextResponse.json({ deliverable })
  } catch (error) {
    console.error('Update deliverable error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update deliverable' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin/member can delete deliverables
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'member'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await deleteDeliverable(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete deliverable error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete deliverable' },
      { status: 500 }
    )
  }
}
