import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateProjectSuggestions } from '@/lib/ai/historical-analyzer'
import { generateProjectPlan } from '@/lib/ai/project-agent'

/**
 * POST /api/projects/generate-from-history
 *
 * Generate a new project with AI suggestions based on historical project data.
 * Analyzes past projects to suggest budget, timeline, team composition, and tasks.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      description,
      client_id,
      project_type,
      scope = 'medium',
      target_budget,
      target_completion_date,
      auto_create = false, // If true, creates the project immediately
    } = body as {
      name: string
      description: string
      client_id?: string
      project_type?: string
      scope?: 'small' | 'medium' | 'large'
      target_budget?: number
      target_completion_date?: string
      auto_create?: boolean
    }

    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
    }

    // Generate suggestions based on historical data
    const suggestions = await generateProjectSuggestions(user.id, {
      name,
      description,
      project_type,
      scope,
      target_budget,
    })

    // Also generate a detailed project plan using AI
    const projectPlan = await generateProjectPlan({
      name,
      description,
      client_name: client_id ? undefined : undefined, // Could fetch client name if needed
      budget: suggestions.suggested_budget.total,
      start_date: new Date().toISOString().split('T')[0],
      due_date: target_completion_date || calculateDueDate(suggestions.suggested_timeline.duration_days),
      project_type,
    })

    // If auto_create is true, create the project with all the generated data
    if (auto_create) {
      const startDate = new Date().toISOString().split('T')[0]
      const dueDate = target_completion_date || calculateDueDate(suggestions.suggested_timeline.duration_days)

      // Create the project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name,
          description,
          client_id,
          budget: suggestions.suggested_budget.total,
          start_date: startDate,
          due_date: dueDate,
          status: 'draft',
          priority: 'medium',
          progress: 0,
          tags: project_type ? [project_type] : [],
        })
        .select()
        .single()

      if (projectError) {
        throw projectError
      }

      // Create tasks
      if (projectPlan.tasks.length > 0) {
        const tasksToInsert = projectPlan.tasks.map((task, index) => ({
          project_id: project.id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: 'todo',
          order: task.sort_order || index,
          due_date: addDays(startDate, task.estimated_days),
        }))

        await supabase.from('tasks').insert(tasksToInsert)
      }

      // Create milestones
      if (projectPlan.milestones.length > 0) {
        const milestonesToInsert = projectPlan.milestones.map((milestone, index) => ({
          project_id: project.id,
          title: milestone.title,
          description: milestone.description,
          due_date: addDays(startDate, milestone.estimated_days),
          payment_amount: milestone.payment_amount || 0,
          sort_order: milestone.sort_order || index,
        }))

        await supabase.from('milestones').insert(milestonesToInsert)
      }

      // Create deliverables
      if (projectPlan.deliverables.length > 0) {
        const deliverablesToInsert = projectPlan.deliverables.map(deliverable => ({
          project_id: project.id,
          title: deliverable.title,
          description: deliverable.description,
          type: deliverable.type,
          status: 'draft',
        }))

        await supabase.from('deliverables').insert(deliverablesToInsert)
      }

      // Create labor entries from suggested team
      if (suggestions.suggested_team.length > 0) {
        const laborToInsert = suggestions.suggested_team.map(role => ({
          project_id: project.id,
          role: role.role,
          hourly_rate: role.hourly_rate,
          estimated_hours: role.estimated_hours,
          actual_hours: 0,
        }))

        await supabase.from('labor_entries').insert(laborToInsert)
      }

      // Log activity
      await supabase.from('activity_feed').insert({
        project_id: project.id,
        user_id: user.id,
        activity_type: 'project_created',
        entity_type: 'project',
        entity_id: project.id,
        metadata: {
          created_with: 'ai_generation',
          historical_projects_analyzed: suggestions.historical_reference.similar_projects.length,
          confidence: suggestions.suggested_budget.confidence,
        },
        is_client_visible: true,
      })

      return NextResponse.json({
        success: true,
        project,
        suggestions,
        project_plan: projectPlan,
        message: 'Project created successfully with AI-generated plan',
      })
    }

    // Return suggestions without creating the project
    return NextResponse.json({
      success: true,
      suggestions,
      project_plan: projectPlan,
      message: 'Project suggestions generated. Set auto_create=true to create the project.',
    })
  } catch (error) {
    console.error('Error generating project from history:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate project' },
      { status: 500 }
    )
  }
}

function calculateDueDate(durationDays: number): string {
  const date = new Date()
  date.setDate(date.getDate() + durationDays)
  return date.toISOString().split('T')[0]
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr)
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}
