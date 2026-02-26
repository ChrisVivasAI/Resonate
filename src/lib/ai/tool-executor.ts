import { createClient } from '@/lib/supabase/server'
import type { ToolCall, ToolResult, ProjectContext } from './project-agent'
import { createTaskAssignedNotification } from '@/lib/notifications/create-task-notification'

// =====================================================
// TOOL EXECUTOR
// =====================================================

export async function executeToolCall(
  projectId: string,
  toolCall: ToolCall,
  context: ProjectContext
): Promise<ToolResult> {
  const supabase = await createClient()

  try {
    switch (toolCall.name) {
      // =============== TASK MANAGEMENT ===============
      case 'create_task': {
        const { title, description, priority, due_date, assigned_to } = toolCall.args as {
          title: string
          description?: string
          priority?: string
          due_date?: string
          assigned_to?: string
        }

        const { data, error } = await supabase
          .from('tasks')
          .insert({
            project_id: projectId,
            title,
            description,
            priority: priority || 'medium',
            due_date,
            status: 'todo', // Database uses 'todo' not 'pending'
            assignee_id: assigned_to || null,
          })
          .select()
          .single()

        if (error) throw error

        if (assigned_to) {
          await createTaskAssignedNotification(
            supabase,
            assigned_to,
            { id: data.id, title, project_id: projectId },
            'AI Agent'
          )
        }

        return { call_id: toolCall.id, result: { success: true, task: data, message: `Created task: ${title}` } }
      }

      case 'update_task': {
        const { task_id, assigned_to, ...updates } = toolCall.args as {
          task_id: string
          title?: string
          description?: string
          status?: string
          priority?: string
          due_date?: string
          assigned_to?: string
        }

        const dbUpdates: Record<string, unknown> = { ...updates }
        if (assigned_to !== undefined) {
          dbUpdates.assignee_id = assigned_to || null
        }

        const { data, error } = await supabase
          .from('tasks')
          .update(dbUpdates)
          .eq('id', task_id)
          .eq('project_id', projectId)
          .select()
          .single()

        if (error) throw error

        if (assigned_to) {
          await createTaskAssignedNotification(
            supabase,
            assigned_to,
            { id: task_id, title: data.title, project_id: projectId },
            'AI Agent'
          )
        }

        return { call_id: toolCall.id, result: { success: true, task: data, message: `Updated task: ${data.title}` } }
      }

      case 'delete_task': {
        const { task_id } = toolCall.args as { task_id: string }

        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', task_id)
          .eq('project_id', projectId)

        if (error) throw error
        return { call_id: toolCall.id, result: { success: true, message: 'Task deleted successfully' } }
      }

      // =============== MILESTONE MANAGEMENT ===============
      case 'create_milestone': {
        const { title, description, due_date, payment_amount } = toolCall.args as {
          title: string
          description?: string
          due_date?: string
          payment_amount?: number
        }

        const { data, error } = await supabase
          .from('milestones')
          .insert({
            project_id: projectId,
            title,
            description,
            due_date: due_date || new Date().toISOString().split('T')[0],
            payment_amount,
            // Note: Milestones don't have a status column, they use completed_at to track completion
          })
          .select()
          .single()

        if (error) throw error
        return { call_id: toolCall.id, result: { success: true, milestone: data, message: `Created milestone: ${title}` } }
      }

      case 'update_milestone': {
        const { milestone_id, completed, ...updates } = toolCall.args as {
          milestone_id: string
          title?: string
          description?: string
          completed?: boolean
          due_date?: string
          payment_amount?: number
        }

        // Handle completion status via completed_at
        const updateData: Record<string, unknown> = { ...updates }
        if (completed !== undefined) {
          updateData.completed_at = completed ? new Date().toISOString() : null
        }

        const { data, error } = await supabase
          .from('milestones')
          .update(updateData)
          .eq('id', milestone_id)
          .eq('project_id', projectId)
          .select()
          .single()

        if (error) throw error
        return { call_id: toolCall.id, result: { success: true, milestone: data, message: `Updated milestone: ${data.title}` } }
      }

      case 'delete_milestone': {
        const { milestone_id } = toolCall.args as { milestone_id: string }

        const { error } = await supabase
          .from('milestones')
          .delete()
          .eq('id', milestone_id)
          .eq('project_id', projectId)

        if (error) throw error
        return { call_id: toolCall.id, result: { success: true, message: 'Milestone deleted successfully' } }
      }

      // =============== DELIVERABLE MANAGEMENT ===============
      case 'create_deliverable': {
        const { title, description, type } = toolCall.args as {
          title: string
          description?: string
          type: string
        }

        const { data, error } = await supabase
          .from('deliverables')
          .insert({
            project_id: projectId,
            title,
            description,
            type,
            status: 'draft',
          })
          .select()
          .single()

        if (error) throw error
        return { call_id: toolCall.id, result: { success: true, deliverable: data, message: `Created deliverable: ${title}` } }
      }

      case 'update_deliverable_status': {
        const { deliverable_id, status } = toolCall.args as {
          deliverable_id: string
          status: string
        }

        const { data, error } = await supabase
          .from('deliverables')
          .update({ status })
          .eq('id', deliverable_id)
          .eq('project_id', projectId)
          .select()
          .single()

        if (error) throw error
        return { call_id: toolCall.id, result: { success: true, deliverable: data, message: `Updated deliverable status to: ${status}` } }
      }

      // =============== FINANCIAL MANAGEMENT ===============
      case 'add_expense': {
        const { category, description, amount, vendor, is_billable, markup_percent } = toolCall.args as {
          category: string
          description?: string
          amount: number
          vendor?: string
          is_billable?: boolean
          markup_percent?: number
        }

        const { data, error } = await supabase
          .from('expenses')
          .insert({
            project_id: projectId,
            category,
            description,
            cost_pre_tax: amount,
            vendor_or_person: vendor,
            is_billable: is_billable ?? true,
            markup_percent: markup_percent || 0,
          })
          .select()
          .single()

        if (error) throw error
        return { call_id: toolCall.id, result: { success: true, expense: data, message: `Added expense: $${amount} for ${category}` } }
      }

      case 'add_labor_entry': {
        const { role, team_member_name, hourly_rate, estimated_hours, actual_hours } = toolCall.args as {
          role: string
          team_member_name?: string
          hourly_rate: number
          estimated_hours?: number
          actual_hours?: number
        }

        const { data, error } = await supabase
          .from('labor_entries')
          .insert({
            project_id: projectId,
            role,
            team_member_name,
            hourly_rate,
            estimated_hours: estimated_hours || 0,
            actual_hours: actual_hours || 0,
          })
          .select()
          .single()

        if (error) throw error
        return { call_id: toolCall.id, result: { success: true, labor_entry: data, message: `Added labor entry: ${role} at $${hourly_rate}/hr` } }
      }

      // =============== EXPENSE UPDATE/DELETE ===============
      case 'update_expense': {
        const { expense_id, category, description, amount, vendor, is_billable, markup_percent } = toolCall.args as {
          expense_id: string
          category?: string
          description?: string
          amount?: number
          vendor?: string
          is_billable?: boolean
          markup_percent?: number
        }

        const updates: Record<string, unknown> = {}
        if (category !== undefined) updates.category = category
        if (description !== undefined) updates.description = description
        if (amount !== undefined) updates.cost_pre_tax = amount
        if (vendor !== undefined) updates.vendor_or_person = vendor
        if (is_billable !== undefined) updates.is_billable = is_billable
        if (markup_percent !== undefined) updates.markup_percent = markup_percent

        const { data, error } = await supabase
          .from('expenses')
          .update(updates)
          .eq('id', expense_id)
          .eq('project_id', projectId)
          .select()
          .single()

        if (error) throw error
        return { call_id: toolCall.id, result: { success: true, expense: data, message: `Updated expense` } }
      }

      case 'delete_expense': {
        const { expense_id } = toolCall.args as { expense_id: string }

        const { error } = await supabase
          .from('expenses')
          .delete()
          .eq('id', expense_id)
          .eq('project_id', projectId)

        if (error) throw error
        return { call_id: toolCall.id, result: { success: true, message: 'Expense deleted successfully' } }
      }

      // =============== LABOR ENTRY UPDATE/DELETE ===============
      case 'update_labor_entry': {
        const { labor_id, role, team_member_name, hourly_rate, estimated_hours, actual_hours } = toolCall.args as {
          labor_id: string
          role?: string
          team_member_name?: string
          hourly_rate?: number
          estimated_hours?: number
          actual_hours?: number
        }

        const updates: Record<string, unknown> = {}
        if (role !== undefined) updates.role = role
        if (team_member_name !== undefined) updates.team_member_name = team_member_name
        if (hourly_rate !== undefined) updates.hourly_rate = hourly_rate
        if (estimated_hours !== undefined) updates.estimated_hours = estimated_hours
        if (actual_hours !== undefined) updates.actual_hours = actual_hours

        const { data, error } = await supabase
          .from('labor_entries')
          .update(updates)
          .eq('id', labor_id)
          .eq('project_id', projectId)
          .select()
          .single()

        if (error) throw error
        return { call_id: toolCall.id, result: { success: true, labor_entry: data, message: `Updated labor entry for ${data.role}` } }
      }

      case 'delete_labor_entry': {
        const { labor_id } = toolCall.args as { labor_id: string }

        const { error } = await supabase
          .from('labor_entries')
          .delete()
          .eq('id', labor_id)
          .eq('project_id', projectId)

        if (error) throw error
        return { call_id: toolCall.id, result: { success: true, message: 'Labor entry deleted successfully' } }
      }

      // =============== PROJECT UPDATE ===============
      case 'update_project': {
        const { budget, start_date, due_date, status, priority, description, progress } = toolCall.args as {
          budget?: number
          start_date?: string
          due_date?: string
          status?: string
          priority?: string
          description?: string
          progress?: number
        }

        const updates: Record<string, unknown> = {}
        if (budget !== undefined) updates.budget = budget
        if (start_date !== undefined) updates.start_date = start_date
        if (due_date !== undefined) updates.due_date = due_date
        if (status !== undefined) updates.status = status
        if (priority !== undefined) updates.priority = priority
        if (description !== undefined) updates.description = description
        if (progress !== undefined) updates.progress = Math.min(100, Math.max(0, progress))

        const { data, error } = await supabase
          .from('projects')
          .update(updates)
          .eq('id', projectId)
          .select()
          .single()

        if (error) throw error
        return { call_id: toolCall.id, result: { success: true, project: data, message: `Updated project settings` } }
      }

      // =============== DELIVERABLE UPDATE/DELETE ===============
      case 'update_deliverable': {
        const { deliverable_id, title, description, type, status, draft_url, final_url } = toolCall.args as {
          deliverable_id: string
          title?: string
          description?: string
          type?: string
          status?: string
          draft_url?: string
          final_url?: string
        }

        const updates: Record<string, unknown> = {}
        if (title !== undefined) updates.title = title
        if (description !== undefined) updates.description = description
        if (type !== undefined) updates.type = type
        if (status !== undefined) updates.status = status
        // Map draft_url and final_url to file_url (single file column in DB)
        if (draft_url !== undefined) updates.file_url = draft_url
        if (final_url !== undefined) updates.file_url = final_url

        const { data, error } = await supabase
          .from('deliverables')
          .update(updates)
          .eq('id', deliverable_id)
          .eq('project_id', projectId)
          .select()
          .single()

        if (error) throw error
        return { call_id: toolCall.id, result: { success: true, deliverable: data, message: `Updated deliverable: ${data.title}` } }
      }

      case 'delete_deliverable': {
        const { deliverable_id } = toolCall.args as { deliverable_id: string }

        const { error } = await supabase
          .from('deliverables')
          .delete()
          .eq('id', deliverable_id)
          .eq('project_id', projectId)

        if (error) throw error
        return { call_id: toolCall.id, result: { success: true, message: 'Deliverable deleted successfully' } }
      }

      // =============== HISTORICAL DATA ===============
      case 'get_similar_projects': {
        const { budget_min, budget_max, tags, limit } = toolCall.args as {
          budget_min?: number
          budget_max?: number
          tags?: string[]
          limit?: number
        }

        let query = supabase
          .from('projects')
          .select(`
            id,
            name,
            budget,
            status,
            start_date,
            due_date,
            completed_at,
            tags,
            expenses:expenses(cost_pre_tax),
            labor:labor_entries(hourly_rate, actual_hours)
          `)
          .eq('status', 'completed')
          .neq('id', projectId)
          .limit(limit || 5)

        if (budget_min !== undefined) {
          query = query.gte('budget', budget_min)
        }
        if (budget_max !== undefined) {
          query = query.lte('budget', budget_max)
        }
        if (tags && tags.length > 0) {
          query = query.overlaps('tags', tags)
        }

        const { data, error } = await query

        if (error) throw error

        const similarProjects = (data || []).map(p => {
          const totalExpenses = (p.expenses || []).reduce((sum: number, e: { cost_pre_tax: number }) => sum + (e.cost_pre_tax || 0), 0)
          const totalLabor = (p.labor || []).reduce((sum: number, l: { hourly_rate: number; actual_hours: number }) => sum + (l.hourly_rate || 0) * (l.actual_hours || 0), 0)
          const durationDays = p.start_date && p.completed_at
            ? Math.ceil((new Date(p.completed_at).getTime() - new Date(p.start_date).getTime()) / (1000 * 60 * 60 * 24))
            : null

          return {
            id: p.id,
            name: p.name,
            budget: p.budget,
            final_cost: totalExpenses + totalLabor,
            duration_days: durationDays,
            tags: p.tags,
          }
        })

        return {
          call_id: toolCall.id,
          result: {
            similar_projects: similarProjects,
            count: similarProjects.length,
            average_budget: similarProjects.length > 0 ? similarProjects.reduce((sum, p) => sum + (p.budget || 0), 0) / similarProjects.length : 0,
            average_final_cost: similarProjects.length > 0 ? similarProjects.reduce((sum, p) => sum + (p.final_cost || 0), 0) / similarProjects.length : 0,
          },
        }
      }

      case 'get_historical_pricing': {
        const { role, expense_category } = toolCall.args as {
          role?: string
          expense_category?: string
        }

        const result: Record<string, unknown> = {}

        if (role) {
          const { data: laborData } = await supabase
            .from('labor_entries')
            .select('hourly_rate, actual_hours, role')
            .ilike('role', `%${role}%`)

          if (laborData && laborData.length > 0) {
            const rates = laborData.map(l => l.hourly_rate)
            const hours = laborData.map(l => l.actual_hours)
            result.labor_pricing = {
              role_searched: role,
              sample_size: laborData.length,
              avg_hourly_rate: rates.reduce((a, b) => a + b, 0) / rates.length,
              min_rate: Math.min(...rates),
              max_rate: Math.max(...rates),
              avg_hours: hours.reduce((a, b) => a + b, 0) / hours.length,
            }
          }
        }

        if (expense_category) {
          const { data: expenseData } = await supabase
            .from('expenses')
            .select('cost_pre_tax, category')
            .ilike('category', `%${expense_category}%`)

          if (expenseData && expenseData.length > 0) {
            const amounts = expenseData.map(e => e.cost_pre_tax)
            result.expense_pricing = {
              category_searched: expense_category,
              sample_size: expenseData.length,
              avg_amount: amounts.reduce((a, b) => a + b, 0) / amounts.length,
              min_amount: Math.min(...amounts),
              max_amount: Math.max(...amounts),
            }
          }
        }

        return {
          call_id: toolCall.id,
          result: Object.keys(result).length > 0 ? result : { message: 'No historical data found for the specified criteria' },
        }
      }

      // =============== QUERY TOOLS ===============
      case 'get_project_summary': {
        const completedTasks = context.tasks.filter(t => t.status === 'completed').length
        const completedMilestones = context.milestones.filter(m => !!m.completed_at).length
        const overdueTasks = context.tasks.filter(t =>
          t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
        ).length

        return {
          call_id: toolCall.id,
          result: {
            project_name: context.project.name,
            status: context.project.status,
            progress: context.project.progress,
            tasks: { total: context.tasks.length, completed: completedTasks, overdue: overdueTasks },
            milestones: { total: context.milestones.length, completed: completedMilestones },
            deliverables: { total: context.deliverables.length },
            quote: {
              total: context.financials.budget,
              spent: context.financials.totalExpenses + context.financials.totalLabor,
              remaining: context.financials.remainingBudget,
            },
          },
        }
      }

      case 'get_overdue_items': {
        const today = new Date()
        const overdueTasks = context.tasks.filter(t =>
          t.due_date && new Date(t.due_date) < today && t.status !== 'completed'
        )
        const overdueMilestones = context.milestones.filter(m =>
          m.due_date && new Date(m.due_date) < today && !m.completed_at
        )

        return {
          call_id: toolCall.id,
          result: {
            overdue_tasks: overdueTasks,
            overdue_milestones: overdueMilestones,
            total_overdue: overdueTasks.length + overdueMilestones.length,
          },
        }
      }

      case 'get_financial_summary': {
        return {
          call_id: toolCall.id,
          result: {
            quote: context.financials.budget,
            total_expenses: context.financials.totalExpenses,
            total_labor: context.financials.totalLabor,
            total_spent: context.financials.totalExpenses + context.financials.totalLabor,
            remaining_on_quote: context.financials.remainingBudget,
            pending_reimbursements: context.financials.reimbursementsPending,
            pending_returns: context.financials.returnsPending,
            quote_utilization: context.financials.budget > 0
              ? ((context.financials.totalExpenses + context.financials.totalLabor) / context.financials.budget * 100).toFixed(1) + '%'
              : 'N/A',
          },
        }
      }

      case 'analyze_project_health': {
        // Calculate health metrics
        const completedTasks = context.tasks.filter(t => t.status === 'completed').length
        const totalTasks = context.tasks.length
        const overdueTasks = context.tasks.filter(t =>
          t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
        ).length

        const quoteUsed = context.financials.totalExpenses + context.financials.totalLabor
        const quotePercent = context.financials.budget > 0 ? (quoteUsed / context.financials.budget) * 100 : 0

        let healthScore = 100
        let status: 'healthy' | 'at_risk' | 'critical' = 'healthy'
        const issues: string[] = []

        // Task completion
        if (totalTasks > 0 && completedTasks / totalTasks < 0.3 && context.project.progress > 50) {
          healthScore -= 20
          issues.push('Task completion is behind schedule')
        }

        // Overdue items
        if (overdueTasks > 0) {
          healthScore -= overdueTasks * 5
          issues.push(`${overdueTasks} overdue tasks`)
        }

        // Budget
        if (quotePercent > 90) {
          healthScore -= 20
          issues.push('Quote nearly exhausted')
        } else if (quotePercent > 80) {
          healthScore -= 10
          issues.push('Quote at 80%+')
        }

        if (healthScore < 50) status = 'critical'
        else if (healthScore < 75) status = 'at_risk'

        return {
          call_id: toolCall.id,
          result: {
            health_score: Math.max(0, healthScore),
            status,
            issues,
            recommendations: issues.length > 0
              ? ['Address overdue tasks', 'Review quote allocation', 'Update project timeline']
              : ['Project is on track', 'Continue current pace'],
          },
        }
      }

      case 'suggest_next_steps': {
        const pendingTasks = context.tasks.filter(t => t.status === 'todo')
        const inProgressTasks = context.tasks.filter(t => t.status === 'in_progress')
        const upcomingMilestones = context.milestones.filter(m => !m.completed_at)

        const suggestions: string[] = []

        if (inProgressTasks.length === 0 && pendingTasks.length > 0) {
          suggestions.push(`Start working on: ${pendingTasks[0].title}`)
        }

        if (upcomingMilestones.length > 0) {
          suggestions.push(`Next milestone: ${upcomingMilestones[0].title}`)
        }

        const overdueCount = context.tasks.filter(t =>
          t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
        ).length

        if (overdueCount > 0) {
          suggestions.push(`Address ${overdueCount} overdue tasks`)
        }

        if (context.deliverables.filter(d => d.status === 'draft').length > 0) {
          suggestions.push('Review draft deliverables for client submission')
        }

        return {
          call_id: toolCall.id,
          result: {
            next_steps: suggestions.length > 0 ? suggestions : ['All tasks are on track!'],
            priority_task: pendingTasks[0] || inProgressTasks[0] || null,
            next_milestone: upcomingMilestones[0] || null,
          },
        }
      }

      default:
        return {
          call_id: toolCall.id,
          result: null,
          error: `Unknown tool: ${toolCall.name}`,
        }
    }
  } catch (error) {
    return {
      call_id: toolCall.id,
      result: null,
      error: error instanceof Error ? error.message : 'Tool execution failed',
    }
  }
}

export async function executeMultipleToolCalls(
  projectId: string,
  toolCalls: ToolCall[],
  context: ProjectContext
): Promise<ToolResult[]> {
  const results: ToolResult[] = []

  for (const toolCall of toolCalls) {
    const result = await executeToolCall(projectId, toolCall, context)
    results.push(result)
  }

  return results
}
