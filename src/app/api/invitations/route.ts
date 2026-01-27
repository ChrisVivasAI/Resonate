import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createInvitation } from '@/lib/services/invitation-service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin or member
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'member'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { clientId, email } = body

    if (!clientId || !email) {
      return NextResponse.json(
        { error: 'Client ID and email are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if client exists
    const { data: client } = await supabase
      .from('clients')
      .select('id, name, email')
      .eq('id', clientId)
      .single()

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Create invitation
    const invitation = await createInvitation({
      clientId,
      email,
      invitedBy: user.id,
    })

    // Generate invitation URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteUrl = `${baseUrl}/auth/invite/${invitation.token}`

    // TODO: Send email with invitation link
    // For now, log to console in development
    console.log('=== Client Invitation Created ===')
    console.log(`Client: ${client.name}`)
    console.log(`Email: ${email}`)
    console.log(`Invitation URL: ${inviteUrl}`)
    console.log('=================================')

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        status: invitation.status,
        expires_at: invitation.expires_at,
      },
      inviteUrl,
    })
  } catch (error) {
    console.error('Create invitation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create invitation' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    let query = supabase
      .from('client_invitations')
      .select('*, client:clients(*)')
      .order('created_at', { ascending: false })

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)

    return NextResponse.json({ invitations: data })
  } catch (error) {
    console.error('Get invitations error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get invitations' },
      { status: 500 }
    )
  }
}
