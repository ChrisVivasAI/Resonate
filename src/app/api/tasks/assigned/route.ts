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
    const memberId = searchParams.get('member_id') || user.id

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*, project:projects(id, name, status)')
      .eq('assignee_id', memberId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    return NextResponse.json({ tasks: tasks || [] })
  } catch (error) {
    console.error('Error fetching assigned tasks:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch assigned tasks' },
      { status: 500 }
    )
  }
}
