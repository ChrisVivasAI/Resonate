'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ClientNavItem {
  id: string
  name: string
  status: 'active' | 'inactive' | 'lead'
}

/**
 * Lightweight hook for fetching client list for sidebar navigation.
 * Only fetches minimal data needed for display (id, name, status).
 */
export function useClientNavigation() {
  const [clients, setClients] = useState<ClientNavItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('id, name, status')
        .order('name', { ascending: true })
        .limit(50) // Limit for sidebar performance

      if (fetchError) throw fetchError

      setClients(data || [])
    } catch (err) {
      console.error('Error fetching clients for navigation:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch clients')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  // Subscribe to realtime updates for clients
  useEffect(() => {
    const channel = supabase
      .channel('clients_nav_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newClient = payload.new as ClientNavItem
            setClients((prev) => [...prev, { id: newClient.id, name: newClient.name, status: newClient.status }].sort((a, b) => a.name.localeCompare(b.name)))
          } else if (payload.eventType === 'UPDATE') {
            const updatedClient = payload.new as ClientNavItem
            setClients((prev) =>
              prev.map((c) =>
                c.id === updatedClient.id ? { id: updatedClient.id, name: updatedClient.name, status: updatedClient.status } : c
              ).sort((a, b) => a.name.localeCompare(b.name))
            )
          } else if (payload.eventType === 'DELETE') {
            setClients((prev) => prev.filter((c) => c.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Filter active clients for sidebar display
  const activeClients = clients.filter(c => c.status === 'active')

  return {
    clients,
    activeClients,
    loading,
    error,
    refetch: fetchClients,
  }
}
