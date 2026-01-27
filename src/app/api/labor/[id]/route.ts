import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: laborEntry, error } = await supabase
      .from('labor_entries')
      .select('*, team_member:profiles(id, full_name, email), project:projects(id, name)')
      .eq('id', id)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ laborEntry })
  } catch (error) {
    console.error('Error fetching labor entry:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch labor entry' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const { data: laborEntry, error } = await supabase
      .from('labor_entries')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ laborEntry })
  } catch (error) {
    console.error('Error updating labor entry:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update labor entry' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('labor_entries')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting labor entry:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete labor entry' },
      { status: 500 }
    )
  }
}
