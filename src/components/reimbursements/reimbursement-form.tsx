'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { X } from 'lucide-react'
import type { ReimbursementInput } from '@/hooks/use-reimbursements'

interface ReimbursementFormProps {
  projectId: string
  onSubmit: (entry: ReimbursementInput) => Promise<void>
  onCancel: () => void
  initialData?: Partial<ReimbursementInput>
  isEdit?: boolean
}

const REIMBURSEMENT_CATEGORIES = [
  'Props',
  'Equipment',
  'Travel',
  'Meals',
  'Supplies',
  'Software',
  'Services',
  'Shipping',
  'Parking',
  'Transportation',
  'Accommodation',
  'Other',
]

const PAYMENT_METHODS = [
  'Direct Deposit',
  'Check',
  'Cash',
  'PayPal',
  'Venmo',
  'Zelle',
  'Other',
]

export function ReimbursementForm({ projectId, onSubmit, onCancel, initialData, isEdit }: ReimbursementFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    person_name: initialData?.person_name || '',
    person_email: initialData?.person_email || '',
    description: initialData?.description || '',
    category: initialData?.category || 'Other',
    vendor: initialData?.vendor || '',
    amount: initialData?.amount?.toString() || '',
    date_incurred: initialData?.date_incurred || new Date().toISOString().split('T')[0],
    receipt_url: initialData?.receipt_url || '',
    notes: initialData?.notes || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await onSubmit({
        project_id: projectId,
        person_name: formData.person_name,
        person_email: formData.person_email || undefined,
        description: formData.description,
        category: formData.category,
        vendor: formData.vendor || undefined,
        amount: parseFloat(formData.amount) || 0,
        date_incurred: formData.date_incurred,
        receipt_url: formData.receipt_url || undefined,
        notes: formData.notes || undefined,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="relative">
      <button
        onClick={onCancel}
        className="absolute top-4 right-4 p-2 hover:bg-obsidian-800 rounded-lg transition-colors"
      >
        <X className="w-5 h-5 text-obsidian-400" />
      </button>

      <CardHeader>
        <CardTitle>{isEdit ? 'Edit Reimbursement' : 'Add Reimbursement Request'}</CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Person Name"
              value={formData.person_name}
              onChange={(e) => setFormData({ ...formData, person_name: e.target.value })}
              placeholder="Who needs to be reimbursed?"
              required
            />

            <Input
              label="Email (Optional)"
              type="email"
              value={formData.person_email}
              onChange={(e) => setFormData({ ...formData, person_email: e.target.value })}
              placeholder="Contact email"
            />
          </div>

          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="What was purchased?"
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={REIMBURSEMENT_CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
            />

            <Input
              label="Vendor / Store"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              placeholder="Where was it purchased?"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
              leftIcon={<span className="text-obsidian-400">$</span>}
            />

            <Input
              label="Date Incurred"
              type="date"
              value={formData.date_incurred}
              onChange={(e) => setFormData({ ...formData, date_incurred: e.target.value })}
              required
            />
          </div>

          <Input
            label="Receipt URL (Optional)"
            type="url"
            value={formData.receipt_url}
            onChange={(e) => setFormData({ ...formData, receipt_url: e.target.value })}
            placeholder="Link to receipt image or document"
          />

          <Textarea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes..."
            rows={3}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {isEdit ? 'Update' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
