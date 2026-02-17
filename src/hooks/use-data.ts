'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from './use-auth'
import type { MediaCategory } from '@/lib/ai/gemini-media'

// Types
export interface Client {
  id: string
  name: string
  email: string
  phone: string | null
  company: string | null
  avatar_url: string | null
  status: 'active' | 'inactive' | 'lead'
  stripe_customer_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Computed fields
  totalSpent?: number
  projectsCount?: number
}

export interface Project {
  id: string
  client_id: string | null
  name: string
  description: string | null
  status: 'draft' | 'in_progress' | 'review' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  budget: number
  deposit_percentage: number
  spent: number
  start_date: string | null
  due_date: string | null
  completed_at: string | null
  progress: number
  tags: string[]
  created_at: string
  updated_at: string
  // Joined fields
  client?: Client
}

export interface Payment {
  id: string
  client_id: string | null
  project_id: string | null
  invoice_id: string | null
  amount: number
  currency: string
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded'
  payment_method: string | null
  stripe_payment_intent_id: string | null
  description: string | null
  created_at: string
  updated_at: string
  // Joined fields
  client?: Client
  project?: Project
}

// Hook for fetching clients
export function useClients() {
  const { supabase, loading: authLoading } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch clients with aggregated stats in a single query using RPC or joins
      // For now, optimize by fetching all data in parallel
      const [clientsResult, projectsResult, paymentsResult] = await Promise.all([
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.from('projects').select('id, client_id'),
        supabase.from('payments').select('client_id, amount').eq('status', 'succeeded'),
      ])

      if (clientsResult.error) throw clientsResult.error

      const clientsData = clientsResult.data || []

      // Group projects by client_id
      const projectCountsByClient: Record<string, number> = {}
      ;(projectsResult.data || []).forEach((p) => {
        if (p.client_id) {
          projectCountsByClient[p.client_id] = (projectCountsByClient[p.client_id] || 0) + 1
        }
      })

      // Group payments by client_id
      const paymentsByClient: Record<string, number> = {}
      ;(paymentsResult.data || []).forEach((p) => {
        if (p.client_id) {
          paymentsByClient[p.client_id] = (paymentsByClient[p.client_id] || 0) + Number(p.amount)
        }
      })

      // Combine data
      const clientsWithStats = clientsData.map((client) => ({
        ...client,
        projectsCount: projectCountsByClient[client.id] || 0,
        totalSpent: paymentsByClient[client.id] || 0,
      }))

      setClients(clientsWithStats)
    } catch (err) {
      console.error('Error fetching clients:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch clients')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Wait for auth to be ready before fetching
  useEffect(() => {
    if (!authLoading) {
      fetchClients()
    }
  }, [authLoading, fetchClients])

  const addClient = async (client: Omit<Client, 'id' | 'created_at' | 'updated_at' | 'totalSpent' | 'projectsCount'>) => {
    const { data, error } = await supabase
      .from('clients')
      .insert(client)
      .select()
      .single()

    if (error) throw error
    await fetchClients()
    return data
  }

  const updateClient = async (id: string, updates: Partial<Client>) => {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    await fetchClients()
    return data
  }

  const deleteClient = async (id: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) throw error
    await fetchClients()
  }

  return { clients, loading, error, refetch: fetchClients, addClient, updateClient, deleteClient }
}

// Hook for fetching projects with optional clientId filter
export function useProjects(clientId?: string) {
  const { supabase, loading: authLoading } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('projects')
        .select(`
          *,
          client:clients(*)
        `)
        .order('created_at', { ascending: false })

      // Apply clientId filter if provided
      if (clientId) {
        query = query.eq('client_id', clientId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setProjects(data || [])
    } catch (err) {
      console.error('Error fetching projects:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch projects')
    } finally {
      setLoading(false)
    }
  }, [supabase, clientId])

  // Wait for auth to be ready before fetching
  useEffect(() => {
    if (!authLoading) {
      fetchProjects()
    }
  }, [authLoading, fetchProjects])

  const addProject = async (project: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'client'>) => {
    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select()
      .single()

    if (error) throw error
    await fetchProjects()
    return data
  }

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    await fetchProjects()
    return data
  }

  const deleteProject = async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) throw error
    await fetchProjects()
  }

  return { projects, loading, error, refetch: fetchProjects, addProject, updateProject, deleteProject }
}

