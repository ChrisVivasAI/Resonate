import { GEMINI_MODELS } from './gemini'
import type { ToolCall, ToolResult, PendingAction, AgentMessage, AgentResponse } from './project-agent'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta'

// =====================================================
// TYPES
// =====================================================

export interface LeadContext {
  lead: {
    id: string
    name: string
    email: string
    phone: string | null
    company: string | null
    subject: string | null
    message: string | null
    source: string
    source_page: string | null
    status: string
    priority: string
    tags: string[]
    notes: string | null
    last_contacted_at: string | null
    created_at: string
    updated_at: string
  }
  activities: Array<{
    id: string
    type: string
    content: string
    metadata: Record<string, unknown> | null
    created_at: string
    user_name: string | null
  }>
}

// =====================================================
// TOOL DEFINITIONS
// =====================================================

const LEAD_AGENT_TOOLS = {
  // AI-Generation Tools (no confirmation needed)
  draft_email_response: {
    name: 'draft_email_response',
    description: 'Draft a professional email response to this lead based on their inquiry and context',
    parameters: {
      type: 'object',
      properties: {
        tone: { type: 'string', description: 'Tone of the email (e.g., formal, friendly, urgent). Default: professional' },
      },
      required: [],
    },
    requires_confirmation: false,
  },

  suggest_next_steps: {
    name: 'suggest_next_steps',
    description: 'Suggest 3-5 actionable next steps to move this lead forward in the sales pipeline',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    requires_confirmation: false,
  },

  analyze_intent: {
    name: 'analyze_intent',
    description: 'Analyze the lead\'s intent, urgency, budget indicators, and decision-making capacity',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    requires_confirmation: false,
  },

  qualify_lead: {
    name: 'qualify_lead',
    description: 'Evaluate the lead using the BANT framework (Budget, Authority, Need, Timeline) and provide a qualification score',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    requires_confirmation: false,
  },

  generate_follow_up: {
    name: 'generate_follow_up',
    description: 'Generate a personalized follow-up email for this lead',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    requires_confirmation: false,
  },

  // Lead Management Tools
  update_lead_status: {
    name: 'update_lead_status',
    description: 'Update the lead\'s status in the pipeline',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['new', 'contacted', 'qualified', 'proposal', 'converted', 'lost'], description: 'New status for the lead' },
      },
      required: ['status'],
    },
    requires_confirmation: true,
  },

  update_lead_priority: {
    name: 'update_lead_priority',
    description: 'Update the lead\'s priority level',
    parameters: {
      type: 'object',
      properties: {
        priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'New priority level' },
      },
      required: ['priority'],
    },
    requires_confirmation: false,
  },

  add_note: {
    name: 'add_note',
    description: 'Add a note to the lead\'s activity history',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Note content' },
      },
      required: ['content'],
    },
    requires_confirmation: false,
  },

  add_activity: {
    name: 'add_activity',
    description: 'Log an activity for this lead (email sent, call made, meeting scheduled, etc.)',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['note', 'email', 'call', 'meeting'], description: 'Activity type' },
        content: { type: 'string', description: 'Activity description' },
      },
      required: ['type', 'content'],
    },
    requires_confirmation: false,
  },

  update_lead: {
    name: 'update_lead',
    description: 'Update lead details such as name, email, phone, company, tags, or notes',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Updated name' },
        email: { type: 'string', description: 'Updated email' },
        phone: { type: 'string', description: 'Updated phone number' },
        company: { type: 'string', description: 'Updated company name' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Updated tags array' },
        notes: { type: 'string', description: 'Updated notes' },
      },
      required: [],
    },
    requires_confirmation: true,
  },

  // Query Tools (no confirmation needed)
  get_lead_summary: {
    name: 'get_lead_summary',
    description: 'Get a comprehensive summary of this lead including status, activities, and key details',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    requires_confirmation: false,
  },

  get_activity_history: {
    name: 'get_activity_history',
    description: 'Get the recent activity history for this lead',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum number of activities to return (default: 10)' },
      },
      required: [],
    },
    requires_confirmation: false,
  },
}

// =====================================================
// SYSTEM PROMPT
// =====================================================

