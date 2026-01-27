'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Filter } from 'lucide-react'
import { useExpenses, type Expense, type ExpenseInput } from '@/hooks'
import { ExpenseForm } from './expense-form'

interface ExpenseTableProps {
  projectId: string
}

export function ExpenseTable({ projectId }: ExpenseTableProps) {
  const { expenses, loading, error, totals, addExpense, updateExpense, deleteExpense } = useExpenses({ projectId })
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [sortField, setSortField] = useState<keyof Expense>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [filterCategory, setFilterCategory] = useState<string>('')

  const categories = Array.from(new Set(expenses.map((e) => e.category))).sort()

  const handleSort = (field: keyof Expense) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedExpenses = [...expenses]
    .filter((e) => !filterCategory || e.category === filterCategory)
    .sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

  const handleAddExpense = async (expense: ExpenseInput) => {
    await addExpense(expense)
    setShowForm(false)
  }

  const handleUpdateExpense = async (expense: ExpenseInput) => {
    if (editingExpense) {
      await updateExpense(editingExpense.id, expense)
      setEditingExpense(null)
    }
  }

  const handleDeleteExpense = async (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      await deleteExpense(id)
    }
  }

  const SortIcon = ({ field }: { field: keyof Expense }) => {
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
    return <ExpenseForm projectId={projectId} onSubmit={handleAddExpense} onCancel={() => setShowForm(false)} />
  }

  if (editingExpense) {
    return (
      <ExpenseForm
        projectId={projectId}
        onSubmit={handleUpdateExpense}
        onCancel={() => setEditingExpense(null)}
        initialData={{
          date: editingExpense.date,
          category: editingExpense.category,
          description: editingExpense.description || undefined,
          vendor_or_person: editingExpense.vendor_or_person || undefined,
          cost_pre_tax: editingExpense.cost_pre_tax,
          tax: editingExpense.tax,
          is_billable: editingExpense.is_billable,
          markup_percent: editingExpense.markup_percent,
          is_paid: editingExpense.is_paid,
          payment_method: editingExpense.payment_method || undefined,
          notes: editingExpense.notes || undefined,
        }}
        isEdit
      />
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Expenses</CardTitle>
        <div className="flex items-center gap-3">
          {categories.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-obsidian-400" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-obsidian-800 border border-obsidian-700 rounded-lg px-3 py-1.5 text-sm text-slate-300"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowForm(true)}>
            Add Expense
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {expenses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-obsidian-400 mb-4">No expenses recorded yet</p>
            <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
              Add your first expense
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
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center gap-1">
                        Date <SortIcon field="date" />
                      </div>
                    </th>
                    <th
                      className="text-left py-3 px-4 text-sm font-medium text-obsidian-400 cursor-pointer hover:text-white"
                      onClick={() => handleSort('category')}
                    >
                      <div className="flex items-center gap-1">
                        Category <SortIcon field="category" />
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-obsidian-400">Description</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-obsidian-400">Vendor</th>
                    <th
                      className="text-right py-3 px-4 text-sm font-medium text-obsidian-400 cursor-pointer hover:text-white"
                      onClick={() => handleSort('total')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Total <SortIcon field="total" />
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-obsidian-400">Billable</th>
                    <th
                      className="text-right py-3 px-4 text-sm font-medium text-obsidian-400 cursor-pointer hover:text-white"
                      onClick={() => handleSort('client_price')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Client Price <SortIcon field="client_price" />
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-obsidian-400">Status</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-obsidian-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedExpenses.map((expense) => (
                    <tr key={expense.id} className="border-b border-obsidian-800/50 hover:bg-obsidian-800/30">
                      <td className="py-3 px-4 text-sm text-slate-300">
                        {new Date(expense.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="default">{expense.category}</Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-300 max-w-[200px] truncate">
                        {expense.description || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-300">{expense.vendor_or_person || '-'}</td>
                      <td className="py-3 px-4 text-sm text-slate-100 text-right font-medium">
                        ${Number(expense.total).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {expense.is_billable ? (
                          <span className="text-emerald-400 text-sm">Yes</span>
                        ) : (
                          <span className="text-obsidian-400 text-sm">No</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-emerald-400 text-right font-medium">
                        ${Number(expense.client_price).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {expense.is_paid ? (
                          <Badge variant="success">Paid</Badge>
                        ) : (
                          <Badge variant="warning">Unpaid</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingExpense(expense)}
                            className="p-1.5 hover:bg-obsidian-700 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4 text-obsidian-400 hover:text-white" />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-obsidian-400 hover:text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals row */}
            <div className="mt-6 pt-4 border-t border-obsidian-800">
              <div className="flex justify-between items-center">
                <div className="text-sm text-obsidian-400">
                  {totals.count} expense{totals.count !== 1 ? 's' : ''} • {totals.unpaid} unpaid
                </div>
                <div className="flex gap-8">
                  <div className="text-right">
                    <div className="text-xs text-obsidian-400 mb-1">Total Cost</div>
                    <div className="text-lg font-semibold text-white">${totals.cost.toFixed(2)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-obsidian-400 mb-1">Client Charges</div>
                    <div className="text-lg font-semibold text-emerald-400">${totals.clientPrice.toFixed(2)}</div>
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
