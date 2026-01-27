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

    const { data: returnEntry, error } = await supabase
      .from('returns')
      .select('*, project:projects(id, name), expense:expenses(id, description)')
      .eq('id', id)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ return: returnEntry })
  } catch (error) {
    console.error('Error fetching return:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch return' },
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

    // If status is being changed to 'completed', set return_completed_date
    if (body.status === 'completed' && !body.return_completed_date) {
      body.return_completed_date = new Date().toISOString().split('T')[0]
    }

    // If refund_received_date is set, update status to completed
    if (body.refund_received_date && !body.status) {
      body.status = 'completed'
    }

    const { data: returnEntry, error } = await supabase
      .from('returns')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ return: returnEntry })
  } catch (error) {
    console.error('Error updating return:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update return' },
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
      .from('returns')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting return:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete return' },
      { status: 500 }
    )
  }
}
