import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')

    let query = supabase
      .from('labor_entries')
      .select('*, team_member:profiles(id, full_name, email), project:projects(id, name)')
      .order('created_at', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data: laborEntries, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ laborEntries })
  } catch (error) {
    console.error('Error fetching labor entries:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch labor entries' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      project_id,
      team_member_id,
      team_member_name,
      role,
      hourly_rate,
      estimated_hours,
      actual_hours,
      notes,
    } = body

    if (!project_id || !role || hourly_rate === undefined) {
      return NextResponse.json(
        { error: 'Project ID, role, and hourly rate are required' },
        { status: 400 }
      )
    }

    const { data: laborEntry, error } = await supabase
      .from('labor_entries')
      .insert({
        project_id,
        team_member_id,
        team_member_name,
        role,
        hourly_rate,
        estimated_hours: estimated_hours || 0,
        actual_hours: actual_hours || 0,
        notes,
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ laborEntry })
  } catch (error) {
    console.error('Error creating labor entry:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create labor entry' },
      { status: 500 }
    )
  }
}
