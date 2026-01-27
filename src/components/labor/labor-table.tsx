'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Filter, Clock, DollarSign } from 'lucide-react'
import { useLabor, type LaborEntry, type LaborInput } from '@/hooks'
import { LaborForm } from './labor-form'

interface LaborTableProps {
  projectId: string
}

export function LaborTable({ projectId }: LaborTableProps) {
  const { laborEntries, loading, error, totals, addLaborEntry, updateLaborEntry, deleteLaborEntry } = useLabor({
    projectId,
  })
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<LaborEntry | null>(null)
  const [sortField, setSortField] = useState<keyof LaborEntry>('role')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [filterRole, setFilterRole] = useState<string>('')

  const roles = Array.from(new Set(laborEntries.map((e) => e.role))).sort()

  const handleSort = (field: keyof LaborEntry) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedEntries = [...laborEntries]
    .filter((e) => !filterRole || e.role === filterRole)
    .sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

  const handleAddEntry = async (entry: LaborInput) => {
    await addLaborEntry(entry)
    setShowForm(false)
  }

  const handleUpdateEntry = async (entry: LaborInput) => {
    if (editingEntry) {
      await updateLaborEntry(editingEntry.id, entry)
      setEditingEntry(null)
    }
  }

  const handleDeleteEntry = async (id: string) => {
    if (confirm('Are you sure you want to delete this labor entry?')) {
      await deleteLaborEntry(id)
    }
  }

  const SortIcon = ({ field }: { field: keyof LaborEntry }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
  }

  const getHoursVarianceColor = (estimated: number, actual: number) => {
    if (actual === 0 || estimated === 0) return 'text-obsidian-400'
    const variance = ((actual - estimated) / estimated) * 100
    if (variance > 20) return 'text-red-400'
    if (variance > 10) return 'text-amber-400'
    if (variance < -10) return 'text-emerald-400'
    return 'text-slate-300'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ember-500"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-red-400">{error}</div>
        </CardContent>
      </Card>
    )
  }

  if (showForm) {
    return <LaborForm projectId={projectId} onSubmit={handleAddEntry} onCancel={() => setShowForm(false)} />
  }

  if (editingEntry) {
    return (
      <LaborForm
        projectId={projectId}
        onSubmit={handleUpdateEntry}
        onCancel={() => setEditingEntry(null)}
        initialData={{
          team_member_name: editingEntry.team_member_name || undefined,
          role: editingEntry.role,
          hourly_rate: editingEntry.hourly_rate,
          estimated_hours: editingEntry.estimated_hours,
          actual_hours: editingEntry.actual_hours,
          notes: editingEntry.notes || undefined,
        }}
        isEdit
      />
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Labor / Time Tracking</CardTitle>
        <div className="flex items-center gap-3">
          {roles.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-obsidian-400" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="bg-obsidian-800 border border-obsidian-700 rounded-lg px-3 py-1.5 text-sm text-slate-300"
              >
                <option value="">All Roles</option>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowForm(true)}>
            Add Labor Entry
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {laborEntries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-obsidian-400 mb-4">No labor entries recorded yet</p>
            <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
              Add your first labor entry
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-obsidian-800">
                    <th className="text-left py-3 px-4 text-sm font-medium text-obsidian-400">Team Member</th>
                    <th
                      className="text-left py-3 px-4 text-sm font-medium text-obsidian-400 cursor-pointer hover:text-white"
                      onClick={() => handleSort('role')}
                    >
                      <div className="flex items-center gap-1">
                        Role <SortIcon field="role" />
                      </div>
                    </th>
                    <th
                      className="text-right py-3 px-4 text-sm font-medium text-obsidian-400 cursor-pointer hover:text-white"
                      onClick={() => handleSort('hourly_rate')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Rate <SortIcon field="hourly_rate" />
                      </div>
                    </th>
                    <th
                      className="text-right py-3 px-4 text-sm font-medium text-obsidian-400 cursor-pointer hover:text-white"
                      onClick={() => handleSort('estimated_hours')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Est. Hours <SortIcon field="estimated_hours" />
                      </div>
                    </th>
                    <th
                      className="text-right py-3 px-4 text-sm font-medium text-obsidian-400 cursor-pointer hover:text-white"
                      onClick={() => handleSort('actual_hours')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Actual Hours <SortIcon field="actual_hours" />
                      </div>
                    </th>
                    <th
                      className="text-right py-3 px-4 text-sm font-medium text-obsidian-400 cursor-pointer hover:text-white"
                      onClick={() => handleSort('estimated_cost')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Est. Cost <SortIcon field="estimated_cost" />
                      </div>
                    </th>
                    <th
                      className="text-right py-3 px-4 text-sm font-medium text-obsidian-400 cursor-pointer hover:text-white"
                      onClick={() => handleSort('actual_cost')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Actual Cost <SortIcon field="actual_cost" />
                      </div>
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-obsidian-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEntries.map((entry) => {
                    const variance = Number(entry.actual_cost) - Number(entry.estimated_cost)
                    return (
                      <tr key={entry.id} className="border-b border-obsidian-800/50 hover:bg-obsidian-800/30">
                        <td className="py-3 px-4 text-sm text-slate-300">{entry.team_member_name || '-'}</td>
                        <td className="py-3 px-4">
                          <Badge variant="default">{entry.role}</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-300 text-right">
                          ${Number(entry.hourly_rate).toFixed(2)}/hr
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-300 text-right">
                          {Number(entry.estimated_hours).toFixed(1)}
                        </td>
                        <td
                          className={`py-3 px-4 text-sm text-right font-medium ${getHoursVarianceColor(
                            Number(entry.estimated_hours),
                            Number(entry.actual_hours)
                          )}`}
                        >
                          {Number(entry.actual_hours).toFixed(1)}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-300 text-right">
                          ${Number(entry.estimated_cost).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-medium">
                          <span className={variance > 0 ? 'text-red-400' : 'text-emerald-400'}>
                            ${Number(entry.actual_cost).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingEntry(entry)}
                              className="p-1.5 hover:bg-obsidian-700 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4 text-obsidian-400 hover:text-white" />
                            </button>
                            <button
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-obsidian-400 hover:text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary section */}
            <div className="mt-6 pt-4 border-t border-obsidian-800">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-3 p-3 bg-obsidian-800/30 rounded-xl">
                  <Clock className="w-5 h-5 text-ember-400" />
                  <div>
                    <div className="text-xs text-obsidian-400">Est. Hours</div>
                    <div className="text-lg font-semibold text-white">{totals.estimatedHours.toFixed(1)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-obsidian-800/30 rounded-xl">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <div>
                    <div className="text-xs text-obsidian-400">Actual Hours</div>
                    <div className="text-lg font-semibold text-white">{totals.actualHours.toFixed(1)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-obsidian-800/30 rounded-xl">
                  <DollarSign className="w-5 h-5 text-slate-400" />
                  <div>
                    <div className="text-xs text-obsidian-400">Est. Cost</div>
                    <div className="text-lg font-semibold text-white">${totals.estimatedCost.toFixed(2)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-obsidian-800/30 rounded-xl">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  <div>
                    <div className="text-xs text-obsidian-400">Actual Cost</div>
                    <div
                      className={`text-lg font-semibold ${
                        totals.actualCost > totals.estimatedCost ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      ${totals.actualCost.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
