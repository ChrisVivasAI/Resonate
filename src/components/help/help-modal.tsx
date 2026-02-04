'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks'
import { CheckCircle } from 'lucide-react'

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
}

type TicketType = 'bug' | 'feature' | 'help'

const ticketTypeOptions = [
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'help', label: 'Help Request' },
]

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const { profile } = useAuth()
  const [type, setType] = useState<TicketType>('help')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState(profile?.email || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile?.full_name || 'Anonymous',
          email: email || profile?.email || 'no-email@anonymous.com',
          subject,
          message: description,
          source: 'help_ticket',
          source_page: typeof window !== 'undefined' ? window.location.pathname : '',
          tags: [type],
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit ticket')
      }

      setIsSuccess(true)
      setTimeout(() => {
        handleClose()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit ticket')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setType('help')
    setSubject('')
    setDescription('')
    setEmail(profile?.email || '')
    setIsSuccess(false)
    setError(null)
    onClose()
  }

  if (isSuccess) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Ticket Submitted">
        <div className="flex flex-col items-center justify-center py-8">
          <CheckCircle className="w-16 h-16 text-emerald-500 mb-4" />
          <p className="text-slate-200 text-lg font-medium">Thank you!</p>
          <p className="text-slate-400 text-sm mt-1">We'll get back to you soon.</p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Submit a Ticket"
      description="Report a bug, request a feature, or get help"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Type"
          options={ticketTypeOptions}
          value={type}
          onChange={(e) => setType(e.target.value as TicketType)}
        />

        <Input
          label="Subject"
          placeholder="Brief summary of your request"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />

        <Textarea
          label="Description"
          placeholder="Provide details about your request..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        <Input
          label="Email (optional)"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          hint="Pre-filled from your account if logged in"
        />

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Submit Ticket
          </Button>
        </div>
      </form>
    </Modal>
  )
}
