import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chatWithLeadAgent, type LeadContext } from '@/lib/ai/lead-agent'
import { executeLeadToolCall } from '@/lib/ai/lead-tool-executor'
import type { AgentMessage, ToolCall, ToolResult } from '@/lib/ai/project-agent'

interface RouteParams {
  params: Promise<{ id: string }>
}

// =====================================================
// HELPER: BUILD LEAD CONTEXT
// =====================================================

async function buildLeadContext(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, leadId: string): Promise<LeadContext> {
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()

  if (leadError || !lead) {
    throw new Error('Lead not found')
  }

  const { data: activities } = await supabase
    .from('lead_activities')
    .select('id, type, content, metadata, created_at, user:profiles(full_name)')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(20)

  return {
    lead: {
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      subject: lead.subject,
      message: lead.message,
      source: lead.source,
      source_page: lead.source_page,
      status: lead.status,
      priority: lead.priority,
      tags: lead.tags || [],
      notes: lead.notes,
      last_contacted_at: lead.last_contacted_at,
      created_at: lead.created_at,
      updated_at: lead.updated_at,
    },
    activities: (activities || []).map(a => ({
      id: a.id,
      type: a.type,
      content: a.content || '',
      metadata: a.metadata as Record<string, unknown> | null,
      created_at: a.created_at,
      user_name: (a.user as { full_name: string }[] | null)?.[0]?.full_name || null,
    })),
  }
}

// =====================================================
// HELPER: FORMAT TOOL RESULTS AS READABLE MESSAGE
// =====================================================

function formatLeadToolResultsMessage(executedResults: ToolResult[], toolCalls: ToolCall[]): string {
  const parts: string[] = []

  for (const result of executedResults) {
    const toolCall = toolCalls.find(tc => tc.id === result.call_id)
    const name = toolCall?.name || 'unknown'
    const data = result.result as Record<string, unknown> | null

    if (result.error) {
      parts.push(`I encountered an error: ${result.error}`)
      continue
    }

    if (!data) continue

    switch (name) {
      case 'draft_email_response': {
        const draft = data.email_draft as string | undefined
        if (draft) {
          parts.push(`**Drafted Email Response:**\n\n${draft}`)
        }
        break
      }

      case 'suggest_next_steps': {
        const steps = data.next_steps as string | undefined
        if (steps) {
          parts.push(`**Suggested Next Steps:**\n\n${steps}`)
        }
        break
      }

      case 'analyze_intent': {
        const analysis = data.analysis as string | undefined
        if (analysis) {
          parts.push(`**Intent Analysis:**\n\n${analysis}`)
        }
        break
      }

      case 'qualify_lead': {
        const qualification = data.qualification as string | undefined
        if (qualification) {
          parts.push(`**Lead Qualification (BANT):**\n\n${qualification}`)
        }
        break
      }

      case 'generate_follow_up': {
        const followUp = data.follow_up as string | undefined
        if (followUp) {
          parts.push(`**Follow-Up Email:**\n\n${followUp}`)
        }
        break
      }

      case 'get_lead_summary': {
        const lines: string[] = [`**Lead Summary: ${data.name}**`]
        lines.push(`- **Email:** ${data.email}`)
        if (data.company) lines.push(`- **Company:** ${data.company}`)
        lines.push(`- **Status:** ${data.status} — **Priority:** ${data.priority}`)
        lines.push(`- **Source:** ${data.source}`)
        lines.push(`- **Days in Pipeline:** ${data.days_in_pipeline}`)
        lines.push(`- **Days Since Contact:** ${data.days_since_contact !== null ? data.days_since_contact : 'Never contacted'}`)
        lines.push(`- **Activities:** ${data.total_activities}`)
        parts.push(lines.join('\n'))
        break
      }

      case 'get_activity_history': {
        const activities = data.activities as Array<{ type: string; content: string; created_at: string }> | undefined
        if (activities && activities.length > 0) {
          const lines: string[] = [`**Activity History** (${data.showing}/${data.total}):`]
          activities.forEach(a => {
            lines.push(`- [${a.type}] ${a.content} — ${new Date(a.created_at).toLocaleDateString()}`)
          })
          parts.push(lines.join('\n'))
        } else {
          parts.push('No activities recorded yet.')
        }
        break
      }

      default: {
        const msg = (data as Record<string, unknown>).message as string | undefined
        if (msg) {
          parts.push(msg)
        }
        break
      }
    }
  }

  return parts.length > 0 ? parts.join('\n\n') : ''
}

