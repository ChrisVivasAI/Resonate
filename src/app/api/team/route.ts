import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get login-based team members (profiles with role admin or member)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, avatar_url')
      .in('role', ['admin', 'member'])
      .order('full_name')

    if (profilesError) {
      throw new Error(profilesError.message)
    }

    // Get non-login team members from team_members table
    const { data: externalMembers, error: externalError } = await supabase
      .from('team_members')
      .select('*')
      .eq('is_active', true)
      .order('full_name')

    if (externalError) {
      throw new Error(externalError.message)
    }

    // Get labor entry aggregations
    const { data: laborEntries, error: laborError } = await supabase
      .from('labor_entries')
      .select('team_member_id, actual_cost, payment_status, project_id')

    if (laborError) {
      throw new Error(laborError.message)
    }

    const aggregateLabor = (memberId: string) => {
      const entries = laborEntries?.filter(l => l.team_member_id === memberId) || []
      const projectIds = new Set(entries.map(l => l.project_id))
      const totalOwed = entries
        .filter(l => l.payment_status !== 'paid')
        .reduce((sum, l) => sum + Number(l.actual_cost || 0), 0)
      const totalPaid = entries
        .filter(l => l.payment_status === 'paid')
        .reduce((sum, l) => sum + Number(l.actual_cost || 0), 0)
      return { laborCount: entries.length, activeProjects: projectIds.size, totalOwed, totalPaid, totalEarned: totalOwed + totalPaid }
    }

    // Combine both sources
    const members = [
      ...(profiles || []).map(profile => ({
        ...profile,
        source: 'profile' as const,
        ...aggregateLabor(profile.id),
      })),
      ...(externalMembers || []).map(ext => ({
        id: ext.id,
        full_name: ext.full_name,
        email: ext.email,
        role: ext.role || 'contractor',
        avatar_url: null,
        source: 'external' as const,
        ...aggregateLabor(ext.id),
      })),
    ]

    return NextResponse.json({ members })
  } catch (error) {
    console.error('Error fetching team members:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch team members' },
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
    const { full_name, email, phone, role, notes } = body

    if (!full_name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const { data: member, error } = await supabase
      .from('team_members')
      .insert({ full_name, email, phone, role: role || 'contractor', notes })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ member })
  } catch (error) {
    console.error('Error creating team member:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create team member' },
      { status: 500 }
    )
  }
}
