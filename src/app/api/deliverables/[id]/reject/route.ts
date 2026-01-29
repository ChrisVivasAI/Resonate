import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { approveDeliverable } from '@/lib/services/deliverable-service'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Verify deliverable exists and get its info
    const { data: deliverable } = await supabase
      .from('deliverables')
      .select('*, project:projects(*)')
      .eq('id', id)
      .single()

    if (!deliverable) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 })
    }

    // For client users, verify they have access to this project
    if (profile?.role === 'client') {
      const { data: clientRecord } = await supabase
        .from('clients')
        .select('id')
        .eq('profile_id', user.id)
        .single()

      if (!clientRecord || clientRecord.id !== deliverable.project?.client_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Client can only reject if status is in_review
      if (deliverable.status !== 'in_review') {
        return NextResponse.json(
          { error: 'Only deliverables in review can be rejected' },
          { status: 400 }
        )
      }
    }

    const body = await request.json()
    const { feedback, requestChanges } = body

    // Require feedback for rejection
    if (!feedback) {
      return NextResponse.json(
        { error: 'Feedback is required when rejecting a deliverable' },
        { status: 400 }
      )
    }

    const action = requestChanges ? 'requested_changes' : 'rejected'

    const rejected = await approveDeliverable({
      deliverableId: id,
      userId: user.id,
      action,
      feedback,
    })

    return NextResponse.json({
      success: true,
      deliverable: rejected,
      message: requestChanges ? 'Changes requested' : 'Deliverable rejected',
    })
  } catch (error) {
    console.error('Reject deliverable error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reject deliverable' },
      { status: 500 }
    )
  }
}
