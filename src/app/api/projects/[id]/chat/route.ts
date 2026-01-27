import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chatWithProjectAgent, type ProjectContext, type AgentMessage, type ToolCall, type ToolResult } from '@/lib/ai/project-agent'
import { executeToolCall } from '@/lib/ai/tool-executor'

// =====================================================
// HELPER: BUILD PROJECT CONTEXT
// =====================================================

async function buildProjectContext(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, projectId: string): Promise<ProjectContext> {
  // Fetch project with client
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*, client:clients(id, name, company, email)')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    throw new Error('Project not found')
  }

  // Fetch tasks with all fields
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, description, status, priority, due_date, assigned_to, completed_at, sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  // Fetch milestones with all fields
  const { data: milestones } = await supabase
    .from('milestones')
    .select('id, title, description, due_date, completed_at, payment_amount, is_paid, sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  // Fetch deliverables with all fields
  const { data: deliverables } = await supabase
    .from('deliverables')
    .select('id, title, description, type, status, current_version, file_url, thumbnail_url, created_at')
    .eq('project_id', projectId)

  // Fetch detailed expense data (may not exist if migration not run)
  let expenses: Array<{ id: string; category: string; description: string | null; cost_pre_tax: number; tax: number | null; markup_percent: number | null; vendor_or_person: string | null; is_billable: boolean; date: string }> | null = null
  try {
    const { data } = await supabase
      .from('expenses')
      .select('id, category, description, cost_pre_tax, tax, markup_percent, vendor_or_person, is_billable, date')
      .eq('project_id', projectId)
      .order('date', { ascending: false })
    expenses = data
  } catch {
    // Table might not exist
  }

  // Fetch detailed labor data (may not exist if migration not run)
  let labor: Array<{ id: string; role: string; team_member_name: string | null; hourly_rate: number; estimated_hours: number; actual_hours: number }> | null = null
  try {
    const { data } = await supabase
      .from('labor_entries')
      .select('id, role, team_member_name, hourly_rate, estimated_hours, actual_hours')
      .eq('project_id', projectId)
    labor = data
  } catch {
    // Table might not exist
  }

  // Fetch reimbursements (may not exist if migration not run)
  let reimbursements: Array<{ id: string; description: string; amount: number; status: string }> | null = null
  try {
    const { data } = await supabase
      .from('reimbursements')
      .select('id, description, amount, status')
      .eq('project_id', projectId)
    reimbursements = data
  } catch {
    // Table might not exist
  }

  // Fetch returns (may not exist if migration not run)
  let returns: Array<{ id: string; item_description: string; net_return: number; status: string }> | null = null
  try {
    const { data } = await supabase
      .from('returns')
      .select('id, item_description, net_return, status')
      .eq('project_id', projectId)
    returns = data
  } catch {
    // Table might not exist
  }

  // Fetch recent activity
  const { data: activity } = await supabase
    .from('activity_feed')
    .select('activity_type, metadata, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(10)

  // Process expense data
  const expenseDetails = (expenses || []).map(e => ({
    id: e.id,
    category: e.category,
    description: e.description,
    amount: e.cost_pre_tax || 0,
    vendor: e.vendor_or_person,
    is_billable: e.is_billable ?? true,
    markup_percent: e.markup_percent || 0,
    date: e.date,
  }))

  // Process labor data
  const laborDetails = (labor || []).map(l => ({
    id: l.id,
    role: l.role,
    team_member_name: l.team_member_name,
    hourly_rate: l.hourly_rate || 0,
    estimated_hours: l.estimated_hours || 0,
    actual_hours: l.actual_hours || 0,
    total_cost: (l.hourly_rate || 0) * (l.actual_hours || 0),
  }))

  // Calculate financials
  const totalExpenses = expenseDetails.reduce((sum, e) => sum + e.amount, 0)
  const totalLabor = laborDetails.reduce((sum, l) => sum + l.total_cost, 0)

  const reimbursementsPending = (reimbursements || [])
    .filter(r => r.status === 'pending' || r.status === 'approved')
    .reduce((sum, r) => sum + (r.amount || 0), 0)

  const returnsPending = (returns || [])
    .filter(r => r.status === 'pending' || r.status === 'in_progress')
    .reduce((sum, r) => sum + (r.net_return || 0), 0)

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      priority: project.priority,
      budget: project.budget || 0,
      spent: totalExpenses + totalLabor,
      start_date: project.start_date,
      due_date: project.due_date,
      progress: project.progress || 0,
      tags: project.tags || [],
      client: project.client,
    },
    tasks: (tasks || []).map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      due_date: t.due_date,
      assigned_to: t.assigned_to,
      completed_at: t.completed_at,
      order: t.sort_order || 0,
    })),
    milestones: (milestones || []).map(m => ({
      id: m.id,
      title: m.title,
      description: m.description,
      due_date: m.due_date,
      completed_at: m.completed_at,
      payment_amount: m.payment_amount,
      is_paid: m.is_paid ?? false,
      sort_order: m.sort_order || 0,
    })),
    deliverables: (deliverables || []).map(d => ({
      id: d.id,
      title: d.title,
      description: d.description,
      type: d.type,
      status: d.status,
      current_version: d.current_version || 1,
      draft_url: d.file_url,
      final_url: d.file_url,
      created_at: d.created_at,
    })),
    financials: {
      budget: project.budget || 0,
      totalExpenses,
      totalLabor,
      remainingBudget: (project.budget || 0) - totalExpenses - totalLabor,
      reimbursementsPending,
      returnsPending,
      expenses: expenseDetails,
      laborEntries: laborDetails,
      reimbursements: (reimbursements || []).map(r => ({
        id: r.id,
        description: r.description || '',
        amount: r.amount || 0,
        status: r.status,
      })),
      returns: (returns || []).map(r => ({
        id: r.id,
        description: r.item_description || '',
        amount: r.net_return || 0,
        status: r.status,
      })),
    },
    recentActivity: (activity || []).map(a => ({
      type: a.activity_type,
      description: JSON.stringify(a.metadata),
      created_at: a.created_at,
    })),
  }
}

