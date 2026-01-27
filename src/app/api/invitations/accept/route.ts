import { NextRequest, NextResponse } from 'next/server'
import { acceptInvitation } from '@/lib/services/invitation-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password, fullName } = body

    if (!token || !password || !fullName) {
      return NextResponse.json(
        { error: 'Token, password, and full name are required' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    await acceptInvitation({ token, password, fullName })

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. You can now log in.',
    })
  } catch (error) {
    console.error('Accept invitation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to accept invitation' },
      { status: 500 }
    )
  }
}
