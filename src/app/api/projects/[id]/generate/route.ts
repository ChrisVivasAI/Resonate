import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateProjectPlan } from '@/lib/ai/project-agent'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: projectId } = params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*, client:clients(id, name, company)')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Optionally fetch team members if IDs provided
    const body = await request.json().catch(() => ({}))
    const { team_member_ids } = body as { team_member_ids?: string[] }

    let teamMembersForPlan: Array<{ id: string; full_name: string; role: string }> | undefined
    if (team_member_ids && team_member_ids.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .in('id', team_member_ids)

      const { data: externalMembers } = await supabase
        .from('team_members')
        .select('id, full_name, role')
        .in('id', team_member_ids)

      teamMembersForPlan = [
        ...(profiles || []),
        ...(externalMembers || []),
      ]
    }

    // Generate project plan using AI
    const plan = await generateProjectPlan({
      name: project.name,
      description: project.description || '',
      client_name: project.client?.name,
      budget: project.budget,
      start_date: project.start_date,
      due_date: project.due_date,
      project_type: project.project_type,
    }, teamMembersForPlan)

    // Calculate due dates based on project timeline
    const startDate = project.start_date ? new Date(project.start_date) : new Date()
    const endDate = project.due_date ? new Date(project.due_date) : null

    const calculateDueDate = (estimatedDays: number, order: number): string => {
      const date = new Date(startDate)
      date.setDate(date.getDate() + estimatedDays)

      // Don't exceed project end date
      if (endDate && date > endDate) {
        return endDate.toISOString().split('T')[0]
      }

      return date.toISOString().split('T')[0]
    }

    // Validate priority values (database only accepts 'low', 'medium', 'high')
    const validPriorities = ['low', 'medium', 'high']

    // Build a name-to-ID lookup for resolving assigned_to_name from the AI plan
    const nameToIdMap = new Map<string, string>()
    if (teamMembersForPlan) {
      for (const m of teamMembersForPlan) {
        nameToIdMap.set(m.full_name.toLowerCase(), m.id)
      }
    }

    // Create tasks with correct column names matching schema
    const tasksToCreate = plan.tasks.map((task, index) => {
      let assigneeId: string | null = null
      if (task.assigned_to_name && nameToIdMap.size > 0) {
        assigneeId = nameToIdMap.get(task.assigned_to_name.toLowerCase()) || null
      }
      return {
        project_id: projectId,
        title: task.title,
        description: task.description || '',
        priority: validPriorities.includes(task.priority) ? task.priority : 'medium',
        status: 'todo', // Schema uses 'todo', not 'pending'
        due_date: calculateDueDate(task.estimated_days, task.sort_order || index + 1),
        sort_order: task.sort_order || index + 1, // Schema uses 'sort_order', not 'order'
        assignee_id: assigneeId,
      }
    })

    let tasksCreated = 0
    if (tasksToCreate.length > 0) {
      const { data: createdTasks, error: tasksError } = await supabase
        .from('tasks')
        .insert(tasksToCreate)
        .select()

      if (tasksError) {
        console.error('Error creating tasks:', tasksError)
        console.error('Tasks data:', JSON.stringify(tasksToCreate, null, 2))
      } else {
        tasksCreated = createdTasks?.length || 0
        console.log(`Successfully created ${tasksCreated} tasks`)
      }
    }

    // Create milestones - note: no status column in milestones table, due_date is required
    const milestonesToCreate = plan.milestones.map((milestone, index) => ({
      project_id: projectId,
      title: milestone.title,
      description: milestone.description || '',
      due_date: calculateDueDate(milestone.estimated_days, milestone.sort_order || index + 1),
      sort_order: milestone.sort_order || index + 1,
      payment_amount: milestone.payment_amount || null,
    }))

    let milestonesCreated = 0
    if (milestonesToCreate.length > 0) {
      const { data: createdMilestones, error: milestonesError } = await supabase
        .from('milestones')
        .insert(milestonesToCreate)
        .select()

      if (milestonesError) {
        console.error('Error creating milestones:', milestonesError)
        console.error('Milestones data:', JSON.stringify(milestonesToCreate, null, 2))
      } else {
        milestonesCreated = createdMilestones?.length || 0
        console.log(`Successfully created ${milestonesCreated} milestones`)
      }
    }

    // Create deliverables
    const validTypes = ['image', 'video', 'audio', 'document', 'text']
    const deliverablesToCreate = plan.deliverables.map((deliverable) => ({
      project_id: projectId,
      title: deliverable.title,
      description: deliverable.description || '',
      type: validTypes.includes(deliverable.type) ? deliverable.type : 'document',
      status: 'draft',
    }))

    let deliverablesCreated = 0
    if (deliverablesToCreate.length > 0) {
      const { data: createdDeliverables, error: deliverablesError } = await supabase
        .from('deliverables')
        .insert(deliverablesToCreate)
        .select()

      if (deliverablesError) {
        console.error('Error creating deliverables:', deliverablesError)
        console.error('Deliverables data:', JSON.stringify(deliverablesToCreate, null, 2))
      } else {
        deliverablesCreated = createdDeliverables?.length || 0
        console.log(`Successfully created ${deliverablesCreated} deliverables`)
      }
    }

    // Create labor entries based on recommended team roles (now with proper structure)
    let laborEntriesCreated = 0
    if (plan.recommended_team_roles && plan.recommended_team_roles.length > 0) {
      const laborEntries = plan.recommended_team_roles.map((roleInfo) => ({
        project_id: projectId,
        role: typeof roleInfo === 'string' ? roleInfo : roleInfo.role,
        hourly_rate: typeof roleInfo === 'object' ? roleInfo.hourly_rate || 75 : 75,
        estimated_hours: typeof roleInfo === 'object' ? roleInfo.estimated_hours || 20 : 20,
        actual_hours: 0,
      }))

      const { data: createdLabor, error: laborError } = await supabase
        .from('labor_entries')
        .insert(laborEntries)
        .select()

      if (laborError) {
        console.error('Error creating labor entries:', laborError)
        console.error('Labor data:', JSON.stringify(laborEntries, null, 2))
      } else {
        laborEntriesCreated = createdLabor?.length || 0
        console.log(`Successfully created ${laborEntriesCreated} labor entries`)
      }
    }

    // Log activity
    await supabase.from('activity_feed').insert({
      project_id: projectId,
      user_id: user.id,
      activity_type: 'project_generated',
      entity_type: 'project',
      entity_id: projectId,
      metadata: {
        tasks_created: tasksCreated,
        milestones_created: milestonesCreated,
        deliverables_created: deliverablesCreated,
        labor_entries_created: laborEntriesCreated,
      },
      is_client_visible: false,
    })

    console.log('Project plan generation complete:', {
      tasks: tasksCreated,
      milestones: milestonesCreated,
      deliverables: deliverablesCreated,
      labor_entries: laborEntriesCreated,
    })

    return NextResponse.json({
      success: true,
      plan,
      created: {
        tasks: tasksCreated,
        milestones: milestonesCreated,
        deliverables: deliverablesCreated,
        labor_entries: laborEntriesCreated,
      },
    })
  } catch (error) {
    console.error('Error generating project plan:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate project plan' },
      { status: 500 }
    )
  }
}