export function buildLeadSystemPrompt(context: LeadContext): string {
  const daysSinceCreated = Math.floor((Date.now() - new Date(context.lead.created_at).getTime()) / (1000 * 60 * 60 * 24))
  const daysSinceContact = context.lead.last_contacted_at
    ? Math.floor((Date.now() - new Date(context.lead.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24))
    : null

  return `You are an AI assistant for Resonate, a creative agency. You help the team respond to and manage leads effectively.

About Resonate:
- We are a creative agency specializing in artist branding (Artist 360), brand development (Brand 360), and event coverage (Event 360)
- Our services include content creation, social media strategy, visual identity, and comprehensive creative solutions
- We work with artists, brands, and event organizers

## Current Lead Context

**Name:** ${context.lead.name}
**Email:** ${context.lead.email}
**Phone:** ${context.lead.phone || 'Not provided'}
**Company:** ${context.lead.company || 'Not provided'}
**Status:** ${context.lead.status}
**Priority:** ${context.lead.priority}
**Source:** ${context.lead.source}${context.lead.source_page ? ` (${context.lead.source_page})` : ''}
**Created:** ${new Date(context.lead.created_at).toLocaleDateString()} (${daysSinceCreated} days ago)
**Last Contacted:** ${context.lead.last_contacted_at ? `${new Date(context.lead.last_contacted_at).toLocaleDateString()} (${daysSinceContact} days ago)` : 'Never'}

**Subject:** ${context.lead.subject || 'No subject'}
**Original Message:** ${context.lead.message || 'No message provided'}

**Tags:** ${context.lead.tags?.length > 0 ? context.lead.tags.join(', ') : 'None'}
**Notes:** ${context.lead.notes || 'No notes'}

## Activity History (${context.activities.length} entries)
${context.activities.length > 0
    ? context.activities.map(a => `- [${a.type}] ${a.content}${a.user_name ? ` (by ${a.user_name})` : ''} — ${new Date(a.created_at).toLocaleDateString()}`).join('\n')
    : 'No activities recorded yet'}

## Guidelines
- Be professional yet personable
- Focus on building relationships and understanding the lead's needs
- Highlight relevant services based on the lead's inquiry
- Always aim to schedule a discovery call or meeting
- Be concise and action-oriented
- When asked to make changes, use the appropriate tool
- Provide context and reasoning with your responses
- If unsure about something, ask for clarification
- Use the AI generation tools to draft emails, analyze intent, qualify leads, and suggest next steps
- For management actions (status changes, updates), use the appropriate tool`
}

// =====================================================
// GEMINI API WITH FUNCTION CALLING
// =====================================================

interface GeminiToolsRequest {
  contents: Array<{
    role: 'user' | 'model' | 'function'
    parts: Array<{
      text?: string
      functionCall?: { name: string; args: Record<string, unknown> }
      functionResponse?: { name: string; response: unknown }
    }>
  }>
  tools?: Array<{
    functionDeclarations: Array<{
      name: string
      description: string
      parameters: {
        type: string
        properties: Record<string, unknown>
        required: string[]
      }
    }>
  }>
  systemInstruction?: { parts: Array<{ text: string }> }
  generationConfig?: {
    temperature?: number
    maxOutputTokens?: number
  }
}

async function callGeminiWithLeadTools(
  messages: AgentMessage[],
  systemPrompt: string
): Promise<AgentResponse> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  // Build tool declarations
  const toolDeclarations = Object.values(LEAD_AGENT_TOOLS).map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }))

  // Build message contents
  const contents: GeminiToolsRequest['contents'] = messages.map(msg => {
    if (msg.role === 'user') {
      return { role: 'user', parts: [{ text: msg.content || '' }] }
    } else if (msg.role === 'model') {
      const parts: GeminiToolsRequest['contents'][0]['parts'] = []
      if (msg.content) {
        parts.push({ text: msg.content })
      }
      if (msg.tool_calls) {
        msg.tool_calls.forEach(tc => {
          parts.push({ functionCall: { name: tc.name, args: tc.args } })
        })
      }
      return { role: 'model', parts }
    } else if (msg.role === 'tool' && msg.tool_results) {
      return {
        role: 'function' as const,
        parts: msg.tool_results.map(tr => ({
          functionResponse: { name: tr.call_id, response: tr.result }
        }))
      }
    }
    return { role: 'user', parts: [{ text: '' }] }
  })

  const request: GeminiToolsRequest = {
    contents,
    tools: [{ functionDeclarations: toolDeclarations }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  }

  const response = await fetch(
    `${GEMINI_API_URL}/models/${GEMINI_MODELS.PRO}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
    throw new Error(error.error?.message || `Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  const candidate = data.candidates?.[0]
  const parts = candidate?.content?.parts || []

  // Extract text and function calls
  let message: string | null = null
  const toolCalls: ToolCall[] = []
  const pendingActions: PendingAction[] = []

  for (const part of parts) {
    if (part.text) {
      message = part.text
    }
    if (part.functionCall) {
      const toolDef = LEAD_AGENT_TOOLS[part.functionCall.name as keyof typeof LEAD_AGENT_TOOLS]
      const toolCall: ToolCall = {
        id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: part.functionCall.name,
        args: part.functionCall.args || {},
      }
      toolCalls.push(toolCall)

      if (toolDef?.requires_confirmation) {
        pendingActions.push({
          tool_call: toolCall,
          description: `${toolDef.description}: ${JSON.stringify(part.functionCall.args)}`,
          requires_confirmation: true,
        })
      }
    }
  }

  return {
    message,
    tool_calls: toolCalls,
    pending_actions: pendingActions,
    tokens_used: data.usageMetadata?.totalTokenCount || 0,
  }
}

// =====================================================
// MAIN AGENT FUNCTION
// =====================================================

export async function chatWithLeadAgent(
  context: LeadContext,
  messages: AgentMessage[],
  userMessage: string
): Promise<AgentResponse> {
  const systemPrompt = buildLeadSystemPrompt(context)

  // Add new user message
  const allMessages: AgentMessage[] = [
    ...messages,
    { role: 'user', content: userMessage }
  ]

  return callGeminiWithLeadTools(allMessages, systemPrompt)
}

export { LEAD_AGENT_TOOLS }
