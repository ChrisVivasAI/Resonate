'use client'

import { createContext, useContext, useEffect, useState, useMemo, useCallback, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Session } from '@supabase/supabase-js'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: 'admin' | 'member' | 'client'
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
  supabase: ReturnType<typeof createClient>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Create a single supabase client instance for the entire app
  const supabase = useMemo(() => createClient(), [])

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('[AuthProvider] Error fetching profile:', error)
        return null
      }
      return data as Profile
    } catch (error) {
      console.error('[AuthProvider] Error fetching profile:', error)
      return null
    }
  }, [supabase])

  const refreshSession = useCallback(async () => {
    try {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('[AuthProvider] Error refreshing session:', error)
        return
      }

      setSession(currentSession)
      setUser(currentSession?.user ?? null)

      if (currentSession?.user) {
        const profileData = await fetchProfile(currentSession.user.id)
        setProfile(profileData)
      } else {
        setProfile(null)
      }
    } catch (error) {
      console.error('[AuthProvider] Error refreshing session:', error)
    }
  }, [supabase, fetchProfile])

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      setSession(null)
    } catch (error) {
      console.error('[AuthProvider] Error signing out:', error)
    }
  }, [supabase])

  useEffect(() => {
    let loadingSet = false

    const setLoadingOnce = (value: boolean) => {
      if (!loadingSet) {
        loadingSet = true
        setLoading(value)
      }
    }

    // Listen for auth state changes - this often fires before getSession resolves
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession)
        setUser(newSession?.user ?? null)

        // Set loading to false immediately - don't wait for profile
        setLoadingOnce(false)

        // Fetch profile in background
        if (newSession?.user) {
          fetchProfile(newSession.user.id).then(profileData => {
            setProfile(profileData)
          })
        } else {
          setProfile(null)
        }
      }
    )

    // Also try getSession as backup
    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (error) {
        console.error('[AuthProvider] Error getting initial session:', error)
        setLoadingOnce(false)
        return
      }

      // Only update if we haven't already via onAuthStateChange
      if (!loadingSet) {
        setSession(initialSession)
        setUser(initialSession?.user ?? null)

        if (initialSession?.user) {
          fetchProfile(initialSession.user.id).then(profileData => {
            setProfile(profileData)
            setLoadingOnce(false)
          })
        } else {
          setLoadingOnce(false)
        }
      }
    }).catch(err => {
      console.error('[AuthProvider] getSession error:', err)
      setLoadingOnce(false)
    })

    // Fallback timeout in case nothing fires
    const timeout = setTimeout(() => {
      setLoadingOnce(false)
    }, 3000)

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

  const value = useMemo(() => ({
    user,
    profile,
    session,
    loading,
    signOut,
    refreshSession,
    supabase,
  }), [user, profile, session, loading, signOut, refreshSession, supabase])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
