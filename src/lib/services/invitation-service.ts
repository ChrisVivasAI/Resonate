import { createClient } from '@/lib/supabase/server'
import { nanoid } from 'nanoid'
import type { ClientInvitation } from '@/types'

const INVITATION_EXPIRY_DAYS = 7

export interface CreateInvitationParams {
  clientId: string
  email: string
  invitedBy: string
}

export interface InvitationValidation {
  valid: boolean
  invitation?: ClientInvitation
  error?: string
}

export async function createInvitation(params: CreateInvitationParams): Promise<ClientInvitation> {
  const supabase = await createClient()
  const { clientId, email, invitedBy } = params

  // Generate secure token
  const token = nanoid(32)

  // Set expiry date
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS)

  // Check for existing pending invitation
  const { data: existingInvitation } = await supabase
    .from('client_invitations')
    .select('*')
    .eq('client_id', clientId)
    .eq('email', email)
    .eq('status', 'pending')
    .single()

  if (existingInvitation) {
    // Update existing invitation with new token and expiry
    const { data, error } = await supabase
      .from('client_invitations')
      .update({
        token,
        expires_at: expiresAt.toISOString(),
        invited_by: invitedBy,
      })
      .eq('id', existingInvitation.id)
      .select('*, client:clients(*)')
      .single()

    if (error) throw new Error(error.message)
    return data as ClientInvitation
  }

  // Create new invitation
  const { data, error } = await supabase
    .from('client_invitations')
    .insert({
      client_id: clientId,
      email,
      token,
      invited_by: invitedBy,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
    })
    .select('*, client:clients(*)')
    .single()

  if (error) throw new Error(error.message)
  return data as ClientInvitation
}

export async function validateInvitationToken(token: string): Promise<InvitationValidation> {
  const supabase = await createClient()

  const { data: invitation, error } = await supabase
    .from('client_invitations')
    .select('*, client:clients(*)')
    .eq('token', token)
    .single()

  if (error || !invitation) {
    return { valid: false, error: 'Invitation not found' }
  }

  // Check if expired
  if (new Date(invitation.expires_at) < new Date()) {
    // Update status to expired
    await supabase
      .from('client_invitations')
      .update({ status: 'expired' })
      .eq('id', invitation.id)

    return { valid: false, error: 'Invitation has expired' }
  }

  // Check if already accepted
  if (invitation.status === 'accepted') {
    return { valid: false, error: 'Invitation has already been used' }
  }

  if (invitation.status === 'expired') {
    return { valid: false, error: 'Invitation has expired' }
  }

  return { valid: true, invitation: invitation as ClientInvitation }
}

export interface AcceptInvitationParams {
  token: string
  password: string
  fullName: string
}

export async function acceptInvitation(params: AcceptInvitationParams): Promise<void> {
  const supabase = await createClient()
  const { token, password, fullName } = params

  // Validate token first
  const validation = await validateInvitationToken(token)
  if (!validation.valid || !validation.invitation) {
    throw new Error(validation.error || 'Invalid invitation')
  }

  const invitation = validation.invitation

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: invitation.email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: 'client',
      },
    },
  })

  if (authError) throw new Error(authError.message)
  if (!authData.user) throw new Error('Failed to create user')

  // Update the profile with client role and link to client record
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      role: 'client',
      client_id: invitation.client_id,
      full_name: fullName,
    })
    .eq('id', authData.user.id)

  if (profileError) {
    console.error('Profile update error:', profileError)
  }

  // Update client record with profile_id
  const { error: clientError } = await supabase
    .from('clients')
    .update({
      profile_id: authData.user.id,
      portal_enabled: true,
    })
    .eq('id', invitation.client_id)

  if (clientError) {
    console.error('Client update error:', clientError)
  }

  // Mark invitation as accepted
  const { error: inviteError } = await supabase
    .from('client_invitations')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', invitation.id)

  if (inviteError) {
    console.error('Invitation update error:', inviteError)
  }
}

export async function getInvitationsForClient(clientId: string): Promise<ClientInvitation[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('client_invitations')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as ClientInvitation[]
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('client_invitations')
    .update({ status: 'expired' })
    .eq('id', invitationId)

  if (error) throw new Error(error.message)
}
