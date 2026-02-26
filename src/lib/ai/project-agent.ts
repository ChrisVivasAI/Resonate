import { GEMINI_MODELS } from './gemini'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta'

// =====================================================
// TYPES
// =====================================================

export interface ProjectContext {
  project: {
    id: string
    name: string
    description: string | null
    status: string
    priority: string
    budget: number
    spent: number
    start_date: string | null
    due_date: string | null
    progress: number
    tags: string[]
    client?: { id: string; name: string; company: string | null; email?: string }
  }
  tasks: Array<{
    id: string
    title: string
    description: string | null
    status: string
    priority: string
    due_date: string | null
    assigned_to: string | null
    assignee_id: string | null
    completed_at: string | null
    order: number
  }>
  milestones: Array<{
    id: string
    title: string
    description: string | null
    due_date: string | null
    completed_at: string | null
    payment_amount: number | null
    is_paid: boolean
    sort_order: number
  }>
  deliverables: Array<{
    id: string
    title: string
    description: string | null
    type: string
    status: string
    current_version: number
    draft_url: string | null
    final_url: string | null
    created_at: string
  }>
  financials: {
    budget: number
    totalExpenses: number
    totalLabor: number
    remainingBudget: number
    reimbursementsPending: number
    returnsPending: number
    expenses: Array<{
      id: string
      category: string
      description: string | null
      amount: number
      vendor: string | null
      is_billable: boolean
      markup_percent: number
      date: string
    }>
    laborEntries: Array<{
      id: string
      role: string
      team_member_name: string | null
      hourly_rate: number
      estimated_hours: number
      actual_hours: number
      total_cost: number
    }>
    reimbursements: Array<{
      id: string
      description: string
      amount: number
      status: string
    }>
    returns: Array<{
      id: string
      description: string
      amount: number
      status: string
    }>
  }
  recentActivity: Array<{
    type: string
    description: string
    created_at: string
  }>
  teamMembers?: Array<{
    id: string
    full_name: string
    role: string
    source: 'profile' | 'external'
  }>
  similarProjects?: Array<{
    id: string
    name: string
    budget: number
    final_cost: number
    duration_days: number
    status: string
  }>
}

export interface ToolCall {
  id: string
  name: string
  args: Record<string, unknown>
}

export interface ToolResult {
  call_id: string
  result: unknown
  error?: string
}

export interface PendingAction {
  tool_call: ToolCall
  description: string
  requires_confirmation: boolean
  preview?: unknown
}

export interface AgentMessage {
  role: 'user' | 'model' | 'tool'
  content?: string
  tool_calls?: ToolCall[]
  tool_results?: ToolResult[]
}

export interface AgentResponse {
  message: string | null
  tool_calls: ToolCall[]
  pending_actions: PendingAction[]
  tokens_used: number
}

// =====================================================
// TOOL DEFINITIONS
// =====================================================