// Hook for fetching a single project
export function useProject(projectId: string | null) {
  const { supabase, loading: authLoading } = useAuth()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [milestones, setMilestones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProject = useCallback(async () => {
    if (!projectId) {
      setProject(null)
      setTasks([])
      setMilestones([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch project with client
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select(`
          *,
          client:clients(*)
        `)
        .eq('id', projectId)
        .single()

      if (projectError) throw projectError

      // Fetch tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })

      // Fetch milestones
      const { data: milestonesData } = await supabase
        .from('milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('due_date', { ascending: true })

      setProject(projectData)
      setTasks(tasksData || [])
      setMilestones(milestonesData || [])
    } catch (err) {
      console.error('Error fetching project:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch project')
    } finally {
      setLoading(false)
    }
  }, [supabase, projectId])

  // Wait for auth to be ready before fetching
  useEffect(() => {
    if (!authLoading) {
      fetchProject()
    }
  }, [authLoading, fetchProject])

  const updateProject = async (updates: Partial<Project>) => {
    if (!projectId) return null

    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single()

    if (error) throw error
    await fetchProject()
    return data
  }

  const deleteProject = async () => {
    if (!projectId) return
    const { error } = await supabase.from('projects').delete().eq('id', projectId)
    if (error) throw error
  }

  // Task management
  const addTask = async (task: {
    title: string
    description?: string
    priority?: string
    status?: 'todo' | 'in_progress' | 'review' | 'completed'
    due_date?: string
    assigned_to?: string
    assignee_id?: string
  }) => {
    if (!projectId) return null

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        project_id: projectId,
        title: task.title,
        description: task.description || null,
        priority: task.priority || 'medium',
        due_date: task.due_date || null,
        assigned_to: task.assigned_to || null,
        assignee_id: task.assignee_id || null,
        status: task.status || 'todo',
      })
      .select()
      .single()

    if (error) throw error
    await fetchProject()
    return data
  }

  const updateTask = async (taskId: string, updates: {
    title?: string
    description?: string
    status?: 'todo' | 'in_progress' | 'review' | 'completed'
    priority?: 'low' | 'medium' | 'high'
    due_date?: string | null
    assigned_to?: string | null
    assignee_id?: string | null
  }) => {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single()

    if (error) throw error
    await fetchProject()
    return data
  }

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (error) throw error
    await fetchProject()
  }

  // Milestone management
  const addMilestone = async (milestone: {
    title: string
    description?: string
    due_date: string
    payment_amount?: number
  }) => {
    if (!projectId) return null

    const { data, error } = await supabase
      .from('milestones')
      .insert({
        project_id: projectId,
        title: milestone.title,
        description: milestone.description || null,
        due_date: milestone.due_date,
        payment_amount: milestone.payment_amount || null,
      })
      .select()
      .single()

    if (error) throw error
    await fetchProject()
    return data
  }

  const updateMilestone = async (milestoneId: string, updates: {
    title?: string
    description?: string
    due_date?: string
    completed_at?: string | null
    payment_amount?: number | null
    is_paid?: boolean
  }) => {
    const { data, error } = await supabase
      .from('milestones')
      .update(updates)
      .eq('id', milestoneId)
      .select()
      .single()

    if (error) throw error
    await fetchProject()
    return data
  }

  const deleteMilestone = async (milestoneId: string) => {
    const { error } = await supabase
      .from('milestones')
      .delete()
      .eq('id', milestoneId)

    if (error) throw error
    await fetchProject()
  }

  return {
    project,
    tasks,
    milestones,
    loading,
    error,
    refetch: fetchProject,
    updateProject,
    deleteProject,
    // Task methods
    addTask,
    updateTask,
    deleteTask,
    // Milestone methods
    addMilestone,
    updateMilestone,
    deleteMilestone,
  }
}

// Hook for fetching payments with optional clientId filter
export function usePayments(clientId?: string) {
  const { supabase, loading: authLoading } = useAuth()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('payments')
        .select(`
          *,
          client:clients(*),
          project:projects(*)
        `)
        .order('created_at', { ascending: false })

      // Apply clientId filter if provided
      if (clientId) {
        query = query.eq('client_id', clientId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setPayments(data || [])
    } catch (err) {
      console.error('Error fetching payments:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch payments')
    } finally {
      setLoading(false)
    }
  }, [supabase, clientId])

  // Wait for auth to be ready before fetching
  useEffect(() => {
    if (!authLoading) {
      fetchPayments()
    }
  }, [authLoading, fetchPayments])

  return { payments, loading, error, refetch: fetchPayments }
}

