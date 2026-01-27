'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ToolCall, ToolResult, PendingAction } from '@/lib/ai/project-agent'

// =====================================================
// TYPES
// =====================================================

export interface ChatMessage {
  id: string
  conversation_id: string
  project_id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string | null
  tool_calls: ToolCall[] | null
  tool_call_id: string | null
  tool_name: string | null
  pending_action: PendingAction[] | null
  action_confirmed: boolean | null
  action_confirmed_at: string | null
  action_confirmed_by: string | null
  tokens_used: number | null
  model: string | null
  created_by: string | null
  created_at: string
}

export interface Conversation {
  id: string
  project_id: string
  title: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  messages?: { count: number }[]
}

export interface ChatResponse {
  conversation_id: string
  message: {
    id: string
    role: 'assistant'
    content: string | null
    tool_calls: ToolCall[]
    pending_actions: PendingAction[]
    tokens_used: number
  }
  executed_actions: ToolResult[]
}

// =====================================================
// USE PROJECT CONVERSATIONS HOOK
// =====================================================

export function useProjectConversations(projectId: string) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConversations = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/projects/${projectId}/chat`)
      if (!response.ok) {
        throw new Error('Failed to fetch conversations')
      }
      const data = await response.json()
      setConversations(data.conversations || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch conversations')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Set up realtime subscription
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`project-conversations-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_conversations',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          fetchConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, fetchConversations])

  return {
    conversations,
    isLoading,
    error,
    refresh: fetchConversations,
  }
}

// =====================================================
// USE PROJECT CHAT HOOK
// =====================================================

export function useProjectChat(projectId: string, conversationId?: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId || null)

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (convId: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/projects/${projectId}/chat?conversation_id=${convId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch messages')
      }
      const data = await response.json()
      setMessages(data.messages || [])
      setCurrentConversationId(convId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (conversationId) {
      fetchMessages(conversationId)
    }
  }, [conversationId, fetchMessages])

  // Set up realtime subscription for messages
  useEffect(() => {
    if (!currentConversationId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`project-messages-${currentConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_messages',
          filter: `conversation_id=eq.${currentConversationId}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as ChatMessage])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'project_messages',
          filter: `conversation_id=eq.${currentConversationId}`,
        },
        (payload) => {
          setMessages(prev =>
            prev.map(msg => msg.id === payload.new.id ? payload.new as ChatMessage : msg)
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentConversationId])

  // Send a message
  const sendMessage = useCallback(async (message: string): Promise<ChatResponse | null> => {
    try {
      setIsSending(true)
      setError(null)

      // Optimistically add user message
      const optimisticUserMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: currentConversationId || '',
        project_id: projectId,
        role: 'user',
        content: message,
        tool_calls: null,
        tool_call_id: null,
        tool_name: null,
        pending_action: null,
        action_confirmed: null,
        action_confirmed_at: null,
        action_confirmed_by: null,
        tokens_used: null,
        model: null,
        created_by: null,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, optimisticUserMsg])

      const response = await fetch(`/api/projects/${projectId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          conversation_id: currentConversationId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }

      const data: ChatResponse = await response.json()

      // Update conversation ID if new
      if (data.conversation_id !== currentConversationId) {
        setCurrentConversationId(data.conversation_id)
      }

      // Add assistant message
      const assistantMsg: ChatMessage = {
        id: data.message.id,
        conversation_id: data.conversation_id,
        project_id: projectId,
        role: 'assistant',
        content: data.message.content,
        tool_calls: data.message.tool_calls,
        tool_call_id: null,
        tool_name: null,
        pending_action: data.message.pending_actions.length > 0 ? data.message.pending_actions : null,
        action_confirmed: null,
        action_confirmed_at: null,
        action_confirmed_by: null,
        tokens_used: data.message.tokens_used,
        model: 'gemini-2.0-flash',
        created_by: null,
        created_at: new Date().toISOString(),
      }

      // Remove optimistic message and add real messages
      setMessages(prev => {
        const withoutOptimistic = prev.filter(m => m.id !== optimisticUserMsg.id)
        return [...withoutOptimistic, assistantMsg]
      })

      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')))
      return null
    } finally {
      setIsSending(false)
    }
  }, [projectId, currentConversationId])

  // Confirm or reject a pending action
  const confirmAction = useCallback(async (
    messageId: string,
    actionId: string,
    approved: boolean
  ): Promise<{ success: boolean; result?: unknown }> => {
    try {
      const response = await fetch(`/api/projects/${projectId}/chat`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message_id: messageId,
          action_id: actionId,
          approved,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to confirm action')
      }

      const data = await response.json()
      return { success: true, result: data.result }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm action')
      return { success: false }
    }
  }, [projectId])

  // Start a new conversation
  const startNewConversation = useCallback(() => {
    setCurrentConversationId(null)
    setMessages([])
  }, [])

  // Switch to an existing conversation
  const switchConversation = useCallback((convId: string) => {
    if (convId !== currentConversationId) {
      fetchMessages(convId)
    }
  }, [currentConversationId, fetchMessages])

  return {
    messages,
    isLoading,
    isSending,
    error,
    currentConversationId,
    sendMessage,
    confirmAction,
    startNewConversation,
    switchConversation,
    refresh: () => currentConversationId && fetchMessages(currentConversationId),
  }
}

// =====================================================
// USE PROJECT AI SETTINGS HOOK
// =====================================================

export interface ProjectAISettings {
  id: string
  project_id: string
  auto_generate_on_create: boolean
  agent_personality: string
  confirmation_level: 'always' | 'destructive_only' | 'never'
  can_create_tasks: boolean
  can_update_tasks: boolean
  can_delete_tasks: boolean
  can_create_milestones: boolean
  can_update_milestones: boolean
  can_delete_milestones: boolean
  can_manage_deliverables: boolean
  can_manage_financials: boolean
  include_financial_data: boolean
  include_activity_history: boolean
  max_history_messages: number
}

export function useProjectAISettings(projectId: string) {
  const [settings, setSettings] = useState<ProjectAISettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('project_ai_settings')
        .select('*')
        .eq('project_id', projectId)
        .single()

      if (fetchError) throw fetchError
      setSettings(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch AI settings')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const updateSettings = useCallback(async (updates: Partial<ProjectAISettings>) => {
    try {
      const supabase = createClient()
      const { data, error: updateError } = await supabase
        .from('project_ai_settings')
        .update(updates)
        .eq('project_id', projectId)
        .select()
        .single()

      if (updateError) throw updateError
      setSettings(data)
      return { success: true }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update AI settings')
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }, [projectId])

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    refresh: fetchSettings,
  }
}