// =====================================================
// POST: SEND MESSAGE TO AGENT
// =====================================================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: projectId } = params
    const body = await request.json()
    const { message, conversation_id } = body as {
      message: string
      conversation_id?: string
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get or create conversation
    let conversationId = conversation_id
    if (!conversationId) {
      const { data: newConv, error: convError } = await supabase
        .from('project_conversations')
        .insert({
          project_id: projectId,
          title: message.substring(0, 100),
          created_by: user.id,
        })
        .select()
        .single()

      if (convError) {
        console.error('Error creating conversation:', convError)
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
      }
      conversationId = newConv.id
    }

    // Fetch AI settings for this project
    const { data: aiSettings } = await supabase
      .from('project_ai_settings')
      .select('*')
      .eq('project_id', projectId)
      .single()

    const confirmationLevel = aiSettings?.confirmation_level || 'destructive_only'

    // Fetch conversation history
    const { data: historyMessages } = await supabase
      .from('project_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(aiSettings?.max_history_messages || 50)

    // Build context
    const context = await buildProjectContext(supabase, projectId)

    // Convert history to agent messages format
    const agentMessages: AgentMessage[] = (historyMessages || []).map(msg => {
      if (msg.role === 'user') {
        return { role: 'user' as const, content: msg.content || '' }
      } else if (msg.role === 'assistant') {
        return {
          role: 'model' as const,
          content: msg.content || undefined,
          tool_calls: msg.tool_calls as ToolCall[] | undefined,
        }
      } else if (msg.role === 'tool') {
        return {
          role: 'tool' as const,
          tool_results: [{
            call_id: msg.tool_call_id || '',
            result: msg.content,
          }],
        }
      }
      return { role: 'user' as const, content: msg.content || '' }
    })

    // Save user message
    const { error: userMsgError } = await supabase
      .from('project_messages')
      .insert({
        conversation_id: conversationId,
        project_id: projectId,
        role: 'user',
        content: message,
        created_by: user.id,
      })

    if (userMsgError) {
      console.error('Error saving user message:', userMsgError)
    }

    // Call AI agent
    const response = await chatWithProjectAgent(context, agentMessages, message)

    // Process tool calls
    const executedResults: ToolResult[] = []
    const pendingActions = []

    for (const toolCall of response.tool_calls) {
      const pending = response.pending_actions.find(p => p.tool_call.id === toolCall.id)

      // Check if this needs confirmation
      const needsConfirmation = confirmationLevel === 'always' ||
        (confirmationLevel === 'destructive_only' && pending?.requires_confirmation)

      if (needsConfirmation) {
        pendingActions.push(pending)
      } else {
        // Execute immediately
        const result = await executeToolCall(projectId, toolCall, context)
        executedResults.push(result)
      }
    }

    // Save assistant message
    const { data: assistantMsg, error: assistantMsgError } = await supabase
      .from('project_messages')
      .insert({
        conversation_id: conversationId,
        project_id: projectId,
        role: 'assistant',
        content: response.message,
        tool_calls: response.tool_calls.length > 0 ? response.tool_calls : null,
        pending_action: pendingActions.length > 0 ? pendingActions : null,
        tokens_used: response.tokens_used,
        model: 'gemini-2.0-flash',
      })
      .select()
      .single()

    if (assistantMsgError) {
      console.error('Error saving assistant message:', assistantMsgError)
    }

    // Save tool results if any were executed
    for (const result of executedResults) {
      const toolCall = response.tool_calls.find(tc => tc.id === result.call_id)
      await supabase.from('project_messages').insert({
        conversation_id: conversationId,
        project_id: projectId,
        role: 'tool',
        content: JSON.stringify(result.result),
        tool_call_id: result.call_id,
        tool_name: toolCall?.name,
      })
    }

    // Log activity
    await supabase.from('activity_feed').insert({
      project_id: projectId,
      user_id: user.id,
      activity_type: 'ai_chat',
      entity_type: 'conversation',
      entity_id: conversationId,
      metadata: {
        message_preview: message.substring(0, 100),
        tools_called: response.tool_calls.map(tc => tc.name),
        tools_executed: executedResults.map(r => r.call_id),
        pending_actions: pendingActions.length,
      },
      is_client_visible: false,
    })

    return NextResponse.json({
      conversation_id: conversationId,
      message: {
        id: assistantMsg?.id,
        role: 'assistant',
        content: response.message,
        tool_calls: response.tool_calls,
        pending_actions: pendingActions,
        tokens_used: response.tokens_used,
      },
      executed_actions: executedResults,
    })
  } catch (error) {
    console.error('Error in project chat:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process message' },
      { status: 500 }
    )
  }
}

