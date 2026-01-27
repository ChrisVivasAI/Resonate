import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { suggestTaskBreakdown } from '@/lib/ai/project-health'

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

    // Only admin/member can request suggestions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'member'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('name, description')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Fetch existing tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('title')
      .eq('project_id', projectId)

    const existingTaskTitles = tasks?.map(t => t.title) || []

    // Generate suggestions
    const suggestions = await suggestTaskBreakdown(
      project.name,
      project.description || '',
      existingTaskTitles
    )

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Task suggestion error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate task suggestions' },
      { status: 500 }
    )
  }
}
