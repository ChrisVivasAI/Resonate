import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: activities, error } = await supabase
      .from('lead_activities')
      .select(`
        *,
        user:profiles(id, full_name, email, avatar_url)
      `)
      .eq('lead_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ activities })
  } catch (error) {
    console.error('Error fetching lead activities:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch activities' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, content, metadata = {} } = body

    if (!type || !content) {
      return NextResponse.json(
        { error: 'Type and content are required' },
        { status: 400 }
      )
    }

    const validTypes = ['note', 'email', 'call', 'meeting', 'ai_assist', 'status_change']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid activity type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Update last_contacted_at if this is an outreach activity
    if (['email', 'call', 'meeting'].includes(type)) {
      await supabase
        .from('leads')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', id)
    }

    const { data: activity, error } = await supabase
      .from('lead_activities')
      .insert({
        lead_id: id,
        user_id: user.id,
        type,
        content,
        metadata,
      })
      .select(`
        *,
        user:profiles(id, full_name, email, avatar_url)
      `)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ activity }, { status: 201 })
  } catch (error) {
    console.error('Error creating lead activity:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create activity' },
      { status: 500 }
    )
  }
}
