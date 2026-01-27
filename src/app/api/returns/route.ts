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
    const vendor = searchParams.get('vendor')

    let query = supabase
      .from('returns')
      .select('*, project:projects(id, name), expense:expenses(id, description)')
      .order('return_initiated_date', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (vendor) {
      query = query.ilike('vendor', `%${vendor}%`)
    }

    const { data: returns, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ returns })
  } catch (error) {
    console.error('Error fetching returns:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch returns' },
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

    const { data: returnEntry, error } = await supabase
      .from('returns')
      .insert({
        ...body,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ return: returnEntry }, { status: 201 })
  } catch (error) {
    console.error('Error creating return:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create return' },
      { status: 500 }
    )
  }
}
