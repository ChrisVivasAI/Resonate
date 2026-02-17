/**
 * Seed Team Members Script
 *
 * Creates 3 new team member accounts and ensures Christian's profile has role 'admin'.
 * Uses Supabase Admin API (service role key required).
 *
 * Usage:
 *   npx tsx scripts/seed-team-members.ts
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const TEAM_MEMBERS = [
  { email: 'kendrick@hgabstudios.com', full_name: 'Kendrick Vasquez', password: 'TempPass123!' },
  { email: 'biscayne@hgabstudios.com', full_name: 'Biscayne Boeck', password: 'TempPass123!' },
  { email: 'mariana@hgabstudios.com', full_name: 'Mariana Diaz', password: 'TempPass123!' },
]

async function main() {
  console.log('Seeding team members...\n')

  // 1. Create new team member accounts
  for (const member of TEAM_MEMBERS) {
    console.log(`Creating user: ${member.full_name} (${member.email})`)

    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existing = existingUsers?.users?.find(u => u.email === member.email)

    if (existing) {
      console.log(`  -> Already exists (${existing.id}), updating profile...`)
      await supabase
        .from('profiles')
        .update({ full_name: member.full_name, role: 'admin' })
        .eq('id', existing.id)
      continue
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: member.email,
      password: member.password,
      email_confirm: true,
      user_metadata: { full_name: member.full_name },
    })

    if (error) {
      console.error(`  -> Error: ${error.message}`)
      continue
    }

    console.log(`  -> Created (${data.user.id})`)

    // The handle_new_user trigger should auto-create the profile,
    // but let's ensure the name and role are set
    await supabase
      .from('profiles')
      .update({ full_name: member.full_name, role: 'admin' })
      .eq('id', data.user.id)

    console.log(`  -> Profile updated with role 'admin'`)
  }

  // 2. Ensure Christian's profile has role 'admin'
  console.log('\nEnsuring Christian Vivas has admin role...')
  const { data: christianProfile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .ilike('email', '%christian%')
    .single()

  if (christianProfile) {
    if (christianProfile.role !== 'admin') {
      await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', christianProfile.id)
      console.log(`  -> Updated ${christianProfile.full_name} to admin`)
    } else {
      console.log(`  -> ${christianProfile.full_name} already has admin role`)
    }
  } else {
    console.log('  -> Christian profile not found (search by email containing "christian")')
  }

  console.log('\nDone!')
}

main().catch(console.error)
