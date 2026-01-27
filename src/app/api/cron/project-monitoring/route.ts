import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeProjectHealth, shouldAlertClient } from '@/lib/ai/project-health'
import type { HealthStatus } from '@/types'

// This endpoint is called by GitHub Actions cron job
// It should be protected with a secret token

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const now = new Date()

    // Find projects due for monitoring
    const { data: projectsToCheck, error: queryError } = await supabase
      .from('project_monitoring_settings')
      .select(`
        *,
        project:projects(*)
      `)
      .eq('monitoring_enabled', true)
      .lte('next_check_at', now.toISOString())

    if (queryError) {
      throw new Error(queryError.message)
    }

    if (!projectsToCheck || projectsToCheck.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No projects due for monitoring',
        checked: 0,
      })
    }

    const results: {
      projectId: string
      projectName: string
      score: number
      status: string
      success: boolean
      error?: string
    }[] = []

    for (const setting of projectsToCheck) {
      const project = setting.project

      if (!project || project.status === 'completed' || project.status === 'cancelled') {
        // Skip completed/cancelled projects
        continue
      }

      try {
        // Fetch tasks
        const { data: tasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('project_id', project.id)

        // Fetch milestones
        const { data: milestones } = await supabase
          .from('milestones')
          .select('*')
          .eq('project_id', project.id)

        // Get previous health report
        const { data: previousReport } = await supabase
          .from('project_health_reports')
          .select('status')
          .eq('project_id', project.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        const previousStatus = previousReport?.status as HealthStatus | null

        // Run analysis
        const healthReport = await analyzeProjectHealth({
          project,
          tasks: tasks || [],
          milestones: milestones || [],
        })

        // Save health report
        const { data: savedReport } = await supabase
          .from('project_health_reports')
          .insert({
            project_id: project.id,
            health_score: healthReport.score,
            status: healthReport.status,
            summary: healthReport.summary,
            analysis: healthReport.analysis,
            recommendations: healthReport.recommendations,
          })
          .select()
          .single()

        // Calculate next check time
        let nextCheckAt = new Date()
        switch (setting.frequency) {
          case 'daily':
            nextCheckAt.setDate(nextCheckAt.getDate() + 1)
            break
          case 'weekly':
            nextCheckAt.setDate(nextCheckAt.getDate() + 7)
            break
          case 'monthly':
            nextCheckAt.setMonth(nextCheckAt.getMonth() + 1)
            break
        }
        nextCheckAt.setHours(9, 0, 0, 0)

        // Update monitoring settings
        await supabase
          .from('project_monitoring_settings')
          .update({
            last_check_at: now.toISOString(),
            next_check_at: nextCheckAt.toISOString(),
          })
          .eq('project_id', project.id)

        // Log activity (not visible to client by default)
        await supabase.from('activity_feed').insert({
          project_id: project.id,
          activity_type: 'health_check_completed',
          entity_type: 'health_report',
          entity_id: savedReport?.id,
          metadata: {
            score: healthReport.score,
            status: healthReport.status,
            automated: true,
          },
          is_client_visible: false,
        })

        // Create notifications based on health status
        // Notify project owner if score drops below threshold
        if (healthReport.score < setting.alert_threshold) {
          // Find project owner (first admin user for now, or use assigned_to if available)
          const { data: admins } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'admin')
            .limit(1)

          if (admins && admins.length > 0) {
            await supabase.from('notifications').insert({
              user_id: admins[0].id,
              type: 'health_alert',
              title: 'Project Health Alert',
              message: `"${project.name}" health score dropped to ${healthReport.score}. Status: ${healthReport.status}`,
              link: `/projects/${project.id}`,
              metadata: {
                project_id: project.id,
                score: healthReport.score,
                status: healthReport.status,
                threshold: setting.alert_threshold,
              },
            })
          }
        }

        // Check if we should alert the client
        const clientAlert = shouldAlertClient(previousStatus, healthReport.status, healthReport.analysis)

        if (clientAlert.shouldAlert && project.client_id) {
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
              message: `${project.name}: ${clientAlert.reason}`,
              link: `/portal/projects/${project.id}`,
              metadata: {
                project_id: project.id,
                project_name: project.name,
              },
            })
          }
        }

        results.push({
          projectId: project.id,
          projectName: project.name,
          score: healthReport.score,
          status: healthReport.status,
          success: true,
        })
      } catch (projectError) {
        console.error(`Error monitoring project ${project.id}:`, projectError)
        results.push({
          projectId: project.id,
          projectName: project.name,
          score: 0,
          status: 'error',
          success: false,
          error: projectError instanceof Error ? projectError.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      checked: results.length,
      results,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('Cron monitoring error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Monitoring cron failed' },
      { status: 500 }
    )
  }
}

// Also support GET for manual testing (with auth)
export async function GET(request: NextRequest) {
  // For debugging - show next scheduled checks
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: settings } = await supabase
      .from('project_monitoring_settings')
      .select(`
        *,
        project:projects(id, name, status)
      `)
      .eq('monitoring_enabled', true)
      .order('next_check_at', { ascending: true })

    return NextResponse.json({
      scheduled: settings || [],
      serverTime: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get schedule' },
      { status: 500 }
    )
  }
}