// Hook for dashboard stats
export function useDashboardStats() {
  const { supabase, loading: authLoading } = useAuth()
  const [stats, setStats] = useState({
    totalRevenue: 0,
    activeProjects: 0,
    totalClients: 0,
    completedThisMonth: 0,
  })
  const [recentProjects, setRecentProjects] = useState<Project[]>([])
  const [recentPayments, setRecentPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Wait for auth to be ready
    if (authLoading || !supabase) return

    let isMounted = true

    const fetchStats = async () => {
      try {
        setLoading(true)
        setError(null)

        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        // Fetch all data in parallel for better performance
        const [
          paymentsResult,
          activeProjectsResult,
          totalClientsResult,
          completedThisMonthResult,
          recentProjectsResult,
          recentPaymentsResult,
        ] = await Promise.all([
          supabase.from('payments').select('amount').eq('status', 'succeeded'),
          supabase.from('projects').select('*', { count: 'exact', head: true }).in('status', ['in_progress', 'review']),
          supabase.from('clients').select('*', { count: 'exact', head: true }),
          supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('completed_at', startOfMonth.toISOString()),
          supabase.from('projects').select(`*, client:clients(*)`).in('status', ['in_progress', 'review']).order('updated_at', { ascending: false }).limit(4),
          supabase.from('payments').select(`*, client:clients(*)`).order('created_at', { ascending: false }).limit(5),
        ])

        if (!isMounted) return

        const totalRevenue = paymentsResult.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

        setStats({
          totalRevenue,
          activeProjects: activeProjectsResult.count || 0,
          totalClients: totalClientsResult.count || 0,
          completedThisMonth: completedThisMonthResult.count || 0,
        })

        setRecentProjects(recentProjectsResult.data || [])
        setRecentPayments(recentPaymentsResult.data || [])

      } catch (err) {
        console.error('Error fetching dashboard stats:', err)
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch stats')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchStats()

    return () => {
      isMounted = false
    }
  }, [supabase, authLoading])

  return { stats, recentProjects, recentPayments, loading, error }
}

// Types for AI Generations
export interface AIGeneration {
  id: string
  user_id: string | null
  project_id: string | null
  type: MediaCategory | 'text'
  prompt: string
  negative_prompt: string | null
  model: string
  endpoint_id: string | null
  request_id: string | null  // Used for async video generation (stores operationId)
  parameters: Record<string, unknown>
  result_url: string | null
  result_data: Record<string, unknown> | null  // URLs stored in result_data.urls
  status: 'pending' | 'running' | 'completed' | 'failed'
  error_message: string | null
  cost_credits: number
  created_at: string
  completed_at: string | null
}

// Hook for AI Generations
export function useGenerations(userId?: string) {
  const { supabase, loading: authLoading } = useAuth()
  const [generations, setGenerations] = useState<AIGeneration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGenerations = useCallback(async () => {
    if (!userId) {
      setGenerations([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('ai_generations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (fetchError) throw fetchError

      setGenerations(data || [])
    } catch (err) {
      console.error('Error fetching generations:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch generations')
    } finally {
      setLoading(false)
    }
  }, [supabase, userId])

  // Wait for auth to be ready before fetching
  useEffect(() => {
    if (!authLoading) {
      fetchGenerations()
    }
  }, [authLoading, fetchGenerations])

  // Subscribe to realtime updates
  useEffect(() => {
    if (!userId || authLoading) return

    const channel = supabase
      .channel('ai_generations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_generations',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setGenerations((prev) => [payload.new as AIGeneration, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setGenerations((prev) =>
              prev.map((g) =>
                g.id === payload.new.id ? (payload.new as AIGeneration) : g
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setGenerations((prev) =>
              prev.filter((g) => g.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, userId, authLoading])

  const addGeneration = async (
    generation: Omit<AIGeneration, 'id' | 'created_at' | 'completed_at' | 'user_id'>
  ) => {
    if (!userId) {
      console.error('[addGeneration] No userId available - user not authenticated')
      throw new Error('User not authenticated')
    }

    // Debug: Check current auth session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    console.log('[addGeneration] Current session:', sessionData?.session?.user?.id, 'userId param:', userId)
    if (sessionError) {
      console.error('[addGeneration] Session error:', sessionError)
    }
    if (!sessionData?.session) {
      console.error('[addGeneration] No active session - user may need to re-login')
    }

    const insertData = { ...generation, user_id: userId }
    console.log('[addGeneration] Attempting insert with userId:', userId)
    console.log('[addGeneration] Insert data keys:', Object.keys(insertData))

    const { data, error } = await supabase
      .from('ai_generations')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('[addGeneration] Supabase insert error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      throw error
    }

    console.log('[addGeneration] Successfully inserted:', data.id)
    return data as AIGeneration
  }

  const updateGeneration = async (
    id: string,
    updates: Partial<AIGeneration>
  ) => {
    const { data, error } = await supabase
      .from('ai_generations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as AIGeneration
  }

  const deleteGeneration = async (id: string) => {
    const { error } = await supabase
      .from('ai_generations')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  const getGenerationsByType = useCallback(
    (type?: MediaCategory | 'text') => {
      if (!type) return generations
      return generations.filter((g) => g.type === type)
    },
    [generations]
  )

  const getPendingGenerations = useCallback(() => {
    return generations.filter((g) => g.status === 'pending' || g.status === 'running')
  }, [generations])

  const getCompletedGenerations = useCallback(
    (type?: MediaCategory | 'text') => {
      return generations.filter((g) => {
        const statusMatch = g.status === 'completed'
        const typeMatch = type ? g.type === type : true
        return statusMatch && typeMatch
      })
    },
    [generations]
  )

  return {
    generations,
    loading,
    error,
    refetch: fetchGenerations,
    addGeneration,
    updateGeneration,
    deleteGeneration,
    getGenerationsByType,
    getPendingGenerations,
    getCompletedGenerations,
  }
}
