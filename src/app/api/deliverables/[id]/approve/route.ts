import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { approveDeliverable, markAsFinal } from '@/lib/services/deliverable-service'

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

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

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
    if (profile.role === 'client') {
      const { data: clientRecord } = await supabase
        .from('clients')
        .select('id')
        .eq('profile_id', user.id)
        .single()

      if (!clientRecord || clientRecord.id !== deliverable.project?.client_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Client can only approve if status is in_review
      if (deliverable.status !== 'in_review') {
        return NextResponse.json(
          { error: 'Only deliverables in review can be approved' },
          { status: 400 }
        )
      }
    }

    const body = await request.json()
    const { feedback, markFinal } = body

    // If markFinal is requested (agency only), mark as final instead
    if (markFinal && ['admin', 'member'].includes(profile.role)) {
      if (deliverable.status !== 'approved') {
        return NextResponse.json(
          { error: 'Only approved deliverables can be marked as final' },
          { status: 400 }
        )
      }

      const finalDeliverable = await markAsFinal(id, user.id)
      return NextResponse.json({
        success: true,
        deliverable: finalDeliverable,
        message: 'Deliverable marked as final',
      })
    }

    const approved = await approveDeliverable({
      deliverableId: id,
      userId: user.id,
      action: 'approved',
      feedback,
    })

    return NextResponse.json({
      success: true,
      deliverable: approved,
      message: 'Deliverable approved',
    })
  } catch (error) {
    console.error('Approve deliverable error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to approve deliverable' },
      { status: 500 }
    )
  }
}
