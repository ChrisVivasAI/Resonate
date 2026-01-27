import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateStatusSummary } from '@/lib/ai/project-health'

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

    // Fetch project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Fetch tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)

    // Fetch milestones
    const { data: milestones } = await supabase
      .from('milestones')
      .select('*')
      .eq('project_id', projectId)

    // Generate summary
    const summary = await generateStatusSummary({
      project,
      tasks: tasks || [],
      milestones: milestones || [],
    })

    return NextResponse.json({ summary })
  } catch (error) {
    console.error('Status summary error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate status summary' },
      { status: 500 }
    )
  }
}