// =====================================================
// POST: CONFIRM PENDING ACTION
// =====================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: projectId } = params
    const body = await request.json()
    const { message_id, action_id, approved } = body as {
      message_id: string
      action_id: string
      approved: boolean
    }

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch the message with pending action
    const { data: message, error: msgError } = await supabase
      .from('project_messages')
      .select('*')
      .eq('id', message_id)
      .eq('project_id', projectId)
      .single()

    if (msgError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    if (!message.pending_action) {
      return NextResponse.json({ error: 'No pending action found' }, { status: 400 })
    }

    const pendingActions = message.pending_action as Array<{
      tool_call: ToolCall
      description: string
      requires_confirmation: boolean
    }>

    const actionToProcess = pendingActions.find(a => a.tool_call.id === action_id)
    if (!actionToProcess) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 })
    }

    let result: ToolResult | null = null

    if (approved) {
      // Build context and execute the tool
      const context = await buildProjectContext(supabase, projectId)
      result = await executeToolCall(projectId, actionToProcess.tool_call, context)

      // Save tool result
      await supabase.from('project_messages').insert({
        conversation_id: message.conversation_id,
        project_id: projectId,
        role: 'tool',
        content: JSON.stringify(result.result),
        tool_call_id: actionToProcess.tool_call.id,
        tool_name: actionToProcess.tool_call.name,
      })
    }

    // Update the message to mark action as confirmed
    const remainingActions = pendingActions.filter(a => a.tool_call.id !== action_id)
    await supabase
      .from('project_messages')
      .update({
        pending_action: remainingActions.length > 0 ? remainingActions : null,
        action_confirmed: true,
        action_confirmed_at: new Date().toISOString(),
        action_confirmed_by: user.id,
      })
      .eq('id', message_id)

    // Log activity
    await supabase.from('activity_feed').insert({
      project_id: projectId,
      user_id: user.id,
      activity_type: approved ? 'ai_action_approved' : 'ai_action_rejected',
      entity_type: 'message',
      entity_id: message_id,
      metadata: {
        action: actionToProcess.tool_call.name,
        approved,
      },
      is_client_visible: false,
    })

    return NextResponse.json({
      success: true,
      approved,
      result: result?.result || null,
    })
  } catch (error) {
    console.error('Error confirming action:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to confirm action' },
      { status: 500 }
    )
  }
}

// =====================================================
// GET: FETCH CONVERSATIONS AND MESSAGES
// =====================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: projectId } = params
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversation_id')

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (conversationId) {
      // Fetch messages for a specific conversation
      const { data: messages, error } = await supabase
        .from('project_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
      }

      return NextResponse.json({ messages })
    } else {
      // Fetch all conversations for this project
      const { data: conversations, error } = await supabase
        .from('project_conversations')
        .select('*, messages:project_messages(count)')
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false })

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
      }

      return NextResponse.json({ conversations })
    }
  } catch (error) {
    console.error('Error fetching chat data:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch chat data' },
      { status: 500 }
    )
  }
}