// =====================================================
// POST: SEND MESSAGE TO AGENT
// =====================================================

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: leadId } = await params
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
        .from('lead_conversations')
        .insert({
          lead_id: leadId,
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

    // Fetch conversation history
    const { data: historyMessages } = await supabase
      .from('lead_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(50)

    // Build context
    const context = await buildLeadContext(supabase, leadId)

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
        let parsedResult: unknown = {}
        try {
          parsedResult = msg.content ? JSON.parse(msg.content) : {}
        } catch {
          parsedResult = { raw: msg.content }
        }
        return {
          role: 'tool' as const,
          tool_results: [{
            call_id: msg.tool_name || msg.tool_call_id || '',
            result: parsedResult,
          }],
        }
      }
      return { role: 'user' as const, content: msg.content || '' }
    })

    // Save user message
    const { error: userMsgError } = await supabase
      .from('lead_messages')
      .insert({
        conversation_id: conversationId,
        lead_id: leadId,
        role: 'user',
        content: message,
        created_by: user.id,
      })

    if (userMsgError) {
      console.error('Error saving user message:', userMsgError)
    }

    // Call AI agent
    const response = await chatWithLeadAgent(context, agentMessages, message)

    // Process tool calls
    const executedResults: ToolResult[] = []
    const pendingActions = []

    for (const toolCall of response.tool_calls) {
      const pending = response.pending_actions.find(p => p.tool_call.id === toolCall.id)

      // In v1, only confirm destructive actions
      const needsConfirmation = pending?.requires_confirmation === true

      if (needsConfirmation) {
        pendingActions.push(pending)
      } else {
        const result = await executeLeadToolCall(leadId, toolCall, context)
        executedResults.push(result)
      }
    }

    // Build assistant message content
    const assistantContent = response.message
      || (executedResults.length > 0
        ? formatLeadToolResultsMessage(executedResults, response.tool_calls)
        : null)

    // Save assistant message
    const { data: assistantMsg, error: assistantMsgError } = await supabase
      .from('lead_messages')
      .insert({
        conversation_id: conversationId,
        lead_id: leadId,
        role: 'assistant',
        content: assistantContent,
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
      await supabase.from('lead_messages').insert({
        conversation_id: conversationId,
        lead_id: leadId,
        role: 'tool',
        content: JSON.stringify(result.result),
        tool_call_id: result.call_id,
        tool_name: toolCall?.name,
      })
    }

    // Log activity
    await supabase.from('lead_activities').insert({
      lead_id: leadId,
      user_id: user.id,
      type: 'ai_assist',
      content: `AI chat: ${message.substring(0, 100)}`,
      metadata: {
        conversation_id: conversationId,
        tools_called: response.tool_calls.map(tc => tc.name),
        tools_executed: executedResults.map(r => r.call_id),
        pending_actions: pendingActions.length,
      },
    })

    return NextResponse.json({
      conversation_id: conversationId,
      message: {
        id: assistantMsg?.id,
        role: 'assistant',
        content: assistantContent,
        tool_calls: response.tool_calls,
        pending_actions: pendingActions,
        tokens_used: response.tokens_used,
      },
      executed_actions: executedResults,
    })
  } catch (error) {
    console.error('Error in lead chat:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process message' },
      { status: 500 }
    )
  }
}

// =====================================================
// PUT: CONFIRM PENDING ACTION
// =====================================================

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: leadId } = await params
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
      .from('lead_messages')
      .select('*')
      .eq('id', message_id)
      .eq('lead_id', leadId)
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
      const context = await buildLeadContext(supabase, leadId)
      result = await executeLeadToolCall(leadId, actionToProcess.tool_call, context)

      // Save tool result
      await supabase.from('lead_messages').insert({
        conversation_id: message.conversation_id,
        lead_id: leadId,
        role: 'tool',
        content: JSON.stringify(result.result),
        tool_call_id: actionToProcess.tool_call.id,
        tool_name: actionToProcess.tool_call.name,
      })
    }

    // Update the message to mark action as confirmed
    const remainingActions = pendingActions.filter(a => a.tool_call.id !== action_id)
    await supabase
      .from('lead_messages')
      .update({
        pending_action: remainingActions.length > 0 ? remainingActions : null,
        action_confirmed: true,
        action_confirmed_at: new Date().toISOString(),
        action_confirmed_by: user.id,
      })
      .eq('id', message_id)

    // Log activity
    await supabase.from('lead_activities').insert({
      lead_id: leadId,
      user_id: user.id,
      type: 'ai_assist',
      content: `AI action ${approved ? 'approved' : 'rejected'}: ${actionToProcess.tool_call.name}`,
      metadata: {
        action: actionToProcess.tool_call.name,
        approved,
      },
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
  { params }: RouteParams
) {
  try {
    const { id: leadId } = await params
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
        .from('lead_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
      }

      return NextResponse.json({ messages })
    } else {
      // Fetch all conversations for this lead
      const { data: conversations, error } = await supabase
        .from('lead_conversations')
        .select('*, messages:lead_messages(count)')
        .eq('lead_id', leadId)
        .order('updated_at', { ascending: false })

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
      }

      return NextResponse.json({ conversations })
    }
  } catch (error) {
    console.error('Error fetching lead chat data:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch chat data' },
      { status: 500 }
    )
  }
}
