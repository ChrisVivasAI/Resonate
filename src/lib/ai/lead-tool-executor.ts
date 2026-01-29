import { createClient } from '@/lib/supabase/server'
import { generateText, GEMINI_MODELS } from './gemini'
import type { ToolCall, ToolResult } from './project-agent'
import type { LeadContext } from './lead-agent'

// =====================================================
// LEAD TOOL EXECUTOR
// =====================================================

export async function executeLeadToolCall(
  leadId: string,
  toolCall: ToolCall,
  context: LeadContext
): Promise<ToolResult> {
  const supabase = await createClient()

  try {
    switch (toolCall.name) {
      // =============== AI GENERATION TOOLS ===============
      case 'draft_email_response': {
        const { tone } = toolCall.args as { tone?: string }
        const toneStr = tone || 'professional'

        const prompt = `Lead Information:
- Name: ${context.lead.name}
- Email: ${context.lead.email}
- Company: ${context.lead.company || 'Not provided'}
- Subject: ${context.lead.subject || 'No subject'}
- Original Message: ${context.lead.message || 'No message'}
- Status: ${context.lead.status}
- Previous Interactions: ${context.activities.length > 0 ? context.activities.map(a => `[${a.type}] ${a.content}`).join('; ') : 'None'}

Based on the lead's inquiry and any previous interactions, draft a ${toneStr} email response. The goal is to:
1. Acknowledge their interest
2. Address their specific needs/questions
3. Propose a next step (like scheduling a call)

Write only the email body (no subject line). Use a warm, ${toneStr} tone.`

        const systemPrompt = `You are an AI assistant for Resonate, a creative agency specializing in artist branding (Artist 360), brand development (Brand 360), and event coverage (Event 360). Draft professional email responses.`

        const response = await generateText(prompt, {
          model: GEMINI_MODELS.PRO,
          temperature: 0.7,
          maxTokens: 2048,
          systemPrompt,
        })

        return {
          call_id: toolCall.id,
          result: { success: true, email_draft: response, message: 'Email draft generated' },
        }
      }

      case 'suggest_next_steps': {
        const daysSinceCreated = Math.floor((Date.now() - new Date(context.lead.created_at).getTime()) / (1000 * 60 * 60 * 24))
        const daysSinceContact = context.lead.last_contacted_at
          ? Math.floor((Date.now() - new Date(context.lead.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24))
          : null

        const prompt = `Lead Information:
- Name: ${context.lead.name}
- Status: ${context.lead.status}
- Priority: ${context.lead.priority}
- Days in pipeline: ${daysSinceCreated}
- Days since last contact: ${daysSinceContact !== null ? daysSinceContact : 'Never contacted'}
- Original inquiry: ${context.lead.message || 'No message'}
- Activities: ${context.activities.length > 0 ? context.activities.map(a => `[${a.type}] ${a.content}`).join('; ') : 'None'}

Analyze this lead and suggest the best next steps to move them forward in the sales pipeline. Consider:
1. Their current status and priority
2. The nature of their inquiry
3. How long they've been in the pipeline
4. Previous interactions

Provide 3-5 specific, actionable recommendations.`

        const response = await generateText(prompt, {
          model: GEMINI_MODELS.PRO,
          temperature: 0.7,
          maxTokens: 2048,
          systemPrompt: 'You are a sales strategy advisor for a creative agency. Provide actionable next steps.',
        })

        return {
          call_id: toolCall.id,
          result: { success: true, next_steps: response, message: 'Next steps generated' },
        }
      }

      case 'analyze_intent': {
        const prompt = `Lead Information:
- Name: ${context.lead.name}
- Company: ${context.lead.company || 'Not provided'}
- Subject: ${context.lead.subject || 'No subject'}
- Original Message: ${context.lead.message || 'No message'}
- Source: ${context.lead.source}
- Status: ${context.lead.status}
- Activities: ${context.activities.length > 0 ? context.activities.map(a => `[${a.type}] ${a.content}`).join('; ') : 'None'}

Analyze this lead's message and context to determine:
1. Their primary intent/need (what service are they most likely interested in?)
2. Urgency level (are they ready to buy or just exploring?)
3. Budget indicators (if any)
4. Decision-making capacity (are they the decision maker?)
5. Key concerns or objections to address

Provide a brief analysis with recommendations for the sales approach.`

        const response = await generateText(prompt, {
          model: GEMINI_MODELS.PRO,
          temperature: 0.7,
          maxTokens: 2048,
          systemPrompt: 'You are a sales intelligence analyst for a creative agency. Analyze lead intent and provide actionable insights.',
        })

        return {
          call_id: toolCall.id,
          result: { success: true, analysis: response, message: 'Intent analysis complete' },
        }
      }

      case 'qualify_lead': {
        const prompt = `Lead Information:
- Name: ${context.lead.name}
- Email: ${context.lead.email}
- Company: ${context.lead.company || 'Not provided'}
- Phone: ${context.lead.phone || 'Not provided'}
- Subject: ${context.lead.subject || 'No subject'}
- Original Message: ${context.lead.message || 'No message'}
- Source: ${context.lead.source}
- Status: ${context.lead.status}
- Priority: ${context.lead.priority}
- Activities: ${context.activities.length > 0 ? context.activities.map(a => `[${a.type}] ${a.content}`).join('; ') : 'None'}

Evaluate this lead using the BANT framework:
- Budget: Any indicators of their budget range?
- Authority: Are they the decision maker?
- Need: What is their specific need and how urgent?
- Timeline: When do they need to make a decision?

Provide a qualification score (Hot, Warm, Cold) with justification and recommended priority level.`

        const response = await generateText(prompt, {
          model: GEMINI_MODELS.PRO,
          temperature: 0.7,
          maxTokens: 2048,
          systemPrompt: 'You are a lead qualification specialist. Evaluate leads using the BANT framework and provide clear scoring.',
        })

        return {
          call_id: toolCall.id,
          result: { success: true, qualification: response, message: 'Lead qualification complete' },
        }
      }

      case 'generate_follow_up': {
        const prompt = `Lead Information:
- Name: ${context.lead.name}
- Email: ${context.lead.email}
- Company: ${context.lead.company || 'Not provided'}
- Subject: ${context.lead.subject || 'No subject'}
- Original Message: ${context.lead.message || 'No message'}
- Last Contacted: ${context.lead.last_contacted_at ? new Date(context.lead.last_contacted_at).toLocaleDateString() : 'Never'}
- Activities: ${context.activities.length > 0 ? context.activities.map(a => `[${a.type}] ${a.content}`).join('; ') : 'None'}

This lead needs follow-up. Generate a brief, personalized follow-up message that:
1. References their original inquiry
2. Adds value (perhaps a relevant case study or insight)
3. Has a clear call to action
4. Feels personal, not templated

Write the follow-up email body.`

        const response = await generateText(prompt, {
          model: GEMINI_MODELS.PRO,
          temperature: 0.7,
          maxTokens: 2048,
          systemPrompt: 'You are an AI assistant for Resonate, a creative agency. Generate personalized follow-up emails that feel authentic and drive action.',
        })

        return {
          call_id: toolCall.id,
          result: { success: true, follow_up: response, message: 'Follow-up email generated' },
        }
      }

      // =============== LEAD MANAGEMENT TOOLS ===============
      case 'update_lead_status': {
        const { status } = toolCall.args as { status: string }

        const { error } = await supabase
          .from('leads')
          .update({ status })
          .eq('id', leadId)

        if (error) throw error

        // Log activity
        await supabase.from('lead_activities').insert({
          lead_id: leadId,
          type: 'status_change',
          content: `Status changed to ${status}`,
        })

        return {
          call_id: toolCall.id,
          result: { success: true, message: `Lead status updated to: ${status}` },
        }
      }

      case 'update_lead_priority': {
        const { priority } = toolCall.args as { priority: string }

        const { error } = await supabase
          .from('leads')
          .update({ priority })
          .eq('id', leadId)

        if (error) throw error

        return {
          call_id: toolCall.id,
          result: { success: true, message: `Lead priority updated to: ${priority}` },
        }
      }

      case 'add_note': {
        const { content } = toolCall.args as { content: string }

        const { error } = await supabase
          .from('lead_activities')
          .insert({
            lead_id: leadId,
            type: 'note',
            content,
          })

        if (error) throw error

        return {
          call_id: toolCall.id,
          result: { success: true, message: 'Note added successfully' },
        }
      }

      case 'add_activity': {
        const { type, content } = toolCall.args as { type: string; content: string }

        const { error } = await supabase
          .from('lead_activities')
          .insert({
            lead_id: leadId,
            type,
            content,
          })

        if (error) throw error

        // Update last_contacted_at for communication activities
        if (['email', 'call', 'meeting'].includes(type)) {
          await supabase
            .from('leads')
            .update({ last_contacted_at: new Date().toISOString() })
            .eq('id', leadId)
        }

        return {
          call_id: toolCall.id,
          result: { success: true, message: `Activity logged: ${type}` },
        }
      }

      case 'update_lead': {
        const { name, email, phone, company, tags, notes } = toolCall.args as {
          name?: string
          email?: string
          phone?: string
          company?: string
          tags?: string[]
          notes?: string
        }

        const updates: Record<string, unknown> = {}
        if (name !== undefined) updates.name = name
        if (email !== undefined) updates.email = email
        if (phone !== undefined) updates.phone = phone
        if (company !== undefined) updates.company = company
        if (tags !== undefined) updates.tags = tags
        if (notes !== undefined) updates.notes = notes

        const { error } = await supabase
          .from('leads')
          .update(updates)
          .eq('id', leadId)

        if (error) throw error

        return {
          call_id: toolCall.id,
          result: { success: true, message: 'Lead details updated', updated_fields: Object.keys(updates) },
        }
      }

      // =============== QUERY TOOLS ===============
      case 'get_lead_summary': {
        const daysSinceCreated = Math.floor((Date.now() - new Date(context.lead.created_at).getTime()) / (1000 * 60 * 60 * 24))
        const daysSinceContact = context.lead.last_contacted_at
          ? Math.floor((Date.now() - new Date(context.lead.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24))
          : null

        return {
          call_id: toolCall.id,
          result: {
            name: context.lead.name,
            email: context.lead.email,
            company: context.lead.company,
            status: context.lead.status,
            priority: context.lead.priority,
            source: context.lead.source,
            days_in_pipeline: daysSinceCreated,
            days_since_contact: daysSinceContact,
            total_activities: context.activities.length,
            tags: context.lead.tags,
            has_notes: !!context.lead.notes,
          },
        }
      }

      case 'get_activity_history': {
        const { limit } = toolCall.args as { limit?: number }
        const maxItems = limit || 10
        const recentActivities = context.activities.slice(0, maxItems)

        return {
          call_id: toolCall.id,
          result: {
            activities: recentActivities,
            total: context.activities.length,
            showing: recentActivities.length,
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
