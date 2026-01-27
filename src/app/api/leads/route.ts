import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { CreateLeadInput } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const source = searchParams.get('source')
    const assignedTo = searchParams.get('assigned_to')
    const search = searchParams.get('search')

    let query = supabase
      .from('leads')
      .select(`
        *,
        assignee:profiles!leads_assigned_to_fkey(id, full_name, email, avatar_url),
        client:clients(id, name, company)
      `)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (priority) {
      query = query.eq('priority', priority)
    }

    if (source) {
      query = query.eq('source', source)
    }

    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`)
    }

    const { data: leads, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ leads })
  } catch (error) {
    console.error('Error fetching leads:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch leads' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateLeadInput = await request.json()

    const {
      name,
      email,
      phone,
      company,
      subject,
      message,
      source = 'website',
      source_page,
    } = body

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Use admin client to bypass RLS for public form submissions
    const supabase = createAdminClient()

    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        name,
        email,
        phone,
        company,
        subject,
        message,
        source,
        source_page,
        status: 'new',
        priority: 'medium',
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ lead }, { status: 201 })
  } catch (error) {
    console.error('Error creating lead:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create lead' },
      { status: 500 }
    )
  }
}
