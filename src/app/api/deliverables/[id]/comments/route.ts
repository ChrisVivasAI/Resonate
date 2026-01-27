import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: deliverableId } = params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAgencyUser = profile && ['admin', 'member'].includes(profile.role)

    // Fetch comments
    let query = supabase
      .from('comments')
      .select('*, user:profiles(*)')
      .eq('deliverable_id', deliverableId)
      .order('created_at', { ascending: true })

    // Filter out internal comments for client users
    if (!isAgencyUser) {
      query = query.eq('is_internal', false)
    }

    const { data: comments, error } = await query

    if (error) throw new Error(error.message)

    return NextResponse.json({ comments })
  } catch (error) {
    console.error('Get comments error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get comments' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: deliverableId } = params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAgencyUser = profile && ['admin', 'member'].includes(profile.role)

    const body = await request.json()
    const { content, parentId, isInternal } = body

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // Only agency users can create internal comments
    const commentIsInternal = isAgencyUser ? (isInternal || false) : false

    // Create comment
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        deliverable_id: deliverableId,
        user_id: user.id,
        parent_id: parentId || null,
        content: content.trim(),
        is_internal: commentIsInternal,
      })
      .select('*, user:profiles(*)')
      .single()

    if (error) throw new Error(error.message)

    // Log activity
    const { data: deliverable } = await supabase
      .from('deliverables')
      .select('project_id, title')
      .eq('id', deliverableId)
      .single()

    if (deliverable) {
      await supabase.from('activity_feed').insert({
        project_id: deliverable.project_id,
        user_id: user.id,
        activity_type: 'comment_added',
        entity_type: 'comment',
        entity_id: comment.id,
        metadata: {
          deliverable_id: deliverableId,
          deliverable_title: deliverable.title,
          is_internal: commentIsInternal,
        },
        is_client_visible: !commentIsInternal,
      })
    }

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error) {
    console.error('Create comment error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create comment' },
      { status: 500 }
    )
  }
}
