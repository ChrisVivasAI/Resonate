'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FileText, Send, Ban, ExternalLink, Loader2, Plus, Pencil, Trash2, X, Download } from 'lucide-react'
import { useInvoices } from '@/hooks'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Invoice, InvoiceLineItem } from '@/types'
import type { StripeInvoicePreview } from '@/hooks'

interface InvoiceTableProps {
  projectId: string
  clientId?: string
}

const statusColors: Record<string, string> = {
  draft: 'bg-white/10 text-white/60',
  sent: 'bg-blue-500/10 text-blue-400',
  paid: 'bg-emerald-500/10 text-emerald-400',
  overdue: 'bg-red-500/10 text-red-400',
  cancelled: 'bg-white/10 text-white/40',
}

const stripeStatusColors: Record<string, string> = {
  draft: 'bg-white/10 text-white/60',
  open: 'bg-blue-500/10 text-blue-400',
  paid: 'bg-emerald-500/10 text-emerald-400',
  void: 'bg-white/10 text-white/40',
  uncollectible: 'bg-red-500/10 text-red-400',
}

const typeLabels: Record<string, string> = {
  deposit: 'Deposit',
  milestone: 'Milestone',
  custom: 'Custom',
}

const emptyForm = () => ({
  amount: '',
  tax_amount: '0',
  due_date: '',
  notes: '',
  line_items: [{ id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0, total: 0 }] as InvoiceLineItem[],
})

