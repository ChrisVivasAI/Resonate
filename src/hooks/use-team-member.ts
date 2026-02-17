'use client'

import { useState, useEffect, useCallback } from 'react'
import type { LaborEntry } from './use-labor'

export interface TeamMember {
  id: string
  full_name: string
  email: string
  role: string
  avatar_url: string | null
  source: 'profile' | 'external'
  laborCount: number
  activeProjects: number
  totalOwed: number
  totalPaid: number
  totalEarned: number
}

export interface AssignedTask {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'review' | 'completed'
  priority: 'low' | 'medium' | 'high'
  due_date?: string
  project_id: string
  project?: { id: string; name: string }
}

export interface TeamMemberDetail {
  profile: {
    id: string
    full_name: string
    email: string
    role: string
    avatar_url: string | null
  }
  laborEntries: LaborEntry[]
  assignedTasks?: AssignedTask[]
  totals: {
    totalEarned: number
    totalOwed: number
    totalPaid: number
    activeProjects: number
    entryCount: number
  }
}

export function useTeamMembers() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/team')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch team members')
      }

      setMembers(data.members)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch team members')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const addTeamMember = async (member: { full_name: string; email?: string; phone?: string; role?: string; notes?: string }) => {
    const response = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(member),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Failed to add team member')
    await fetchMembers()
    return data.member
  }

  const updateTeamMember = async (id: string, updates: { full_name?: string; email?: string; phone?: string; role?: string; notes?: string }) => {
    const response = await fetch(`/api/team/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Failed to update team member')
    await fetchMembers()
    return data.member
  }

  const deleteTeamMember = async (id: string) => {
    const response = await fetch(`/api/team/${id}`, { method: 'DELETE' })
    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to delete team member')
    }
    await fetchMembers()
  }

  return { members, loading, error, refetch: fetchMembers, addTeamMember, updateTeamMember, deleteTeamMember }
}

export function useTeamMember(memberId: string | null) {
  const [data, setData] = useState<TeamMemberDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMember = useCallback(async () => {
    if (!memberId) {
      setData(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/team/${memberId}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch team member')
      }

      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch team member')
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    fetchMember()
  }, [fetchMember])

  return { data, loading, error, refetch: fetchMember }
}
