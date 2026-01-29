'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  Bot,
  MessageSquarePlus,
  History,
  ChevronRight,
  Sparkles,
  X,
} from 'lucide-react'
import { Button, IconButton } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ChatMessage } from './chat-message'
import { ChatInput } from './chat-input'
import { useLeadChat, useLeadConversations } from '@/hooks/use-lead-chat'
import type { LeadConversation } from '@/hooks/use-lead-chat'

interface LeadChatProps {
  leadId: string
  leadName: string
  className?: string
  defaultOpen?: boolean
  onActionConfirmed?: () => void
}

export function LeadChat({
  leadId,
  leadName,
  className,
  defaultOpen = false,
  onActionConfirmed,
}: LeadChatProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [showHistory, setShowHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [confirmingAction, setConfirmingAction] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const { conversations, isLoading: loadingConversations } = useLeadConversations(leadId)
  const {
    messages,
    isLoading,
    isSending,
    error,
    currentConversationId,
    sendMessage,
    confirmAction,
    startNewConversation,
    switchConversation,
  } = useLeadChat(leadId)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(async (message: string) => {
    await sendMessage(message)
  }, [sendMessage])

  const handleConfirmAction = useCallback(async (actionId: string, approved: boolean) => {
    setConfirmingAction(actionId)
    setSuccessMessage(null)

    const result = await confirmAction(
      messages.find(m => m.pending_action?.some(a => a.tool_call.id === actionId))?.id || '',
      actionId,
      approved
    )

    setConfirmingAction(null)

    if (result.success && approved) {
      setSuccessMessage('Changes applied successfully!')
      onActionConfirmed?.()
      setTimeout(() => setSuccessMessage(null), 3000)
    }
  }, [confirmAction, messages, onActionConfirmed])

  const handleSelectConversation = useCallback((conv: LeadConversation) => {
    switchConversation(conv.id)
    setShowHistory(false)
  }, [switchConversation])

  const handleNewConversation = useCallback(() => {
    startNewConversation()
    setShowHistory(false)
  }, [startNewConversation])

  // Quick actions for leads
  const quickActions = [
    { label: 'Qualify this lead', prompt: 'Qualify this lead using the BANT framework' },
    { label: 'Draft a response', prompt: 'Draft a professional email response to this lead' },
    { label: 'Suggest next steps', prompt: 'Suggest the best next steps for this lead' },
    { label: 'Analyze intent', prompt: 'Analyze this lead\'s intent and urgency' },
    { label: 'Generate follow-up', prompt: 'Generate a personalized follow-up email' },
  ]

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="primary"
        className={cn('fixed bottom-6 right-6 shadow-2xl z-50', className)}
        leftIcon={<Bot className="w-5 h-5" />}
      >
        AI Assistant
      </Button>
    )
  }

  return (
    <Card
      variant="elevated"
      className={cn(
        'fixed bottom-6 right-6 w-[420px] h-[600px] z-50',
        'flex flex-col overflow-hidden shadow-2xl',
        'border border-obsidian-700/50',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-obsidian-800/50 bg-obsidian-900/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ember-500 to-ember-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-medium text-white text-sm">Lead Assistant</h3>
            <p className="text-xs text-obsidian-400 truncate max-w-[200px]">
              {leadName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            icon={<History className="w-4 h-4" />}
            label="Chat history"
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
          />
          <IconButton
            icon={<MessageSquarePlus className="w-4 h-4" />}
            label="New conversation"
            variant="ghost"
            size="sm"
            onClick={handleNewConversation}
          />
          <IconButton
            icon={<X className="w-4 h-4" />}
            label="Close"
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
          />
        </div>
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="absolute inset-0 top-[60px] bg-obsidian-900 z-10 flex flex-col">
          <div className="p-4 border-b border-obsidian-800/50">
            <h4 className="font-medium text-white">Conversation History</h4>
            <p className="text-xs text-obsidian-400 mt-1">
              {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingConversations ? (
              <div className="p-4 text-center text-obsidian-400 text-sm">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-obsidian-400 text-sm">
                No conversations yet
              </div>
            ) : (
              <div className="divide-y divide-obsidian-800/50">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={cn(
                      'w-full px-4 py-3 text-left hover:bg-obsidian-800/50 transition-colors',
                      'flex items-center justify-between gap-2',
                      currentConversationId === conv.id && 'bg-ember-500/10'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">
                        {conv.title || 'New conversation'}
                      </p>
                      <p className="text-xs text-obsidian-400 mt-0.5">
                        {new Date(conv.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-obsidian-500 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="p-3 border-t border-obsidian-800/50">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowHistory(false)}
              className="w-full"
            >
              Close History
            </Button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-ember-500/20 to-ember-600/20 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-ember-400" />
            </div>
            <h4 className="font-medium text-white mb-2">
              How can I help with this lead?
            </h4>
            <p className="text-sm text-obsidian-400 mb-6">
              I can qualify leads, draft responses, analyze intent, and manage lead details.
            </p>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 justify-center">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleSend(action.prompt)}
                  disabled={isSending}
                  className={cn(
                    'px-3 py-1.5 text-xs rounded-full',
                    'bg-obsidian-800/50 border border-obsidian-700/50',
                    'text-obsidian-300 hover:text-white',
                    'hover:bg-obsidian-700/50 hover:border-obsidian-600/50',
                    'transition-all duration-200',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-4">
            {messages.filter((msg) => msg.role !== 'tool').map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onConfirmAction={handleConfirmAction}
                isConfirming={confirmingAction === msg.pending_action?.[0]?.tool_call.id}
              />
            ))}
            {isSending && (
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-obsidian-700 to-obsidian-800 border border-obsidian-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-ember-400 animate-pulse" />
                </div>
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-obsidian-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-obsidian-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-obsidian-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/30">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="px-4 py-2 bg-emerald-500/10 border-t border-emerald-500/30">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <p className="text-xs text-emerald-400 font-medium">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Input */}
      <ChatInput onSend={handleSend} isLoading={isSending} placeholder="Ask about this lead..." />
    </Card>
  )
}
