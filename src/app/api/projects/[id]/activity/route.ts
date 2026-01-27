import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAgencyUser = profile && ['admin', 'member'].includes(profile.role)

    // Get query params for pagination
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('activity_feed')
      .select('*, user:profiles(*)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter out internal activities for client users
    if (!isAgencyUser) {
      query = query.eq('is_client_visible', true)
    }

    const { data: activities, error } = await query

    if (error) throw new Error(error.message)

    // Get total count
    let countQuery = supabase
      .from('activity_feed')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)

    if (!isAgencyUser) {
      countQuery = countQuery.eq('is_client_visible', true)
    }

    const { count } = await countQuery

    return NextResponse.json({
      activities,
      total: count || 0,
      hasMore: (offset + limit) < (count || 0),
    })
  } catch (error) {
    console.error('Get activity error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get activity' },
      { status: 500 }
    )
  }
}
