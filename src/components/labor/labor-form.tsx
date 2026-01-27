'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { X } from 'lucide-react'
import type { LaborInput } from '@/hooks/use-labor'

interface LaborFormProps {
  projectId: string
  onSubmit: (entry: LaborInput) => Promise<void>
  onCancel: () => void
  initialData?: Partial<LaborInput>
  isEdit?: boolean
}

const ROLES = [
  'Project Manager',
  'Creative Director',
  'Art Director',
  'Designer',
  'Senior Designer',
  'Junior Designer',
  'Developer',
  'Senior Developer',
  'Frontend Developer',
  'Backend Developer',
  'Copywriter',
  'Content Strategist',
  'Animator',
  'Video Editor',
  'Photographer',
  'Illustrator',
  'UX Designer',
  'UI Designer',
  'Account Manager',
  'Producer',
  'Consultant',
  'Intern',
  'Other',
]

export function LaborForm({ projectId, onSubmit, onCancel, initialData, isEdit }: LaborFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    team_member_name: initialData?.team_member_name || '',
    role: initialData?.role || '',
    hourly_rate: initialData?.hourly_rate?.toString() || '',
    estimated_hours: initialData?.estimated_hours?.toString() || '0',
    actual_hours: initialData?.actual_hours?.toString() || '0',
    notes: initialData?.notes || '',
  })

  const hourlyRate = parseFloat(formData.hourly_rate) || 0
  const estimatedHours = parseFloat(formData.estimated_hours) || 0
  const actualHours = parseFloat(formData.actual_hours) || 0
  const estimatedCost = hourlyRate * estimatedHours
  const actualCost = hourlyRate * actualHours
  const variance = actualCost - estimatedCost

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await onSubmit({
        project_id: projectId,
        team_member_name: formData.team_member_name || undefined,
        role: formData.role,
        hourly_rate: hourlyRate,
        estimated_hours: estimatedHours,
        actual_hours: actualHours,
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
            <Input
              label="Team Member Name"
              value={formData.team_member_name}
              onChange={(e) => setFormData({ ...formData, team_member_name: e.target.value })}
              placeholder="Enter name"
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

          <Input
            label="Hourly Rate"
            type="number"
            step="0.01"
            min="0"
            value={formData.hourly_rate}
            onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
            required
            leftIcon={<span className="text-obsidian-400">$</span>}
            hint="Internal cost per hour"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Estimated Hours"
              type="number"
              step="0.5"
              min="0"
              value={formData.estimated_hours}
              onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
              hint="Planned hours for this role"
            />

            <Input
              label="Actual Hours"
              type="number"
              step="0.5"
              min="0"
              value={formData.actual_hours}
              onChange={(e) => setFormData({ ...formData, actual_hours: e.target.value })}
              hint="Hours actually worked"
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
