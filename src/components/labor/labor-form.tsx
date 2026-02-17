'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { X } from 'lucide-react'
import type { LaborInput, BillingType } from '@/hooks/use-labor'
import { useTeamMembers } from '@/hooks'

interface LaborFormProps {
  projectId: string
  onSubmit: (entry: LaborInput) => Promise<void>
  onCancel: () => void
  initialData?: Partial<LaborInput>
  isEdit?: boolean
}

const BILLING_TYPE_CONFIG: Record<BillingType, { label: string; rateLabel: string; rateHint: string; qtyLabel: string; estQtyHint: string; actQtyHint: string; step: string }> = {
  hourly: { label: 'Hourly', rateLabel: 'Hourly Rate', rateHint: 'Cost per hour', qtyLabel: 'Hours', estQtyHint: 'Planned hours for this role', actQtyHint: 'Hours actually worked', step: '0.5' },
  per_item: { label: 'Per Item', rateLabel: 'Rate per Item', rateHint: 'Cost per item', qtyLabel: 'Items', estQtyHint: 'Estimated number of items', actQtyHint: 'Actual number of items', step: '1' },
  per_asset: { label: 'Per Asset', rateLabel: 'Rate per Asset', rateHint: 'Cost per asset', qtyLabel: 'Assets', estQtyHint: 'Estimated number of assets', actQtyHint: 'Actual number of assets', step: '1' },
  per_service: { label: 'Per Service', rateLabel: 'Rate per Service', rateHint: 'Cost per service', qtyLabel: 'Services', estQtyHint: 'Estimated number of services', actQtyHint: 'Actual number of services', step: '1' },
}

const BILLING_TYPES: { value: BillingType; label: string }[] = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'per_item', label: 'Per Item' },
  { value: 'per_asset', label: 'Per Asset / Deliverable' },
  { value: 'per_service', label: 'Per Service' },
]

const ROLES = [
  '3D Artist',
  'Account Director',
  'Account Manager',
  'Animator',
  'Art Director',
  'Associate Creative Director',
  'Brand Strategist',
  'Colorist',
  'Consultant',
  'Content Strategist',
  'Copywriter',
  'Creative Director',
  'Designer',
  'Executive Producer',
  'Illustrator',
  'Intern',
  'Junior Designer',
  'Makeup Artist',
  'Motion Designer',
  'Music Composer',
  'Photographer',
  'Producer',
  'Project Manager',
  'Retoucher',
  'Senior Copywriter',
  'Senior Designer',
  'Set Designer',
  'Social Media Manager',
  'Sound Designer',
  'Stylist',
  'Talent / Model',
  'Video Editor',
  'Voiceover Artist',
  'Other',
]

export function LaborForm({ projectId, onSubmit, onCancel, initialData, isEdit }: LaborFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { members } = useTeamMembers()
  const [formData, setFormData] = useState({
    team_member_id: initialData?.team_member_id || '',
    team_member_name: initialData?.team_member_name || '',
    role: initialData?.role || '',
    billing_type: (initialData?.billing_type || 'hourly') as BillingType,
    hourly_rate: initialData?.hourly_rate?.toString() || '',
    estimated_hours: initialData?.estimated_hours?.toString() || '0',
    actual_hours: initialData?.actual_hours?.toString() || '0',
    notes: initialData?.notes || '',
  })

  const typeConfig = BILLING_TYPE_CONFIG[formData.billing_type]
  const rate = parseFloat(formData.hourly_rate) || 0
  const estimatedQty = parseFloat(formData.estimated_hours) || 0
  const actualQty = parseFloat(formData.actual_hours) || 0
  const estimatedCost = rate * estimatedQty
  const actualCost = rate * actualQty
  const variance = actualCost - estimatedCost

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const selectedMember = members.find(m => m.id === formData.team_member_id)
      await onSubmit({
        project_id: projectId,
        team_member_id: formData.team_member_id || undefined,
        team_member_name: selectedMember?.full_name || formData.team_member_name || undefined,
        role: formData.role,
        billing_type: formData.billing_type,
        hourly_rate: rate,
        estimated_hours: estimatedQty,
        actual_hours: actualQty,
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
        <CardTitle>{isEdit ? 'Edit Labor Entry' : 'Add Labor Entry'}</CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Team Member"
              value={formData.team_member_id}
              onChange={(e) => {
                const id = e.target.value
                const member = members.find(m => m.id === id)
                setFormData({
                  ...formData,
                  team_member_id: id,
                  team_member_name: member?.full_name || '',
                })
              }}
              placeholder="Select team member..."
              options={members.map((m) => ({ value: m.id, label: m.full_name || m.email }))}
            />

            <Select
              label="Role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              required
              placeholder="Select role..."
              options={ROLES.map((role) => ({ value: role, label: role }))}
            />
          </div>

          <Select
            label="Billing Type"
            value={formData.billing_type}
            onChange={(e) => setFormData({ ...formData, billing_type: e.target.value as BillingType })}
            required
            options={BILLING_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          />

          <Input
            label={typeConfig.rateLabel}
            type="number"
            step="0.01"
            min="0"
            value={formData.hourly_rate}
            onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
            required
            leftIcon={<span className="text-obsidian-400">$</span>}
            hint={typeConfig.rateHint}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={`Estimated ${typeConfig.qtyLabel}`}
              type="number"
              step={typeConfig.step}
              min="0"
              value={formData.estimated_hours}
              onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
              hint={typeConfig.estQtyHint}
            />

            <Input
              label={`Actual ${typeConfig.qtyLabel}`}
              type="number"
              step={typeConfig.step}
              min="0"
              value={formData.actual_hours}
              onChange={(e) => setFormData({ ...formData, actual_hours: e.target.value })}
              hint={typeConfig.actQtyHint}
            />
          </div>

          {/* Calculated costs display */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-obsidian-800/30 rounded-xl">
            <div className="text-center">
              <div className="text-xs text-obsidian-400 mb-1">Estimated Cost</div>
              <div className="text-lg font-semibold text-white">${estimatedCost.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-obsidian-400 mb-1">Actual Cost</div>
              <div className="text-lg font-semibold text-white">${actualCost.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-obsidian-400 mb-1">Variance</div>
              <div
                className={`text-lg font-semibold ${
                  variance > 0 ? 'text-red-400' : variance < 0 ? 'text-emerald-400' : 'text-white'
                }`}
              >
                {variance > 0 ? '+' : ''}${variance.toFixed(2)}
              </div>
            </div>
          </div>

          <Textarea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes about this labor entry..."
            rows={3}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {isEdit ? 'Update Entry' : 'Add Entry'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