const AGENT_TOOLS = {
  // Task Management
  create_task: {
    name: 'create_task',
    description: 'Create a new task for the project',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title' },
        description: { type: 'string', description: 'Task description' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Task priority' },
        due_date: { type: 'string', description: 'Due date in YYYY-MM-DD format' },
        assigned_to: { type: 'string', description: 'UUID of team member to assign this task to. Reference team members by their ID shown in the Team Members section.' },
      },
      required: ['title'],
    },
    requires_confirmation: false,
  },

  update_task: {
    name: 'update_task',
    description: 'Update an existing task',
    parameters: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'ID of the task to update' },
        title: { type: 'string', description: 'New task title' },
        description: { type: 'string', description: 'New task description' },
        status: { type: 'string', enum: ['todo', 'in_progress', 'review', 'completed'], description: 'New status' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'New priority' },
        due_date: { type: 'string', description: 'New due date in YYYY-MM-DD format' },
        assigned_to: { type: 'string', description: 'UUID of team member to assign to (or empty to unassign)' },
      },
      required: ['task_id'],
    },
    requires_confirmation: false,
  },

  delete_task: {
    name: 'delete_task',
    description: 'Delete a task from the project',
    parameters: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'ID of the task to delete' },
        reason: { type: 'string', description: 'Reason for deletion' },
      },
      required: ['task_id'],
    },
    requires_confirmation: true, // Destructive action
  },

  // Milestone Management
  create_milestone: {
    name: 'create_milestone',
    description: 'Create a new milestone for the project',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Milestone title' },
        description: { type: 'string', description: 'Milestone description' },
        due_date: { type: 'string', description: 'Due date in YYYY-MM-DD format' },
      },
      required: ['title'],
    },
    requires_confirmation: false,
  },

  update_milestone: {
    name: 'update_milestone',
    description: 'Update an existing milestone',
    parameters: {
      type: 'object',
      properties: {
        milestone_id: { type: 'string', description: 'ID of the milestone to update' },
        title: { type: 'string', description: 'New milestone title' },
        description: { type: 'string', description: 'New description' },
        status: { type: 'string', enum: ['pending', 'in_progress', 'completed'], description: 'New status' },
        due_date: { type: 'string', description: 'New due date' },
      },
      required: ['milestone_id'],
    },
    requires_confirmation: false,
  },

  delete_milestone: {
    name: 'delete_milestone',
    description: 'Delete a milestone from the project',
    parameters: {
      type: 'object',
      properties: {
        milestone_id: { type: 'string', description: 'ID of the milestone to delete' },
        reason: { type: 'string', description: 'Reason for deletion' },
      },
      required: ['milestone_id'],
    },
    requires_confirmation: true, // Destructive action
  },

  // Deliverable Management
  create_deliverable: {
    name: 'create_deliverable',
    description: 'Create a new deliverable for client review',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Deliverable title' },
        description: { type: 'string', description: 'Deliverable description' },
        type: { type: 'string', enum: ['image', 'video', 'audio', 'document', 'text'], description: 'Deliverable type' },
      },
      required: ['title', 'type'],
    },
    requires_confirmation: false,
  },

  update_deliverable_status: {
    name: 'update_deliverable_status',
    description: 'Update the status of a deliverable',
    parameters: {
      type: 'object',
      properties: {
        deliverable_id: { type: 'string', description: 'ID of the deliverable' },
        status: { type: 'string', enum: ['draft', 'in_review', 'approved', 'rejected', 'final'], description: 'New status' },
      },
      required: ['deliverable_id', 'status'],
    },
    requires_confirmation: false,
  },

  // Financial Management
  add_expense: {
    name: 'add_expense',
    description: 'Add an expense to the project',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Expense category' },
        description: { type: 'string', description: 'Expense description' },
        amount: { type: 'number', description: 'Amount in dollars (pre-tax)' },
        vendor: { type: 'string', description: 'Vendor or person' },
        is_billable: { type: 'boolean', description: 'Whether to charge to client' },
        markup_percent: { type: 'number', description: 'Markup percentage for client' },
      },
      required: ['category', 'amount'],
    },
    requires_confirmation: false,
  },

  add_labor_entry: {
    name: 'add_labor_entry',
    description: 'Add a labor/time entry to the project',
    parameters: {
      type: 'object',
      properties: {
        role: { type: 'string', description: 'Role/position' },
        team_member_name: { type: 'string', description: 'Name of team member' },
        hourly_rate: { type: 'number', description: 'Hourly rate in dollars' },
        estimated_hours: { type: 'number', description: 'Estimated hours' },
        actual_hours: { type: 'number', description: 'Actual hours worked' },
      },
      required: ['role', 'hourly_rate'],
    },
    requires_confirmation: false,
  },

  // Expense Update/Delete
  update_expense: {
    name: 'update_expense',
    description: 'Update an existing expense',
    parameters: {
      type: 'object',
      properties: {
        expense_id: { type: 'string', description: 'ID of expense to update' },
        category: { type: 'string', description: 'New category' },
        description: { type: 'string', description: 'New description' },
        amount: { type: 'number', description: 'New amount in dollars (pre-tax)' },
        vendor: { type: 'string', description: 'New vendor name' },
        is_billable: { type: 'boolean', description: 'Whether to charge to client' },
        markup_percent: { type: 'number', description: 'Markup percentage' },
      },
      required: ['expense_id'],
    },
    requires_confirmation: false,
  },

  delete_expense: {
    name: 'delete_expense',
    description: 'Delete an expense from the project',
    parameters: {
      type: 'object',
      properties: {
        expense_id: { type: 'string', description: 'ID of expense to delete' },
      },
      required: ['expense_id'],
    },
    requires_confirmation: true,
  },

  // Labor Entry Update/Delete
  update_labor_entry: {
    name: 'update_labor_entry',
    description: 'Update an existing labor entry',
    parameters: {
      type: 'object',
      properties: {
        labor_id: { type: 'string', description: 'ID of labor entry to update' },
        role: { type: 'string', description: 'New role' },
        team_member_name: { type: 'string', description: 'New team member name' },
        hourly_rate: { type: 'number', description: 'New hourly rate' },
        estimated_hours: { type: 'number', description: 'New estimated hours' },
        actual_hours: { type: 'number', description: 'New actual hours' },
      },
      required: ['labor_id'],
    },
    requires_confirmation: false,
  },

  delete_labor_entry: {
    name: 'delete_labor_entry',
    description: 'Delete a labor entry from the project',
    parameters: {
      type: 'object',
      properties: {
        labor_id: { type: 'string', description: 'ID of labor entry to delete' },
      },
      required: ['labor_id'],
    },
    requires_confirmation: true,
  },

  // Project Update
  update_project: {
    name: 'update_project',
    description: 'Update project details like quote, dates, status, or description',
    parameters: {
      type: 'object',
      properties: {
        budget: { type: 'number', description: 'New quote amount' },
        start_date: { type: 'string', description: 'New start date (YYYY-MM-DD)' },
        due_date: { type: 'string', description: 'New due date (YYYY-MM-DD)' },
        status: { type: 'string', enum: ['draft', 'in_progress', 'review', 'completed', 'cancelled'], description: 'New status' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'New priority' },
        description: { type: 'string', description: 'New description' },
        progress: { type: 'number', description: 'New progress percentage (0-100)' },
      },
      required: [],
    },
    requires_confirmation: true,
  },

  // Deliverable Update/Delete
  update_deliverable: {
    name: 'update_deliverable',
    description: 'Update deliverable details (not just status)',
    parameters: {
      type: 'object',
      properties: {
        deliverable_id: { type: 'string', description: 'ID of deliverable to update' },
        title: { type: 'string', description: 'New title' },
        description: { type: 'string', description: 'New description' },
        type: { type: 'string', enum: ['image', 'video', 'audio', 'document', 'text'], description: 'New type' },
        status: { type: 'string', enum: ['draft', 'in_review', 'approved', 'rejected', 'final'], description: 'New status' },
        draft_url: { type: 'string', description: 'URL to draft file' },
        final_url: { type: 'string', description: 'URL to final file' },
      },
      required: ['deliverable_id'],
    },
    requires_confirmation: false,
  },

  delete_deliverable: {
    name: 'delete_deliverable',
    description: 'Delete a deliverable from the project',
    parameters: {
      type: 'object',
      properties: {
        deliverable_id: { type: 'string', description: 'ID of deliverable to delete' },
      },
      required: ['deliverable_id'],
    },
    requires_confirmation: true,
  },

  // Historical Data Access
  get_similar_projects: {
    name: 'get_similar_projects',
    description: 'Find similar past completed projects based on quote range or tags to help with planning and estimation',
    parameters: {
      type: 'object',
      properties: {
        budget_min: { type: 'number', description: 'Minimum quote to filter by' },
        budget_max: { type: 'number', description: 'Maximum quote to filter by' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags to filter by (e.g., branding, video, website)' },
        limit: { type: 'number', description: 'Max number of results (default 5)' },
      },
      required: [],
    },
    requires_confirmation: false,
  },

  get_historical_pricing: {
    name: 'get_historical_pricing',
    description: 'Get historical pricing data for labor roles and expense categories from past projects',
    parameters: {
      type: 'object',
      properties: {
        role: { type: 'string', description: 'Labor role to get pricing for (e.g., Designer, Developer)' },
        expense_category: { type: 'string', description: 'Expense category to get pricing for' },
      },
      required: [],
    },
    requires_confirmation: false,
  },

  // Query Tools
  get_project_summary: {
    name: 'get_project_summary',
    description: 'Get a summary of the current project status including progress, upcoming deadlines, and key metrics',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    requires_confirmation: false,
  },

  get_overdue_items: {
    name: 'get_overdue_items',
    description: 'Get all overdue tasks and milestones',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    requires_confirmation: false,
  },

  get_financial_summary: {
    name: 'get_financial_summary',
    description: 'Get detailed financial breakdown including expenses, labor costs, and quote status',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    requires_confirmation: false,
  },

  // Analysis Tools
  analyze_project_health: {
    name: 'analyze_project_health',
    description: 'Run an AI analysis of the project health and get recommendations',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    requires_confirmation: false,
  },

  suggest_next_steps: {
    name: 'suggest_next_steps',
    description: 'Get AI-suggested next steps based on current project state',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    requires_confirmation: false,
  },
}

