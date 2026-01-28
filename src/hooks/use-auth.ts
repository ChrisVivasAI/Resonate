'use client'

import { useAuthContext, type Profile } from '@/components/auth-provider'

// Re-export Profile type for backwards compatibility
export type { Profile }

/**
 * Hook to access auth state from the AuthProvider context.
 * This provides a single source of truth for auth state across the entire app.
 */
export function useAuth() {
  const { user, profile, loading, signOut, refreshSession, supabase } = useAuthContext()
  return { user, profile, loading, signOut, refreshSession, supabase }
}
