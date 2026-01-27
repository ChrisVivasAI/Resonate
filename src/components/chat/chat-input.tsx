'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import { Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChatInputProps {
  onSend: (message: string) => void
  isLoading?: boolean
  placeholder?: string
  disabled?: boolean
}

export function ChatInput({
  onSend,
  isLoading = false,
  placeholder = 'Ask about this project...',
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
    }
  }, [message])

  const handleSend = () => {
    if (message.trim() && !isLoading && !disabled) {
      onSend(message.trim())
      setMessage('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-obsidian-800/50 bg-obsidian-900/50 p-4">
      <div className="flex items-end gap-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading || disabled}
            rows={1}
            className={cn(
              'w-full px-4 py-3 rounded-xl resize-none',
              'bg-obsidian-800/50 border border-obsidian-700/50',
              'text-white placeholder-obsidian-400',
              'focus:outline-none focus:ring-2 focus:ring-ember-500/50 focus:border-ember-500/50',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-all duration-200',
              'scrollbar-thin scrollbar-thumb-obsidian-700 scrollbar-track-transparent'
            )}
          />
        </div>
        <Button
          onClick={handleSend}
          disabled={!message.trim() || isLoading || disabled}
          variant="primary"
          size="md"
          className="flex-shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>
      <p className="text-xs text-obsidian-500 mt-2">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  )
}
