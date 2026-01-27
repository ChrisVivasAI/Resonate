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
    const status = searchParams.get('status')
    const personName = searchParams.get('person_name')

    let query = supabase
      .from('reimbursements')
      .select('*, project:projects(id, name), expense:expenses(id, description)')
      .order('date_incurred', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (personName) {
      query = query.ilike('person_name', `%${personName}%`)
    }

    const { data: reimbursements, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ reimbursements })
  } catch (error) {
    console.error('Error fetching reimbursements:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch reimbursements' },
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

    const { data: reimbursement, error } = await supabase
      .from('reimbursements')
      .insert({
        ...body,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ reimbursement }, { status: 201 })
  } catch (error) {
    console.error('Error creating reimbursement:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create reimbursement' },
      { status: 500 }
    )
  }
}
