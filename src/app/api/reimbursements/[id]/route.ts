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

    // If status is being changed to 'approved', set approved_by and date_approved
    if (body.status === 'approved') {
      body.approved_by = user.id
      body.date_approved = new Date().toISOString().split('T')[0]
    }

    // If status is being changed to 'paid', set date_paid
    if (body.status === 'paid' && !body.date_paid) {
      body.date_paid = new Date().toISOString().split('T')[0]
    }

    const { data: reimbursement, error } = await supabase
      .from('reimbursements')
      .update(body)
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
