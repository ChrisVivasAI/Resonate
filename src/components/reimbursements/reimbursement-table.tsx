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
  Check,
  X,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { useReimbursements, type Reimbursement, type ReimbursementInput } from '@/hooks'
import { ReimbursementForm } from './reimbursement-form'

interface ReimbursementTableProps {
  projectId: string
}

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock },
  approved: { label: 'Approved', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Check },
  rejected: { label: 'Rejected', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle },
  paid: { label: 'Paid', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle },
}

export function ReimbursementTable({ projectId }: ReimbursementTableProps) {
  const {
    reimbursements,
    loading,
    error,
    totals,
    addReimbursement,
    updateReimbursement,
    deleteReimbursement,
    approveReimbursement,
    rejectReimbursement,
    markAsPaid,
  } = useReimbursements({ projectId })

  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<Reimbursement | null>(null)
  const [sortField, setSortField] = useState<keyof Reimbursement>('date_incurred')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [filterStatus, setFilterStatus] = useState<string>('')

  const handleSort = (field: keyof Reimbursement) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedEntries = [...reimbursements]
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

  const handleAddEntry = async (entry: ReimbursementInput) => {
    await addReimbursement(entry)
    setShowForm(false)
  }

  const handleUpdateEntry = async (entry: ReimbursementInput) => {
    if (editingEntry) {
      await updateReimbursement(editingEntry.id, entry)
      setEditingEntry(null)
    }
  }

  const handleDeleteEntry = async (id: string) => {
    if (confirm('Are you sure you want to delete this reimbursement request?')) {
      await deleteReimbursement(id)
    }
  }

  const SortIcon = ({ field }: { field: keyof Reimbursement }) => {
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
    return <ReimbursementForm projectId={projectId} onSubmit={handleAddEntry} onCancel={() => setShowForm(false)} />
  }

  if (editingEntry) {
    return (
      <ReimbursementForm
        projectId={projectId}
        onSubmit={handleUpdateEntry}
        onCancel={() => setEditingEntry(null)}
        initialData={{
          person_name: editingEntry.person_name,
          person_email: editingEntry.person_email || undefined,
          description: editingEntry.description,
          category: editingEntry.category,
          vendor: editingEntry.vendor || undefined,
          amount: editingEntry.amount,
          date_incurred: editingEntry.date_incurred,
          receipt_url: editingEntry.receipt_url || undefined,
          notes: editingEntry.notes || undefined,
        }}
        isEdit
      />
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Reimbursements</CardTitle>
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
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowForm(true)}>
            Add Reimbursement
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {reimbursements.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-obsidian-400 mb-4">No reimbursement requests yet</p>
            <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
              Add your first reimbursement
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
                      onClick={() => handleSort('date_incurred')}
                    >
                      <div className="flex items-center gap-1">
                        Date <SortIcon field="date_incurred" />
                      </div>
                    </th>
                    <th
                      className="text-left py-3 px-4 text-sm font-medium text-obsidian-400 cursor-pointer hover:text-white"
                      onClick={() => handleSort('person_name')}
                    >
                      <div className="flex items-center gap-1">
                        Person <SortIcon field="person_name" />
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-obsidian-400">Description</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-obsidian-400">Category</th>
                    <th
                      className="text-right py-3 px-4 text-sm font-medium text-obsidian-400 cursor-pointer hover:text-white"
                      onClick={() => handleSort('amount')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Amount <SortIcon field="amount" />
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
                          {new Date(entry.date_incurred).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-300">{entry.person_name}</td>
                        <td className="py-3 px-4 text-sm text-slate-300 max-w-[200px] truncate">
                          {entry.description}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="default">{entry.category}</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-white text-right font-medium">
                          ${Number(entry.amount).toFixed(2)}
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
                              <>
                                <button
                                  onClick={() => approveReimbursement(entry.id)}
                                  className="p-1.5 hover:bg-emerald-500/20 rounded-lg transition-colors"
                                  title="Approve"
                                >
                                  <Check className="w-4 h-4 text-emerald-400" />
                                </button>
                                <button
                                  onClick={() => rejectReimbursement(entry.id)}
                                  className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                                  title="Reject"
                                >
                                  <X className="w-4 h-4 text-red-400" />
                                </button>
                              </>
                            )}
                            {entry.status === 'approved' && (
                              <button
                                onClick={() => markAsPaid(entry.id)}
                                className="p-1.5 hover:bg-emerald-500/20 rounded-lg transition-colors"
                                title="Mark as Paid"
                              >
                                <DollarSign className="w-4 h-4 text-emerald-400" />
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
                  <div className="text-xs text-amber-400 mb-1">Pending</div>
                  <div className="text-lg font-semibold text-white">${totals.pending.toFixed(2)}</div>
                  <div className="text-xs text-obsidian-400">{totals.pendingCount} requests</div>
                </div>
                <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl text-center">
                  <div className="text-xs text-blue-400 mb-1">Approved</div>
                  <div className="text-lg font-semibold text-white">${totals.approved.toFixed(2)}</div>
                  <div className="text-xs text-obsidian-400">{totals.approvedCount} requests</div>
                </div>
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-center">
                  <div className="text-xs text-emerald-400 mb-1">Paid</div>
                  <div className="text-lg font-semibold text-emerald-400">${totals.paid.toFixed(2)}</div>
                </div>
                <div className="p-3 bg-obsidian-800/30 rounded-xl text-center">
                  <div className="text-xs text-obsidian-400 mb-1">Total</div>
                  <div className="text-lg font-semibold text-white">${totals.total.toFixed(2)}</div>
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
