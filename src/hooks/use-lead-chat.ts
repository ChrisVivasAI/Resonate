'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ToolCall, ToolResult, PendingAction } from '@/lib/ai/project-agent'

// =====================================================
// TYPES
// =====================================================

export interface LeadChatMessage {
  id: string
  conversation_id: string
  lead_id: string
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

export interface LeadConversation {
  id: string
  lead_id: string
  title: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  messages?: { count: number }[]
}

export interface LeadChatResponse {
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
// USE LEAD CONVERSATIONS HOOK
// =====================================================

export function useLeadConversations(leadId: string) {
  const [conversations, setConversations] = useState<LeadConversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConversations = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/leads/${leadId}/chat`)
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
  }, [leadId])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Set up realtime subscription
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`lead-conversations-${leadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_conversations',
          filter: `lead_id=eq.${leadId}`,
        },
        () => {
          fetchConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [leadId, fetchConversations])

  return {
    conversations,
    isLoading,
    error,
    refresh: fetchConversations,
  }
}

// =====================================================
// USE LEAD CHAT HOOK
// =====================================================

export function useLeadChat(leadId: string, conversationId?: string | null) {
  const [messages, setMessages] = useState<LeadChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId || null)

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (convId: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/leads/${leadId}/chat?conversation_id=${convId}`)
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
  }, [leadId])

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
      .channel(`lead-messages-${currentConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lead_messages',
          filter: `conversation_id=eq.${currentConversationId}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as LeadChatMessage])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lead_messages',
          filter: `conversation_id=eq.${currentConversationId}`,
        },
        (payload) => {
          setMessages(prev =>
            prev.map(msg => msg.id === payload.new.id ? payload.new as LeadChatMessage : msg)
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentConversationId])

  // Send a message
  const sendMessage = useCallback(async (message: string): Promise<LeadChatResponse | null> => {
    try {
      setIsSending(true)
      setError(null)

      // Optimistically add user message
      const optimisticUserMsg: LeadChatMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: currentConversationId || '',
        lead_id: leadId,
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

      const response = await fetch(`/api/leads/${leadId}/chat`, {
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

      const data: LeadChatResponse = await response.json()

      // Update conversation ID if new
      if (data.conversation_id !== currentConversationId) {
        setCurrentConversationId(data.conversation_id)
      }

      // Add assistant message
      const assistantMsg: LeadChatMessage = {
        id: data.message.id,
        conversation_id: data.conversation_id,
        lead_id: leadId,
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
  }, [leadId, currentConversationId])

  // Confirm or reject a pending action
  const confirmAction = useCallback(async (
    messageId: string,
    actionId: string,
    approved: boolean
  ): Promise<{ success: boolean; result?: unknown }> => {
    try {
      const response = await fetch(`/api/leads/${leadId}/chat`, {
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
  }, [leadId])

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
