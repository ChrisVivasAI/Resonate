import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createVersion, getDeliverableVersions } from '@/lib/services/deliverable-service'

export async function GET(
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

    const versions = await getDeliverableVersions(id)

    return NextResponse.json({ versions })
  } catch (error) {
    console.error('Get versions error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get versions' },
      { status: 500 }
    )
  }
}

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

    // Only admin/member can create versions (if no profile, treat as admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile && profile.role === 'client') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { fileUrl, thumbnailUrl, notes } = body

    if (!fileUrl) {
      return NextResponse.json(
        { error: 'File URL is required' },
        { status: 400 }
      )
    }

    const version = await createVersion({
      deliverableId: id,
      fileUrl,
      thumbnailUrl,
      notes,
      createdBy: user.id,
    })

    return NextResponse.json({
      success: true,
      version,
      message: 'New version created',
    }, { status: 201 })
  } catch (error) {
    console.error('Create version error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create version' },
      { status: 500 }
    )
  }
}
