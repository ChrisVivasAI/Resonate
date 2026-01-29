'use client'

import { cn } from '@/lib/utils'
import { Bot, User, AlertTriangle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import type { PendingAction } from '@/lib/ai/project-agent'
import { Button } from '@/components/ui/button'

// Generic message interface that works for both project and lead messages
interface GenericChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string | null
  pending_action: PendingAction[] | null
  action_confirmed: boolean | null
  created_at: string
}

interface ChatMessageProps {
  message: GenericChatMessage
  onConfirmAction?: (actionId: string, approved: boolean) => void
  isConfirming?: boolean
}

export function ChatMessage({ message, onConfirmAction, isConfirming }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser
            ? 'bg-gradient-to-br from-ember-500 to-ember-600'
            : 'bg-gradient-to-br from-obsidian-700 to-obsidian-800 border border-obsidian-600'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-ember-400" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'max-w-[80%] flex flex-col gap-2',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5',
            isUser
              ? 'bg-gradient-to-r from-ember-500 to-ember-600 text-white rounded-br-md'
              : 'glass text-obsidian-100 rounded-bl-md'
          )}
        >
          <div className="text-sm prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{message.content || ''}</ReactMarkdown>
          </div>
        </div>

        {/* Pending actions */}
        {isAssistant && message.pending_action && message.pending_action.length > 0 && !message.action_confirmed && (
          <div className="w-full mt-2 space-y-2">
            {(message.pending_action as PendingAction[]).map((action) => (
              <div
                key={action.tool_call.id}
                className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3"
              >
                <div className="flex items-start gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-400">
                      Action Requires Confirmation
                    </p>
                    <p className="text-xs text-obsidian-300 mt-1">
                      {action.tool_call.name.replace(/_/g, ' ')}:{' '}
                      {JSON.stringify(action.tool_call.args)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => onConfirmAction?.(action.tool_call.id, true)}
                    disabled={isConfirming}
                    isLoading={isConfirming}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onConfirmAction?.(action.tool_call.id, false)}
                    disabled={isConfirming}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-xs text-obsidian-500">
          {formatTime(message.created_at)}
        </span>
      </div>
    </div>
  )
}
