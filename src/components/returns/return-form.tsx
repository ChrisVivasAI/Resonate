'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { X } from 'lucide-react'
import type { ReturnInput } from '@/hooks/use-returns'

interface ReturnFormProps {
  projectId: string
  onSubmit: (entry: ReturnInput) => Promise<void>
  onCancel: () => void
  initialData?: Partial<ReturnInput>
  isEdit?: boolean
}

const RETURN_CATEGORIES = [
  'Props',
  'Equipment',
  'Wardrobe',
  'Set Dressing',
  'Lighting',
  'Camera Gear',
  'Audio Equipment',
  'Furniture',
  'Electronics',
  'Software',
  'Other',
]

const REFUND_METHODS = [
  { value: 'original_payment', label: 'Original Payment Method' },
  { value: 'store_credit', label: 'Store Credit' },
  { value: 'check', label: 'Check' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
]

export function ReturnForm({ projectId, onSubmit, onCancel, initialData, isEdit }: ReturnFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    item_description: initialData?.item_description || '',
    vendor: initialData?.vendor || '',
    category: initialData?.category || 'Props',
    original_cost: initialData?.original_cost?.toString() || '',
    return_amount: initialData?.return_amount?.toString() || '',
    restocking_fee: initialData?.restocking_fee?.toString() || '0',
    purchase_date: initialData?.purchase_date || '',
    return_initiated_date: initialData?.return_initiated_date || new Date().toISOString().split('T')[0],
    refund_method: initialData?.refund_method || '',
    return_window_days: initialData?.return_window_days?.toString() || '',
    tracking_number: initialData?.tracking_number || '',
    return_policy_notes: initialData?.return_policy_notes || '',
    notes: initialData?.notes || '',
  })

  const originalCost = parseFloat(formData.original_cost) || 0
  const returnAmount = parseFloat(formData.return_amount) || 0
  const restockingFee = parseFloat(formData.restocking_fee) || 0
  const netReturn = returnAmount - restockingFee

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await onSubmit({
        project_id: projectId,
        item_description: formData.item_description,
        vendor: formData.vendor,
        category: formData.category,
        original_cost: originalCost,
        return_amount: returnAmount,
        restocking_fee: restockingFee,
        purchase_date: formData.purchase_date || undefined,
        return_initiated_date: formData.return_initiated_date,
        refund_method: formData.refund_method as ReturnInput['refund_method'] || undefined,
        return_window_days: formData.return_window_days ? parseInt(formData.return_window_days) : undefined,
        tracking_number: formData.tracking_number || undefined,
        return_policy_notes: formData.return_policy_notes || undefined,
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
        <CardTitle>{isEdit ? 'Edit Return' : 'Add Return'}</CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Item Description"
            value={formData.item_description}
            onChange={(e) => setFormData({ ...formData, item_description: e.target.value })}
            placeholder="What is being returned?"
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Vendor / Store"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              placeholder="Where was it purchased?"
              required
            />

            <Select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={RETURN_CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Original Cost"
              type="number"
              step="0.01"
              min="0"
              value={formData.original_cost}
              onChange={(e) => setFormData({ ...formData, original_cost: e.target.value })}
              required
              leftIcon={<span className="text-obsidian-400">$</span>}
            />

            <Input
              label="Return Amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.return_amount}
              onChange={(e) => setFormData({ ...formData, return_amount: e.target.value })}
              required
              leftIcon={<span className="text-obsidian-400">$</span>}
              hint="Amount before restocking fee"
            />

            <Input
              label="Restocking Fee"
              type="number"
              step="0.01"
              min="0"
              value={formData.restocking_fee}
              onChange={(e) => setFormData({ ...formData, restocking_fee: e.target.value })}
              leftIcon={<span className="text-obsidian-400">$</span>}
            />
          </div>

          {/* Net return display */}
          <div className="p-4 bg-obsidian-800/30 rounded-xl">
            <div className="flex justify-between items-center">
              <span className="text-sm text-obsidian-400">Net Return Amount</span>
              <span className={`text-xl font-bold ${netReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ${netReturn.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Purchase Date"
              type="date"
              value={formData.purchase_date}
              onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
            />

            <Input
              label="Return Initiated Date"
              type="date"
              value={formData.return_initiated_date}
              onChange={(e) => setFormData({ ...formData, return_initiated_date: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Refund Method"
              value={formData.refund_method}
              onChange={(e) => setFormData({ ...formData, refund_method: e.target.value })}
              placeholder="How will refund be received?"
              options={REFUND_METHODS}
            />

            <Input
              label="Return Window (Days)"
              type="number"
              min="0"
              value={formData.return_window_days}
              onChange={(e) => setFormData({ ...formData, return_window_days: e.target.value })}
              placeholder="e.g., 30"
              hint="Days allowed for return"
            />
          </div>

          <Input
            label="Tracking Number"
            value={formData.tracking_number}
            onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
            placeholder="Shipping tracking number"
          />

          <Textarea
            label="Return Policy Notes"
            value={formData.return_policy_notes}
            onChange={(e) => setFormData({ ...formData, return_policy_notes: e.target.value })}
            placeholder="Any specific return policy requirements..."
            rows={2}
          />

          <Textarea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes..."
            rows={2}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {isEdit ? 'Update Return' : 'Add Return'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
