import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { submitForReview } from '@/lib/services/deliverable-service'

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

    // Only admin/member can submit deliverables for review (if no profile, treat as admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile && profile.role === 'client') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify deliverable exists and is in draft status
    const { data: existing } = await supabase
      .from('deliverables')
      .select('status')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 })
    }

    if (existing.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft deliverables can be submitted for review' },
        { status: 400 }
      )
    }

    const deliverable = await submitForReview(id, user.id)

    return NextResponse.json({
      success: true,
      deliverable,
      message: 'Deliverable submitted for review',
    })
  } catch (error) {
    console.error('Submit deliverable error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit deliverable' },
      { status: 500 }
    )
  }
}
