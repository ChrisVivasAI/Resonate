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

    // Whitelist allowed fields
    const allowedFields = ['description', 'status', 'net_return', 'restocking_fee', 'return_completed_date', 'refund_received_date', 'notes', 'tracking_number', 'vendor']
    const updates: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (key in body) updates[key] = body[key]
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // If status is being changed to 'completed', set return_completed_date
    if (updates.status === 'completed' && !updates.return_completed_date) {
      updates.return_completed_date = new Date().toISOString().split('T')[0]
    }

    // If refund_received_date is set, only auto-complete if current status is 'in_progress'
    if (updates.refund_received_date && !updates.status) {
      const { data: current } = await supabase
        .from('returns')
        .select('status')
        .eq('id', id)
        .single()
      if (current?.status === 'in_progress') {
        updates.status = 'completed'
        if (!updates.return_completed_date) {
          updates.return_completed_date = new Date().toISOString().split('T')[0]
        }
      }
    }

    // Status transition validation
    if (updates.status) {
      const { data: current } = await supabase
        .from('returns')
        .select('status')
        .eq('id', id)
        .single()
      const validTransitions: Record<string, string[]> = {
        pending: ['in_progress', 'cancelled'],
        in_progress: ['completed', 'cancelled'],
        completed: [],
        cancelled: [],
      }
      if (current && !validTransitions[current.status]?.includes(updates.status as string)) {
        return NextResponse.json(
          { error: `Cannot transition from '${current.status}' to '${updates.status}'` },
          { status: 400 }
        )
      }
    }

    const { data: returnEntry, error } = await supabase
      .from('returns')
      .update(updates)
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

    // Prevent deletion of in-progress or completed returns
    const { data: current } = await supabase
      .from('returns')
      .select('status')
      .eq('id', id)
      .single()
    if (current && ['completed', 'in_progress'].includes(current.status)) {
      return NextResponse.json(
        { error: 'Cannot delete a return that is in progress or completed' },
        { status: 400 }
      )
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
