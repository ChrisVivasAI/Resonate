'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Filter,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  AlertCircle,
  Package,
  RotateCcw,
} from 'lucide-react'
import { useReturns, type Return, type ReturnInput } from '@/hooks'
import { ReturnForm } from './return-form'

interface ReturnTableProps {
  projectId: string
}

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Truck },
  completed: { label: 'Completed', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle },
  denied: { label: 'Denied', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle },
  partial: { label: 'Partial', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20', icon: AlertCircle },
}

export function ReturnTable({ projectId }: ReturnTableProps) {
  const {
    returns,
    loading,
    error,
    totals,
    addReturn,
    updateReturn,
    deleteReturn,
    markAsInProgress,
    markAsCompleted,
  } = useReturns({ projectId })

  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<Return | null>(null)
  const [sortField, setSortField] = useState<keyof Return>('return_initiated_date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [filterStatus, setFilterStatus] = useState<string>('')

  const handleSort = (field: keyof Return) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedEntries = [...returns]
    .filter((r) => !filterStatus || r.status === filterStatus)
    .sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

  const handleAddEntry = async (entry: ReturnInput) => {
    await addReturn(entry)
    setShowForm(false)
  }

  const handleUpdateEntry = async (entry: ReturnInput) => {
    if (editingEntry) {
      await updateReturn(editingEntry.id, entry)
      setEditingEntry(null)
    }
  }

  const handleDeleteEntry = async (id: string) => {
    if (confirm('Are you sure you want to delete this return?')) {
      await deleteReturn(id)
    }
  }

  const SortIcon = ({ field }: { field: keyof Return }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
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
    return <ReturnForm projectId={projectId} onSubmit={handleAddEntry} onCancel={() => setShowForm(false)} />
  }

  if (editingEntry) {
    return (
      <ReturnForm
        projectId={projectId}
        onSubmit={handleUpdateEntry}
        onCancel={() => setEditingEntry(null)}
        initialData={{
          item_description: editingEntry.item_description,
          vendor: editingEntry.vendor,
          category: editingEntry.category,
          original_cost: editingEntry.original_cost,
          return_amount: editingEntry.return_amount,
          restocking_fee: editingEntry.restocking_fee,
          purchase_date: editingEntry.purchase_date || undefined,
          return_initiated_date: editingEntry.return_initiated_date || undefined,
          refund_method: editingEntry.refund_method || undefined,
          return_window_days: editingEntry.return_window_days || undefined,
          tracking_number: editingEntry.tracking_number || undefined,
          return_policy_notes: editingEntry.return_policy_notes || undefined,
          notes: editingEntry.notes || undefined,
        }}
        isEdit
      />
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-emerald-400" />
          <CardTitle>Returns</CardTitle>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-obsidian-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-obsidian-800 border border-obsidian-700 rounded-lg px-3 py-1.5 text-sm text-slate-300"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="denied">Denied</option>
              <option value="partial">Partial</option>
            </select>
          </div>
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowForm(true)}>
            Add Return
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {returns.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-obsidian-600 mx-auto mb-4" />
            <p className="text-obsidian-400 mb-4">No returns tracked yet</p>
            <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
              Add your first return
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-obsidian-800">
                    <th
                      className="text-left py-3 px-4 text-sm font-medium text-obsidian-400 cursor-pointer hover:text-white"
                      onClick={() => handleSort('return_initiated_date')}
                    >
                      <div className="flex items-center gap-1">
                        Date <SortIcon field="return_initiated_date" />
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-obsidian-400">Item</th>
                    <th
                      className="text-left py-3 px-4 text-sm font-medium text-obsidian-400 cursor-pointer hover:text-white"
                      onClick={() => handleSort('vendor')}
                    >
                      <div className="flex items-center gap-1">
                        Vendor <SortIcon field="vendor" />
                      </div>
                    </th>
                    <th
                      className="text-right py-3 px-4 text-sm font-medium text-obsidian-400 cursor-pointer hover:text-white"
                      onClick={() => handleSort('original_cost')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Original <SortIcon field="original_cost" />
                      </div>
                    </th>
                    <th
                      className="text-right py-3 px-4 text-sm font-medium text-obsidian-400 cursor-pointer hover:text-white"
                      onClick={() => handleSort('net_return')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Net Return <SortIcon field="net_return" />
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-obsidian-400">Status</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-obsidian-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEntries.map((entry) => {
                    const statusConfig = STATUS_CONFIG[entry.status]
                    const StatusIcon = statusConfig.icon
                    return (
                      <tr key={entry.id} className="border-b border-obsidian-800/50 hover:bg-obsidian-800/30">
                        <td className="py-3 px-4 text-sm text-slate-300">
                          {entry.return_initiated_date
                            ? new Date(entry.return_initiated_date).toLocaleDateString()
                            : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-300 max-w-[200px] truncate">
                          {entry.item_description}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-300">{entry.vendor}</td>
                        <td className="py-3 px-4 text-sm text-slate-400 text-right">
                          ${Number(entry.original_cost).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-sm text-emerald-400 text-right font-medium">
                          ${Number(entry.net_return).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            {entry.status === 'pending' && (
                              <button
                                onClick={() => markAsInProgress(entry.id)}
                                className="p-1.5 hover:bg-blue-500/20 rounded-lg transition-colors"
                                title="Mark In Progress"
                              >
                                <Truck className="w-4 h-4 text-blue-400" />
                              </button>
                            )}
                            {entry.status === 'in_progress' && (
                              <button
                                onClick={() => markAsCompleted(entry.id)}
                                className="p-1.5 hover:bg-emerald-500/20 rounded-lg transition-colors"
                                title="Mark Completed"
                              >
                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                              </button>
                            )}
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
                <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl text-center">
                  <div className="text-xs text-amber-400 mb-1">Pending Returns</div>
                  <div className="text-lg font-semibold text-white">${totals.pendingReturn.toFixed(2)}</div>
                  <div className="text-xs text-obsidian-400">
                    {totals.pendingCount + totals.inProgressCount} items
                  </div>
                </div>
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-center">
                  <div className="text-xs text-emerald-400 mb-1">Completed</div>
                  <div className="text-lg font-semibold text-emerald-400">${totals.completedReturn.toFixed(2)}</div>
                  <div className="text-xs text-obsidian-400">{totals.completedCount} items</div>
                </div>
                <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl text-center">
                  <div className="text-xs text-red-400 mb-1">Restocking Fees</div>
                  <div className="text-lg font-semibold text-red-400">-${totals.restockingFees.toFixed(2)}</div>
                </div>
                <div className="p-3 bg-obsidian-800/30 rounded-xl text-center">
                  <div className="text-xs text-obsidian-400 mb-1">Expected Total</div>
                  <div className="text-lg font-semibold text-white">${totals.expectedReturn.toFixed(2)}</div>
                  <div className="text-xs text-obsidian-400">{totals.count} total</div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