export function InvoiceTable({ projectId, clientId }: InvoiceTableProps) {
  const { invoices, loading, totals, createInvoice, updateInvoice, deleteInvoice, sendInvoice, voidInvoice, fetchStripeInvoices, importStripeInvoice } = useInvoices({ projectId })
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [form, setForm] = useState(emptyForm())

  // Import from Stripe state
  const [showImport, setShowImport] = useState(false)
  const [stripeInvoices, setStripeInvoices] = useState<StripeInvoicePreview[]>([])
  const [importLoading, setImportLoading] = useState(false)
  const [importingId, setImportingId] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [lastId, setLastId] = useState<string | null>(null)

  const resetForm = () => {
    setForm(emptyForm())
    setShowForm(false)
    setEditingInvoice(null)
  }

  const updateLineItem = (index: number, field: keyof InvoiceLineItem, value: string | number) => {
    const updated = [...form.line_items]
    updated[index] = { ...updated[index], [field]: value }
    if (field === 'quantity' || field === 'unit_price') {
      updated[index].total = Number(updated[index].quantity) * Number(updated[index].unit_price)
    }
    const totalAmount = updated.reduce((sum, item) => sum + item.total, 0)
    setForm({ ...form, line_items: updated, amount: String(totalAmount) })
  }

  const addLineItem = () => {
    setForm({
      ...form,
      line_items: [...form.line_items, { id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0, total: 0 }],
    })
  }

  const removeLineItem = (index: number) => {
    if (form.line_items.length <= 1) return
    const updated = form.line_items.filter((_, i) => i !== index)
    const totalAmount = updated.reduce((sum, item) => sum + item.total, 0)
    setForm({ ...form, line_items: updated, amount: String(totalAmount) })
  }

  const openEdit = (invoice: Invoice) => {
    setForm({
      amount: String(invoice.amount),
      tax_amount: String(invoice.tax_amount),
      due_date: invoice.due_date?.split('T')[0] || '',
      notes: invoice.notes || '',
      line_items: invoice.line_items?.length > 0
        ? invoice.line_items
        : [{ id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0, total: 0 }],
    })
    setEditingInvoice(invoice)
    setShowForm(false)
    setShowImport(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    try {
      if (editingInvoice) {
        await updateInvoice(editingInvoice.id, {
          amount: Number(form.amount),
          tax_amount: Number(form.tax_amount),
          due_date: form.due_date || undefined,
          line_items: form.line_items,
          notes: form.notes || undefined,
        })
      } else {
        // Resolve client_id from prop, or from existing invoices
        const resolvedClientId = clientId || invoices[0]?.client_id
        if (!resolvedClientId) {
          throw new Error('No client assigned to this project. Please assign a client first.')
        }
        await createInvoice({
          client_id: resolvedClientId,
          project_id: projectId,
          amount: Number(form.amount),
          tax_amount: Number(form.tax_amount),
          due_date: form.due_date || undefined,
          line_items: form.line_items,
          notes: form.notes || undefined,
        })
      }
      resetForm()
    } catch (err) {
      console.error('Error saving invoice:', err)
    } finally {
      setFormLoading(false)
    }
  }

  const handleSend = async (id: string) => {
    setActionLoading(id)
    try {
      await sendInvoice(id)
    } catch (err) {
      console.error('Error sending invoice:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleVoid = async (id: string) => {
    setActionLoading(id)
    try {
      await voidInvoice(id)
    } catch (err) {
      console.error('Error voiding invoice:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (id: string) => {
    setActionLoading(id)
    try {
      await deleteInvoice(id)
    } catch (err) {
      console.error('Error deleting invoice:', err)
    } finally {
      setActionLoading(null)
    }
  }

  // Import from Stripe handlers
  const openImportPanel = async () => {
    setShowImport(true)
    setShowForm(false)
    setEditingInvoice(null)
    setImportError(null)
    setStripeInvoices([])
    setImportLoading(true)
    try {
      const result = await fetchStripeInvoices()
      setStripeInvoices(result.invoices)
      setHasMore(result.has_more)
      setLastId(result.last_id)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to fetch Stripe invoices')
    } finally {
      setImportLoading(false)
    }
  }

  const loadMoreStripeInvoices = async () => {
    if (!lastId) return
    setImportLoading(true)
    try {
      const result = await fetchStripeInvoices(lastId)
      setStripeInvoices((prev) => [...prev, ...result.invoices])
      setHasMore(result.has_more)
      setLastId(result.last_id)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to load more invoices')
    } finally {
      setImportLoading(false)
    }
  }

  const handleImport = async (stripeId: string) => {
    setImportingId(stripeId)
    setImportError(null)
    try {
      await importStripeInvoice(stripeId, projectId)
      setStripeInvoices((prev) => prev.filter((inv) => inv.stripe_id !== stripeId))
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import invoice')
    } finally {
      setImportingId(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Import from Stripe panel
  if (showImport) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="w-4 h-4" />
              Import from Stripe
            </CardTitle>
            <Button variant="secondary" size="sm" onClick={() => setShowImport(false)}>
              Back to Invoices
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {importError && (
            <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {importError}
            </div>
          )}

          {importLoading && stripeInvoices.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
              <span className="ml-2 text-white/40 text-sm">Loading Stripe invoices...</span>
            </div>
          ) : stripeInvoices.length === 0 ? (
            <div className="text-center py-6">
              <FileText className="w-8 h-8 text-white/20 mx-auto mb-2" />
              <p className="text-white/40 text-sm">No importable invoices found in your Stripe account.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left py-3 px-3 text-[10px] font-medium text-white/40 uppercase tracking-[0.1em]">Invoice #</th>
                      <th className="text-left py-3 px-3 text-[10px] font-medium text-white/40 uppercase tracking-[0.1em]">Customer</th>
                      <th className="text-left py-3 px-3 text-[10px] font-medium text-white/40 uppercase tracking-[0.1em]">Amount</th>
                      <th className="text-left py-3 px-3 text-[10px] font-medium text-white/40 uppercase tracking-[0.1em]">Status</th>
                      <th className="text-left py-3 px-3 text-[10px] font-medium text-white/40 uppercase tracking-[0.1em]">Date</th>
                      <th className="text-right py-3 px-3 text-[10px] font-medium text-white/40 uppercase tracking-[0.1em]">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stripeInvoices.map((inv) => (
                      <tr key={inv.stripe_id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-3">
                          <span className="font-mono text-sm text-white">{inv.number || inv.stripe_id.slice(0, 12)}</span>
                        </td>
                        <td className="py-3 px-3">
                          <div>
                            <div className="text-sm text-white">{inv.customer_name || 'Unknown'}</div>
                            {inv.customer_email && (
                              <div className="text-xs text-white/40">{inv.customer_email}</div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-medium text-white text-sm">
                          {formatCurrency(inv.amount_due)}
                        </td>
                        <td className="py-3 px-3">
                          <Badge className={stripeStatusColors[inv.status || ''] || 'bg-white/10 text-white/60'}>
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-white/40 text-sm">
                          {inv.created ? new Date(inv.created * 1000).toLocaleDateString() : '-'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleImport(inv.stripe_id)}
                            disabled={importingId === inv.stripe_id}
                          >
                            {importingId === inv.stripe_id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                            ) : (
                              <Download className="w-3.5 h-3.5 mr-1" />
                            )}
                            Import
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button variant="secondary" size="sm" onClick={loadMoreStripeInvoices} disabled={importLoading}>
                    {importLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                    Load More
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  // Inline form for create/edit
  if (showForm || editingInvoice) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {editingInvoice ? `Edit ${editingInvoice.invoice_number}` : 'New Invoice'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Line Items */}
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">Line Items</label>
              <div className="space-y-2">
                {form.line_items.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[#23FD9E]/50 transition-colors"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', Number(e.target.value))}
                      min="1"
                      className="w-20 px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white text-sm text-center focus:outline-none focus:border-[#23FD9E]/50 transition-colors"
                    />
                    <input
                      type="number"
                      placeholder="Unit Price"
                      value={item.unit_price || ''}
                      onChange={(e) => updateLineItem(index, 'unit_price', Number(e.target.value))}
                      min="0"
                      step="0.01"
                      className="w-28 px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white text-sm text-right focus:outline-none focus:border-[#23FD9E]/50 transition-colors"
                    />
                    <span className="w-24 text-right text-sm text-white/60">
                      {formatCurrency(item.total)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"
                      disabled={form.line_items.length <= 1}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addLineItem}
                className="mt-2 text-sm text-[#23FD9E] hover:text-[#23FD9E]/80 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add line item
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Tax"
                type="number"
                placeholder="0.00"
                value={form.tax_amount}
                onChange={(e) => setForm({ ...form, tax_amount: e.target.value })}
                min="0"
                step="0.01"
              />
              <Input
                label="Due Date"
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Total</label>
                <div className="px-4 py-3 bg-white/[0.02] border border-white/5 rounded-lg text-white font-medium">
                  {formatCurrency(Number(form.amount || 0) + Number(form.tax_amount || 0))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional notes..."
                rows={2}
                className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#23FD9E]/50 focus:ring-1 focus:ring-[#23FD9E]/20 resize-none transition-colors text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" type="button" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading || !form.amount || Number(form.amount) <= 0}>
                {formLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingInvoice ? 'Save Changes' : 'Create Invoice'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Invoices
            {invoices.length > 0 && (
              <span className="text-xs font-normal text-white/40 ml-1">({invoices.length})</span>
            )}
          </CardTitle>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-white/40">
              Outstanding: <span className="text-amber-400 font-medium">{formatCurrency(totals.outstanding)}</span>
            </div>
            <div className="text-white/40">
              Paid: <span className="text-emerald-400 font-medium">{formatCurrency(totals.paid)}</span>
            </div>
            <Button variant="secondary" size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={openImportPanel}>
              Import from Stripe
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => { setShowForm(true); setShowImport(false) }}>
              Create Invoice
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="text-center py-6">
            <FileText className="w-8 h-8 text-white/20 mx-auto mb-2" />
            <p className="text-white/40 text-sm mb-3">No invoices for this project yet.</p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="secondary" size="sm" onClick={openImportPanel}>
                Import from Stripe
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
                Create your first invoice
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-3 px-3 text-[10px] font-medium text-white/40 uppercase tracking-[0.1em]">Invoice</th>
                  <th className="text-left py-3 px-3 text-[10px] font-medium text-white/40 uppercase tracking-[0.1em]">Type</th>
                  <th className="text-left py-3 px-3 text-[10px] font-medium text-white/40 uppercase tracking-[0.1em]">Amount</th>
                  <th className="text-left py-3 px-3 text-[10px] font-medium text-white/40 uppercase tracking-[0.1em]">Status</th>
                  <th className="text-left py-3 px-3 text-[10px] font-medium text-white/40 uppercase tracking-[0.1em]">Due</th>
                  <th className="text-right py-3 px-3 text-[10px] font-medium text-white/40 uppercase tracking-[0.1em]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-mono text-sm text-white">{invoice.invoice_number}</span>
                    </td>
                    <td className="py-3 px-3">
                      <Badge className="bg-white/5 text-white/60 text-xs">
                        {typeLabels[invoice.invoice_type] || invoice.invoice_type}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 font-medium text-white text-sm">
                      {formatCurrency(invoice.total_amount)}
                    </td>
                    <td className="py-3 px-3">
                      <Badge className={statusColors[invoice.status] || 'bg-white/10 text-white/60'}>
                        {invoice.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-white/40 text-sm">
                      {invoice.due_date ? formatDate(invoice.due_date) : '-'}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-end gap-1">
                        {invoice.status === 'draft' && (
                          <>
                            <button
                              onClick={() => handleSend(invoice.id)}
                              disabled={actionLoading === invoice.id}
                              className="p-1.5 rounded-lg hover:bg-blue-500/10 text-blue-400 transition-colors"
                              title="Send Invoice"
                            >
                              {actionLoading === invoice.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => openEdit(invoice)}
                              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-colors"
                              title="Edit Invoice"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(invoice.id)}
                              disabled={actionLoading === invoice.id}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors"
                              title="Delete Invoice"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {invoice.status === 'sent' && (
                          <button
                            onClick={() => handleVoid(invoice.id)}
                            disabled={actionLoading === invoice.id}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                            title="Void Invoice"
                          >
                            {actionLoading === invoice.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        {invoice.stripe_invoice_url && (
                          <a
                            href={invoice.stripe_invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 transition-colors"
                            title="View on Stripe"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