// =====================================================
// SYSTEM PROMPT
// =====================================================

function buildSystemPrompt(context: ProjectContext): string {
  return `You are an AI project manager assistant for "${context.project.name}". You help manage this creative agency project by:

1. Answering questions about the project
2. Creating and updating tasks, milestones, and deliverables
3. Tracking expenses and labor
4. Providing insights and recommendations

## Current Project Context

**Project:** ${context.project.name}
**Client:** ${context.project.client?.name || 'No client assigned'} ${context.project.client?.company ? `(${context.project.client.company})` : ''}
**Status:** ${context.project.status}
**Priority:** ${context.project.priority}
**Progress:** ${context.project.progress}%
**Quote:** $${context.project.budget.toLocaleString()}
**Timeline:** ${context.project.start_date || 'Not set'} to ${context.project.due_date || 'Not set'}

**Description:** ${context.project.description || 'No description provided'}

## Tasks (${context.tasks.length} total)
${context.tasks.length > 0
    ? context.tasks.map(t => `- [${t.id}] [${t.status}] ${t.title} (${t.priority} priority)${t.due_date ? ` - Due: ${t.due_date}` : ''}${t.assignee_id ? ` - Assigned: ${t.assignee_id}` : ''}`).join('\n')
    : 'No tasks yet'}

## Team Members
${context.teamMembers && context.teamMembers.length > 0
    ? context.teamMembers.map(m => `- [${m.id}] ${m.full_name} (${m.role}) — ${m.source}`).join('\n')
    : 'No team members loaded'}

## Milestones (${context.milestones.length} total)
${context.milestones.length > 0
    ? context.milestones.map(m => `- [${m.id}] [${m.completed_at ? 'completed' : 'pending'}] ${m.title}${m.due_date ? ` - Due: ${m.due_date}` : ''}${m.payment_amount ? ` - Payment: $${m.payment_amount.toLocaleString()}` : ''}`).join('\n')
    : 'No milestones yet'}

## Deliverables (${context.deliverables.length} total)
${context.deliverables.length > 0
    ? context.deliverables.map(d => `- [${d.id}] [${d.status}] ${d.title} (${d.type})`).join('\n')
    : 'No deliverables yet'}

## Financial Summary
- Quote: $${context.financials.budget.toLocaleString()}
- Total Expenses: $${context.financials.totalExpenses.toLocaleString()}
- Total Labor: $${context.financials.totalLabor.toLocaleString()}
- Remaining on Quote: $${context.financials.remainingBudget.toLocaleString()}
- Pending Reimbursements: $${context.financials.reimbursementsPending.toLocaleString()}
- Pending Returns: $${context.financials.returnsPending.toLocaleString()}

### Expenses (${context.financials.expenses?.length || 0} entries)
${context.financials.expenses && context.financials.expenses.length > 0
    ? context.financials.expenses.map(e => `- [${e.id}] ${e.category}: $${e.amount.toLocaleString()} - ${e.description || 'No description'}${e.vendor ? ` (${e.vendor})` : ''}`).join('\n')
    : 'No expenses recorded'}

### Labor Entries (${context.financials.laborEntries?.length || 0} entries)
${context.financials.laborEntries && context.financials.laborEntries.length > 0
    ? context.financials.laborEntries.map(l => `- [${l.id}] ${l.role}${l.team_member_name ? ` (${l.team_member_name})` : ''}: $${l.hourly_rate}/hr × ${l.actual_hours}hrs = $${l.total_cost.toLocaleString()}`).join('\n')
    : 'No labor entries recorded'}

## Guidelines
- Be helpful, concise, and professional
- When creating tasks or milestones, suggest reasonable due dates based on project timeline
- When asked to make changes, use the appropriate tool
- Provide context and reasoning with your responses
- If unsure about something, ask for clarification
- For financial questions, always reference actual data from the context
- You have full access to modify project data: tasks, milestones, deliverables, expenses, labor entries, and project settings
- When updating or deleting items, always reference them by their ID shown in brackets above
- Use historical data tools (get_similar_projects, get_historical_pricing) to provide informed recommendations for quotes and timelines`
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

async function callGeminiWithTools(
  messages: AgentMessage[],
  systemPrompt: string
): Promise<AgentResponse> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  // Build tool declarations
  const toolDeclarations = Object.values(AGENT_TOOLS).map(tool => ({
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
      const toolDef = AGENT_TOOLS[part.functionCall.name as keyof typeof AGENT_TOOLS]
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
// PROJECT GENERATION
// =====================================================

/**
 * Schema that matches our Supabase database tables exactly
 * - tasks: status must be 'todo'|'in_progress'|'review'|'completed', priority 'low'|'medium'|'high'
 * - milestones: no status field, due_date is required
 * - deliverables: type must be 'image'|'video'|'audio'|'document'|'text'
 */
export interface GeneratedProjectPlan {
  tasks: Array<{
    title: string
    description: string
    priority: 'low' | 'medium' | 'high'
    estimated_days: number
    sort_order: number
    assigned_to_name?: string
  }>
  milestones: Array<{
    title: string
    description: string
    estimated_days: number
    sort_order: number
    payment_amount?: number
  }>
  deliverables: Array<{
    title: string
    description: string
    type: 'image' | 'video' | 'audio' | 'document' | 'text'
  }>
  estimated_budget_breakdown: {
    labor: number
    expenses: number
    contingency: number
  }
  recommended_team_roles: Array<{
    role: string
    hourly_rate: number
    estimated_hours: number
  }>
  project_phases: Array<{
    name: string
    description: string
    duration_days: number
  }>
}

export async function generateProjectPlan(
  projectInfo: {
    name: string
    description: string
    client_name?: string
    budget?: number
    start_date?: string
    due_date?: string
    project_type?: string
  },
  team_members?: Array<{ id: string; full_name: string; role: string }>
): Promise<GeneratedProjectPlan> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  // Calculate project duration in days for context
  let projectDurationDays = 30 // default
  if (projectInfo.start_date && projectInfo.due_date) {
    const start = new Date(projectInfo.start_date)
    const end = new Date(projectInfo.due_date)
    projectDurationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }

  const prompt = `You are a creative agency project manager. Generate a comprehensive project plan for the following project:

**Project Name:** ${projectInfo.name}
**Description:** ${projectInfo.description || 'A creative project requiring planning and execution'}
**Client:** ${projectInfo.client_name || 'Not specified'}
**Quote:** ${projectInfo.budget ? `$${projectInfo.budget.toLocaleString()}` : 'Not specified'}
**Timeline:** ${projectInfo.start_date || 'Not specified'} to ${projectInfo.due_date || 'Not specified'} (approximately ${projectDurationDays} days)
**Type:** ${projectInfo.project_type || 'Creative project'}
${team_members && team_members.length > 0
    ? `\nThe following team members are available. Assign each task to the most appropriate team member based on their role and the task requirements:\n${team_members.map(m => `- ${m.full_name} (${m.role})`).join('\n')}\n`
    : ''}
Generate a detailed project plan. IMPORTANT: Follow the JSON schema EXACTLY as specified below.

STRICT REQUIREMENTS:
- tasks.priority MUST be one of: "low", "medium", "high" (NOT "urgent")
- deliverables.type MUST be one of: "image", "video", "audio", "document", "text"
- estimated_days should be cumulative from project start (e.g., task at day 5, milestone at day 14)
- sort_order should be sequential starting from 1
- Quote breakdown should sum to approximately the project quote if specified
- Generate 5-10 tasks, 3-5 milestones, 3-6 deliverables based on project scope

Respond with ONLY a valid JSON object (no markdown, no explanation) following this EXACT structure:

{
  "tasks": [
    {
      "title": "Task name",
      "description": "Detailed task description",
      "priority": "low|medium|high",
      "estimated_days": 5,
      "sort_order": 1,
      "assigned_to_name": "Full name of assigned team member (optional)"
    }
  ],
  "milestones": [
    {
      "title": "Milestone name",
      "description": "What this milestone represents",
      "estimated_days": 14,
      "sort_order": 1,
      "payment_amount": 0
    }
  ],
  "deliverables": [
    {
      "title": "Deliverable name",
      "description": "What will be delivered",
      "type": "image|video|audio|document|text"
    }
  ],
  "estimated_budget_breakdown": {
    "labor": 0,
    "expenses": 0,
    "contingency": 0
  },
  "recommended_team_roles": [
    {
      "role": "Role title",
      "hourly_rate": 75,
      "estimated_hours": 20
    }
  ],
  "project_phases": [
    {
      "name": "Phase name",
      "description": "Phase description",
      "duration_days": 7
    }
  ]
}`

  const response = await fetch(
    `${GEMINI_API_URL}/models/${GEMINI_MODELS.PRO}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
    throw new Error(error.error?.message || `Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  // Parse JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/)
  const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text

  try {
    return JSON.parse(jsonStr.trim())
  } catch {
    throw new Error('Failed to parse project plan from AI response')
  }
}

// =====================================================
// MAIN AGENT FUNCTION
// =====================================================

export async function chatWithProjectAgent(
  context: ProjectContext,
  messages: AgentMessage[],
  userMessage: string
): Promise<AgentResponse> {
  const systemPrompt = buildSystemPrompt(context)

  // Add new user message
  const allMessages: AgentMessage[] = [
    ...messages,
    { role: 'user', content: userMessage }
  ]

  return callGeminiWithTools(allMessages, systemPrompt)
}

export { AGENT_TOOLS }
