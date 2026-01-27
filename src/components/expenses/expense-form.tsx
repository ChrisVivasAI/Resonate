'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { X } from 'lucide-react'
import type { ExpenseInput } from '@/hooks/use-expenses'

interface ExpenseFormProps {
  projectId: string
  onSubmit: (expense: ExpenseInput) => Promise<void>
  onCancel: () => void
  initialData?: Partial<ExpenseInput>
  isEdit?: boolean
}

const EXPENSE_CATEGORIES = [
  'Equipment',
  'Software',
  'Travel',
  'Meals',
  'Supplies',
  'Contractors',
  'Marketing',
  'Shipping',
  'Utilities',
  'Other',
]

const PAYMENT_METHODS = [
  'Credit Card',
  'Debit Card',
  'Bank Transfer',
  'Cash',
  'Check',
  'PayPal',
  'Other',
]

export function ExpenseForm({ projectId, onSubmit, onCancel, initialData, isEdit }: ExpenseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    date: initialData?.date || new Date().toISOString().split('T')[0],
    category: initialData?.category || '',
    description: initialData?.description || '',
    vendor_or_person: initialData?.vendor_or_person || '',
    cost_pre_tax: initialData?.cost_pre_tax?.toString() || '',
    tax: initialData?.tax?.toString() || '0',
    is_billable: initialData?.is_billable ?? true,
    markup_percent: initialData?.markup_percent?.toString() || '0',
    is_paid: initialData?.is_paid ?? false,
    payment_method: initialData?.payment_method || '',
    notes: initialData?.notes || '',
  })

  const costPreTax = parseFloat(formData.cost_pre_tax) || 0
  const tax = parseFloat(formData.tax) || 0
  const total = costPreTax + tax
  const markupPercent = parseFloat(formData.markup_percent) || 0
  const clientPrice = formData.is_billable ? total * (1 + markupPercent / 100) : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await onSubmit({
        project_id: projectId,
        date: formData.date,
        category: formData.category,
        description: formData.description || undefined,
        vendor_or_person: formData.vendor_or_person || undefined,
        cost_pre_tax: costPreTax,
        tax: tax,
        is_billable: formData.is_billable,
        markup_percent: markupPercent,
        is_paid: formData.is_paid,
        payment_method: formData.payment_method || undefined,
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
        <CardTitle>{isEdit ? 'Edit Expense' : 'Add New Expense'}</CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />

            <Select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
              placeholder="Select category..."
              options={EXPENSE_CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
            />
          </div>

          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of the expense"
          />

          <Input
            label="Vendor / Person"
            value={formData.vendor_or_person}
            onChange={(e) => setFormData({ ...formData, vendor_or_person: e.target.value })}
            placeholder="Who was paid?"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Cost (Pre-Tax)"
              type="number"
              step="0.01"
              min="0"
              value={formData.cost_pre_tax}
              onChange={(e) => setFormData({ ...formData, cost_pre_tax: e.target.value })}
              required
              leftIcon={<span className="text-obsidian-400">$</span>}
            />

            <Input
              label="Tax"
              type="number"
              step="0.01"
              min="0"
              value={formData.tax}
              onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
              leftIcon={<span className="text-obsidian-400">$</span>}
            />

            <div className="flex flex-col">
              <label className="block text-sm font-medium text-slate-300 mb-2">Total</label>
              <div className="flex items-center h-[46px] px-4 bg-obsidian-800/50 border border-obsidian-700 rounded-lg text-slate-100">
                ${total.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_billable}
                  onChange={(e) => setFormData({ ...formData, is_billable: e.target.checked })}
                  className="w-4 h-4 rounded border-obsidian-600 bg-obsidian-800 text-ember-500 focus:ring-ember-500"
                />
                <span className="text-sm text-slate-300">Billable to Client</span>
              </label>
            </div>

            <Input
              label="Markup %"
              type="number"
              step="0.1"
              min="0"
              value={formData.markup_percent}
              onChange={(e) => setFormData({ ...formData, markup_percent: e.target.value })}
              disabled={!formData.is_billable}
              rightIcon={<span className="text-obsidian-400">%</span>}
            />

            <div className="flex flex-col">
              <label className="block text-sm font-medium text-slate-300 mb-2">Client Price</label>
              <div className="flex items-center h-[46px] px-4 bg-obsidian-800/50 border border-obsidian-700 rounded-lg text-emerald-400 font-medium">
                ${clientPrice.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_paid}
                  onChange={(e) => setFormData({ ...formData, is_paid: e.target.checked })}
                  className="w-4 h-4 rounded border-obsidian-600 bg-obsidian-800 text-ember-500 focus:ring-ember-500"
                />
                <span className="text-sm text-slate-300">Paid</span>
              </label>
            </div>

            <Select
              label="Payment Method"
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              disabled={!formData.is_paid}
              placeholder="Select method..."
              options={PAYMENT_METHODS.map((method) => ({ value: method, label: method }))}
            />
          </div>

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
              {isEdit ? 'Update Expense' : 'Add Expense'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
