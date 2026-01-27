import { NextRequest, NextResponse } from 'next/server'
import { validateInvitationToken } from '@/lib/services/invitation-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    const validation = await validateInvitationToken(token)

    if (!validation.valid) {
      return NextResponse.json(
        { valid: false, error: validation.error },
        { status: 400 }
      )
    }

    // Return invitation details (without exposing the token)
    const { invitation } = validation
    return NextResponse.json({
      valid: true,
      invitation: {
        id: invitation?.id,
        email: invitation?.email,
        expires_at: invitation?.expires_at,
        client: invitation?.client ? {
          id: invitation.client.id,
          name: invitation.client.name,
          company: invitation.client.company,
        } : null,
      },
    })
  } catch (error) {
    console.error('Validate invitation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to validate invitation' },
      { status: 500 }
    )
  }
}
