import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeProjectHealth, shouldAlertClient } from '@/lib/ai/project-health'
import type { HealthStatus } from '@/types'

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

    // Only admin/member can run analysis
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'member'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch project with related data
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

    // Get previous health report for comparison
    const { data: previousReport } = await supabase
      .from('project_health_reports')
      .select('status')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const previousStatus = previousReport?.status as HealthStatus | null

    // Run AI analysis
    const healthReport = await analyzeProjectHealth({
      project,
      tasks: tasks || [],
      milestones: milestones || [],
    })

    // Save health report
    const { data: savedReport, error: saveError } = await supabase
      .from('project_health_reports')
      .insert({
        project_id: projectId,
        health_score: healthReport.score,
        status: healthReport.status,
        summary: healthReport.summary,
        analysis: healthReport.analysis,
        recommendations: healthReport.recommendations,
      })
      .select()
      .single()

    if (saveError) {
      console.error('Failed to save health report:', saveError)
    }

    // Update monitoring settings with last check time
    await supabase
      .from('project_monitoring_settings')
      .update({ last_check_at: new Date().toISOString() })
      .eq('project_id', projectId)

    // Create notification for project owner
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'health_check_completed',
      title: 'Health Check Complete',
      message: `Project "${project.name}" health: ${healthReport.status} (${healthReport.score}/100)`,
      link: `/projects/${projectId}`,
      metadata: {
        project_id: projectId,
        score: healthReport.score,
        status: healthReport.status,
      },
    })

    // Log activity
    await supabase.from('activity_feed').insert({
      project_id: projectId,
      user_id: user.id,
      activity_type: 'health_check_completed',
      entity_type: 'health_report',
      entity_id: savedReport?.id,
      metadata: {
        score: healthReport.score,
        status: healthReport.status,
      },
      is_client_visible: false,
    })

    // Check if we should alert the client
    const clientAlert = shouldAlertClient(previousStatus, healthReport.status, healthReport.analysis)

    if (clientAlert.shouldAlert && project.client_id) {
      // Get client's profile_id
      const { data: client } = await supabase
        .from('clients')
        .select('profile_id')
        .eq('id', project.client_id)
        .single()

      if (client?.profile_id) {
        await supabase.from('notifications').insert({
          user_id: client.profile_id,
          type: 'project_update',
          title: 'Project Update',
          message: clientAlert.reason,
          link: `/portal/projects/${projectId}`,
          metadata: {
            project_id: projectId,
            project_name: project.name,
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      report: healthReport,
      reportId: savedReport?.id,
    })
  } catch (error) {
    console.error('Health analysis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze project health' },
      { status: 500 }
    )
  }
}
