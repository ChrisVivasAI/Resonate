import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: memberId } = params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Try profiles first, then team_members
    let profile = null
    let source: 'profile' | 'external' = 'profile'

    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, avatar_url')
      .eq('id', memberId)
      .single()

    if (profileData) {
      profile = profileData
    } else {
      const { data: externalData, error: extError } = await supabase
        .from('team_members')
        .select('id, full_name, email, role')
        .eq('id', memberId)
        .single()

      if (extError) {
        throw new Error('Team member not found')
      }
      profile = { ...externalData, avatar_url: null }
      source = 'external'
    }

    // Get all labor entries for this team member with project info
    const { data: laborEntries, error: laborError } = await supabase
      .from('labor_entries')
      .select('*, project:projects(id, name)')
      .eq('team_member_id', memberId)
      .order('created_at', { ascending: false })

    if (laborError) {
      throw new Error(laborError.message)
    }

    // Get tasks assigned to this team member
    const { data: assignedTasks } = await supabase
      .from('tasks')
      .select('*, project:projects(id, name, status)')
      .eq('assignee_id', memberId)
      .order('created_at', { ascending: false })

    // Calculate totals
    const entries = laborEntries || []
    const projectIds = new Set(entries.map(l => l.project_id))
    const totalEarned = entries.reduce((sum, l) => sum + Number(l.actual_cost || 0), 0)
    const totalOwed = entries
      .filter(l => l.payment_status !== 'paid')
      .reduce((sum, l) => sum + Number(l.actual_cost || 0), 0)
    const totalPaid = entries
      .filter(l => l.payment_status === 'paid')
      .reduce((sum, l) => sum + Number(l.actual_cost || 0), 0)

    return NextResponse.json({
      profile,
      source,
      laborEntries: entries,
      assignedTasks: assignedTasks || [],
      totals: {
        totalEarned,
        totalOwed,
        totalPaid,
        activeProjects: projectIds.size,
        entryCount: entries.length,
      },
    })
  } catch (error) {
    console.error('Error fetching team member:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch team member' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: memberId } = params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const allowedFields = ['full_name', 'email', 'phone', 'role', 'notes', 'is_active']
    const updates: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (key in body) updates[key] = body[key]
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: member, error } = await supabase
      .from('team_members')
      .update(updates)
      .eq('id', memberId)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ member })
  } catch (error) {
    console.error('Error updating team member:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update team member' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: memberId } = params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId)

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting team member:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete team member' },
      { status: 500 }
    )
  }
}
