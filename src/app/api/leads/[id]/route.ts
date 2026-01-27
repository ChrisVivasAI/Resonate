import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UpdateLeadInput } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: lead, error } = await supabase
      .from('leads')
      .select(`
        *,
        assignee:profiles!leads_assigned_to_fkey(id, full_name, email, avatar_url),
        client:clients(id, name, company),
        activities:lead_activities(
          id,
          type,
          content,
          metadata,
          created_at,
          user:profiles(id, full_name, email, avatar_url)
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
      }
      throw new Error(error.message)
    }

    return NextResponse.json({ lead })
  } catch (error) {
    console.error('Error fetching lead:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch lead' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: UpdateLeadInput = await request.json()
    const {
      name,
      email,
      phone,
      company,
      subject,
      message,
      status,
      priority,
      assigned_to,
      notes,
      tags,
    } = body

    // Get the current lead to check for status changes
    const { data: currentLead } = await supabase
      .from('leads')
      .select('status')
      .eq('id', id)
      .single()

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (company !== undefined) updateData.company = company
    if (subject !== undefined) updateData.subject = subject
    if (message !== undefined) updateData.message = message
    if (status !== undefined) updateData.status = status
    if (priority !== undefined) updateData.priority = priority
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to
    if (notes !== undefined) updateData.notes = notes
    if (tags !== undefined) updateData.tags = tags

    const { data: lead, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        assignee:profiles!leads_assigned_to_fkey(id, full_name, email, avatar_url),
        client:clients(id, name, company)
      `)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    // Log status change as activity
    if (status && currentLead && currentLead.status !== status) {
      await supabase.from('lead_activities').insert({
        lead_id: id,
        user_id: user.id,
        type: 'status_change',
        content: `Status changed from ${currentLead.status} to ${status}`,
        metadata: {
          old_status: currentLead.status,
          new_status: status,
        },
      })
    }

    return NextResponse.json({ lead })
  } catch (error) {
    console.error('Error updating lead:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update lead' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting lead:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete lead' },
      { status: 500 }
    )
  }
}
