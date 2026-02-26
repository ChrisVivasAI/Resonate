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

    const { data: reimbursement, error } = await supabase
      .from('reimbursements')
      .select('*, project:projects(id, name), expense:expenses(id, description)')
      .eq('id', id)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ reimbursement })
  } catch (error) {
    console.error('Error fetching reimbursement:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch reimbursement' },
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
    const allowedFields = ['description', 'amount', 'status', 'notes', 'receipt_url', 'person_name']
    const updates: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (key in body) updates[key] = body[key]
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Role check for approval/payment
    if (updates.status === 'approved' || updates.status === 'paid') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (!profile || !['admin', 'member'].includes(profile.role)) {
        return NextResponse.json({ error: 'Only admins and members can approve or pay reimbursements' }, { status: 403 })
      }
    }

    // Status transition validation
    if (updates.status) {
      const { data: current } = await supabase
        .from('reimbursements')
        .select('status')
        .eq('id', id)
        .single()
      const validTransitions: Record<string, string[]> = {
        pending: ['approved', 'rejected'],
        approved: ['paid', 'rejected'],
        rejected: ['pending'],
        paid: [],
      }
      if (current && !validTransitions[current.status]?.includes(updates.status as string)) {
        return NextResponse.json(
          { error: `Cannot transition from '${current.status}' to '${updates.status}'` },
          { status: 400 }
        )
      }
    }

    // If status is being changed to 'approved', set approved_by and date_approved
    if (updates.status === 'approved') {
      updates.approved_by = user.id
      updates.date_approved = new Date().toISOString().split('T')[0]
    }

    // If status is being changed to 'paid', set date_paid
    if (updates.status === 'paid' && !updates.date_paid) {
      updates.date_paid = new Date().toISOString().split('T')[0]
    }

    const { data: reimbursement, error } = await supabase
      .from('reimbursements')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ reimbursement })
  } catch (error) {
    console.error('Error updating reimbursement:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update reimbursement' },
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
      .from('reimbursements')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting reimbursement:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete reimbursement' },
      { status: 500 }
    )
  }
}
