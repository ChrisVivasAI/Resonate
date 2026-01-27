import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')
    const category = searchParams.get('category')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let query = supabase
      .from('expenses')
      .select('*, project:projects(id, name)')
      .order('date', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (startDate) {
      query = query.gte('date', startDate)
    }

    if (endDate) {
      query = query.lte('date', endDate)
    }

    const { data: expenses, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ expenses })
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch expenses' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      project_id,
      date,
      category,
      description,
      vendor_or_person,
      cost_pre_tax,
      tax,
      is_billable,
      markup_percent,
      is_paid,
      payment_method,
      notes,
    } = body

    if (!project_id || !category || cost_pre_tax === undefined) {
      return NextResponse.json(
        { error: 'Project ID, category, and cost are required' },
        { status: 400 }
      )
    }

    const { data: expense, error } = await supabase
      .from('expenses')
      .insert({
        project_id,
        date: date || new Date().toISOString().split('T')[0],
        category,
        description,
        vendor_or_person,
        cost_pre_tax,
        tax: tax || 0,
        is_billable: is_billable || false,
        markup_percent: markup_percent || 0,
        is_paid: is_paid || false,
        payment_method,
        notes,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ expense })
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create expense' },
      { status: 500 }
    )
  }
}
