'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: 'admin' | 'member' | 'client'
  created_at: string
  updated_at: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Create supabase client once using useMemo
  const supabase = useMemo(() => createClient(), [])

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      return data
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  }, [supabase])

  useEffect(() => {
    let isMounted = true

    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!isMounted) return

        setUser(user)

        if (user) {
          const profileData = await fetchProfile(user.id)
          if (isMounted) {
            setProfile(profileData)
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return

        setUser(session?.user ?? null)

        if (session?.user) {
          const profileData = await fetchProfile(session.user.id)
          if (isMounted) {
            setProfile(profileData)
          }
        } else {
          setProfile(null)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

  return { user, profile, loading }
}
