import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText, GEMINI_MODELS } from '@/lib/ai/gemini'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, context: additionalContext } = body

    // Fetch the lead with activities
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select(`
        *,
        activities:lead_activities(type, content, created_at)
      `)
      .eq('id', id)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Build context for the AI
    const leadContext = `
Lead Information:
- Name: ${lead.name}
- Email: ${lead.email}
- Company: ${lead.company || 'Not provided'}
- Phone: ${lead.phone || 'Not provided'}
- Subject: ${lead.subject || 'No subject'}
- Original Message: ${lead.message}
- Status: ${lead.status}
- Priority: ${lead.priority}
- Source: ${lead.source}
- Last Contacted: ${lead.last_contacted_at ? new Date(lead.last_contacted_at).toLocaleDateString() : 'Never'}

${lead.activities?.length > 0 ? `
Previous Interactions:
${lead.activities.map((a: { type: string; content: string; created_at: string }) => `- [${a.type}] ${a.content} (${new Date(a.created_at).toLocaleDateString()})`).join('\n')}
` : 'No previous interactions recorded.'}

${additionalContext ? `Additional Context: ${additionalContext}` : ''}
`

    const systemPrompt = `You are an AI assistant for Resonate, a creative agency. You help the team respond to and manage leads effectively.

About Resonate:
- We are a creative agency specializing in artist branding (Artist 360), brand development (Brand 360), and event coverage (Event 360)
- Our services include content creation, social media strategy, visual identity, and comprehensive creative solutions
- We work with artists, brands, and event organizers

Guidelines:
- Be professional yet personable
- Focus on building relationships and understanding the lead's needs
- Highlight relevant services based on the lead's inquiry
- Always aim to schedule a discovery call or meeting
- Be concise and action-oriented`

    let prompt = ''
    let response = ''

    switch (action) {
      case 'draft_response':
        prompt = `${leadContext}

Based on the lead's inquiry and any previous interactions, draft a professional email response. The goal is to:
1. Acknowledge their interest
2. Address their specific needs/questions
3. Propose a next step (like scheduling a call)

Write only the email body (no subject line). Use a warm, professional tone.`
        break

      case 'suggest_next_steps':
        prompt = `${leadContext}

Analyze this lead and suggest the best next steps to move them forward in the sales pipeline. Consider:
1. Their current status and priority
2. The nature of their inquiry
3. How long they've been in the pipeline
4. Previous interactions

Provide 3-5 specific, actionable recommendations.`
        break

      case 'analyze_intent':
        prompt = `${leadContext}

Analyze this lead's message and context to determine:
1. Their primary intent/need (what service are they most likely interested in?)
2. Urgency level (are they ready to buy or just exploring?)
3. Budget indicators (if any)
4. Decision-making capacity (are they the decision maker?)
5. Key concerns or objections to address

Provide a brief analysis with recommendations for the sales approach.`
        break

      case 'qualify_lead':
        prompt = `${leadContext}

Evaluate this lead using the BANT framework:
- Budget: Any indicators of their budget range?
- Authority: Are they the decision maker?
- Need: What is their specific need and how urgent?
- Timeline: When do they need to make a decision?

Provide a qualification score (Hot, Warm, Cold) with justification and recommended priority level.`
        break

      case 'follow_up_reminder':
        prompt = `${leadContext}

This lead needs follow-up. Generate a brief, personalized follow-up message that:
1. References their original inquiry
2. Adds value (perhaps a relevant case study or insight)
3. Has a clear call to action
4. Feels personal, not templated

Write the follow-up email body.`
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: draft_response, suggest_next_steps, analyze_intent, qualify_lead, or follow_up_reminder' },
          { status: 400 }
        )
    }

    response = await generateText(prompt, {
      model: GEMINI_MODELS.PRO,
      temperature: 0.7,
      maxTokens: 2048,
      systemPrompt,
    })

    // Log the AI assist activity
    await supabase.from('lead_activities').insert({
      lead_id: id,
      user_id: user.id,
      type: 'ai_assist',
      content: `AI assistance used: ${action}`,
      metadata: {
        action,
        additionalContext,
      },
    })

    return NextResponse.json({
      action,
      response,
      lead: {
        id: lead.id,
        name: lead.name,
        status: lead.status,
      },
    })
  } catch (error) {
    console.error('Error with AI assist:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate AI response' },
      { status: 500 }
    )
  }
}
