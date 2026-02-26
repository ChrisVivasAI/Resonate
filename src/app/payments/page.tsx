'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Plus,
  Search,
  Download,
  Send,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  MoreHorizontal,
  FileText,
  CreditCard,
  Loader2,
  Receipt,
  Ban,
  ExternalLink,
  Pencil,
  Trash2,
  X,
} from 'lucide-react'
import { DashboardLayout, Header } from '@/components/layout'
import { Card, CardContent, Button, Input, Badge, Avatar, Tabs, TabsList, TabsTrigger, TabsContent, Modal, Select } from '@/components/ui'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import { usePayments, useClients, useProjects, useInvoices } from '@/hooks'
import type { Invoice, InvoiceLineItem } from '@/types'

const invoiceStatusColors: Record<string, string> = {
  draft: 'bg-white/10 text-white/60',
  sent: 'bg-blue-500/10 text-blue-400',
  paid: 'bg-emerald-500/10 text-emerald-400',
  overdue: 'bg-red-500/10 text-red-400',
  cancelled: 'bg-white/10 text-white/40',
}

const invoiceTypeLabels: Record<string, string> = {
  deposit: 'Deposit',
  milestone: 'Milestone',
  custom: 'Custom',
}

export default function PaymentsPage() {
  const { payments, loading: paymentsLoading } = usePayments()
  const { invoices, loading: invoicesLoading, totals: invoiceTotals, createInvoice, sendInvoice, voidInvoice, deleteInvoice, updateInvoice } = useInvoices()
  const { clients } = useClients()
  const { projects } = useProjects()

  const [searchQuery, setSearchQuery] = useState('')
  const [isNewInvoiceModalOpen, setIsNewInvoiceModalOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ type: 'send' | 'void' | 'delete'; invoice: Invoice } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Invoice form state
  const [invoiceForm, setInvoiceForm] = useState({
    client_id: '',
    project_id: '',
    amount: '',
    tax_amount: '0',
    due_date: '',
    notes: '',
    line_items: [{ id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0, total: 0 }] as InvoiceLineItem[],
  })

  const resetInvoiceForm = () => {
    setInvoiceForm({
      client_id: '',
      project_id: '',
      amount: '',
      tax_amount: '0',
      due_date: '',
      notes: '',
      line_items: [{ id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0, total: 0 }],
    })
  }

  const filteredPayments = payments.filter(
    (payment) =>
      payment.client?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.project?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredInvoices = invoices.filter(
    (invoice) =>
      invoice.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.client?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.project?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalRevenue = payments.filter((p) => p.status === 'succeeded').reduce((acc, p) => acc + Number(p.amount), 0)
  const pendingAmount = payments.filter((p) => p.status === 'pending').reduce((acc, p) => acc + Number(p.amount), 0)

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const thisMonthRevenue = payments
    .filter((p) => p.status === 'succeeded' && new Date(p.created_at) >= startOfMonth)
    .reduce((acc, p) => acc + Number(p.amount), 0)

  const loading = paymentsLoading || invoicesLoading

  const updateLineItem = (index: number, field: keyof InvoiceLineItem, value: string | number) => {
    const updated = [...invoiceForm.line_items]
    updated[index] = { ...updated[index], [field]: value }
    if (field === 'quantity' || field === 'unit_price') {
      updated[index].total = Number(updated[index].quantity) * Number(updated[index].unit_price)
    }
    const totalAmount = updated.reduce((sum, item) => sum + item.total, 0)
    setInvoiceForm({ ...invoiceForm, line_items: updated, amount: String(totalAmount) })
  }

  const addLineItem = () => {
    setInvoiceForm({
      ...invoiceForm,
      line_items: [...invoiceForm.line_items, { id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0, total: 0 }],
    })
  }

  const removeLineItem = (index: number) => {
    if (invoiceForm.line_items.length <= 1) return
    const updated = invoiceForm.line_items.filter((_, i) => i !== index)
    const totalAmount = updated.reduce((sum, item) => sum + item.total, 0)
    setInvoiceForm({ ...invoiceForm, line_items: updated, amount: String(totalAmount) })
  }

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      await createInvoice({
        client_id: invoiceForm.client_id,
        project_id: invoiceForm.project_id || undefined,
        amount: Number(invoiceForm.amount),
        tax_amount: Number(invoiceForm.tax_amount),
        due_date: invoiceForm.due_date || undefined,
        line_items: invoiceForm.line_items,
        notes: invoiceForm.notes || undefined,
      })
      setIsNewInvoiceModalOpen(false)
      resetInvoiceForm()
    } catch (err) {
      console.error('Error creating invoice:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingInvoice) return
    setActionLoading(true)
    try {
      await updateInvoice(editingInvoice.id, {
        amount: Number(invoiceForm.amount),
        tax_amount: Number(invoiceForm.tax_amount),
        due_date: invoiceForm.due_date || undefined,
        line_items: invoiceForm.line_items,
        notes: invoiceForm.notes || undefined,
      })
      setEditingInvoice(null)
      resetInvoiceForm()
    } catch (err) {
      console.error('Error updating invoice:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmAction = async () => {
    if (!confirmAction) return
    setActionLoading(true)
    try {
      if (confirmAction.type === 'send') {
        await sendInvoice(confirmAction.invoice.id)
      } else if (confirmAction.type === 'void') {
        await voidInvoice(confirmAction.invoice.id)
      } else if (confirmAction.type === 'delete') {
        await deleteInvoice(confirmAction.invoice.id)
      }
      setConfirmAction(null)
    } catch (err) {
      console.error(`Error ${confirmAction.type}ing invoice:`, err)
    } finally {
      setActionLoading(false)
    }
  }

  const openEditInvoice = (invoice: Invoice) => {
    setInvoiceForm({
      client_id: invoice.client_id,
      project_id: invoice.project_id || '',
      amount: String(invoice.amount),
      tax_amount: String(invoice.tax_amount),
      due_date: invoice.due_date ? invoice.due_date.split('T')[0] : '',
      notes: invoice.notes || '',
      line_items: invoice.line_items?.length > 0 ? invoice.line_items : [{ id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0, total: 0 }],
    })
    setEditingInvoice(invoice)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-resonate-400 animate-spin" />
            <p className="text-charcoal-500 text-sm">Loading payments...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <Header
        title="Payments"
        description="Manage invoices, track payments, and monitor revenue."
        actions={
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsNewInvoiceModalOpen(true)}>
            Create Invoice
          </Button>
        }
      />

      <div className="p-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Revenue', value: formatCurrency(totalRevenue), icon: DollarSign, color: 'resonate' },
            { label: 'Outstanding', value: formatCurrency(invoiceTotals.outstanding), icon: Clock, color: 'amber' },
            { label: 'This Month', value: formatCurrency(thisMonthRevenue), icon: TrendingUp, color: 'blue' },
            { label: 'Invoices Paid', value: formatCurrency(invoiceTotals.paid), icon: CheckCircle2, color: 'resonate' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card>
                <CardContent className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-charcoal-400 mb-1">{stat.label}</p>
                    <p className="text-2xl font-semibold text-white">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${
                    stat.color === 'resonate' ? 'bg-resonate-400/10' :
                    stat.color === 'amber' ? 'bg-amber-500/10' : 'bg-blue-500/10'
                  }`}>
                    <stat.icon className={`w-5 h-5 ${
                      stat.color === 'resonate' ? 'text-resonate-400' :
                      stat.color === 'amber' ? 'text-amber-400' : 'text-blue-400'
                    }`} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="invoices" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-4">
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-500" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="secondary" leftIcon={<Download className="w-4 h-4" />}>
                Export
              </Button>
            </div>
          </div>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
            {filteredInvoices.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-xl bg-white/[0.04] flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-charcoal-500" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No invoices yet</h3>
                <p className="text-charcoal-500 text-sm mb-6">
                  {searchQuery ? 'Try adjusting your search terms.' : 'Create your first invoice to get started.'}
                </p>
                {!searchQuery && (
                  <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsNewInvoiceModalOpen(true)}>
                    Create Invoice
                  </Button>
                )}
              </div>
            )}

            {filteredInvoices.length > 0 && (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left py-4 px-4 text-[10px] font-medium text-charcoal-500 uppercase tracking-[0.1em]">Invoice #</th>
                        <th className="text-left py-4 px-4 text-[10px] font-medium text-charcoal-500 uppercase tracking-[0.1em]">Client</th>
                        <th className="text-left py-4 px-4 text-[10px] font-medium text-charcoal-500 uppercase tracking-[0.1em]">Project</th>
                        <th className="text-left py-4 px-4 text-[10px] font-medium text-charcoal-500 uppercase tracking-[0.1em]">Type</th>
                        <th className="text-left py-4 px-4 text-[10px] font-medium text-charcoal-500 uppercase tracking-[0.1em]">Amount</th>
                        <th className="text-left py-4 px-4 text-[10px] font-medium text-charcoal-500 uppercase tracking-[0.1em]">Status</th>
                        <th className="text-left py-4 px-4 text-[10px] font-medium text-charcoal-500 uppercase tracking-[0.1em]">Due Date</th>
                        <th className="text-right py-4 px-4 text-[10px] font-medium text-charcoal-500 uppercase tracking-[0.1em]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map((invoice) => (
                        <tr key={invoice.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                          <td className="py-4 px-4">
                            <span className="font-mono text-sm text-white">{invoice.invoice_number}</span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={invoice.client?.name || 'Unknown'} size="sm" />
                              <div>
                                <p className="font-medium text-white text-sm">{invoice.client?.name || 'Unknown'}</p>
                                <p className="text-xs text-charcoal-500">{invoice.client?.company || ''}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-charcoal-300 text-sm">{invoice.project?.name || '-'}</td>
                          <td className="py-4 px-4">
                            <Badge className="bg-white/5 text-white/60 text-xs">
                              {invoiceTypeLabels[invoice.invoice_type] || invoice.invoice_type}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 font-medium text-white">
                            {formatCurrency(invoice.total_amount)}
                          </td>
                          <td className="py-4 px-4">
                            <Badge className={invoiceStatusColors[invoice.status] || 'bg-white/10 text-white/60'}>
                              {invoice.status}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-charcoal-400 text-sm">
                            {invoice.due_date ? formatDate(invoice.due_date) : '-'}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end gap-1">
                              {invoice.status === 'draft' && (
                                <>
                                  <button
                                    onClick={() => setConfirmAction({ type: 'send', invoice })}
                                    className="p-1.5 rounded-lg hover:bg-blue-500/10 text-blue-400 transition-colors"
                                    title="Send Invoice"
                                  >
                                    <Send className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => openEditInvoice(invoice)}
                                    className="p-1.5 rounded-lg hover:bg-white/[0.06] text-charcoal-400 transition-colors"
                                    title="Edit"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setConfirmAction({ type: 'delete', invoice })}
                                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              {invoice.status === 'sent' && (
                                <button
                                  onClick={() => setConfirmAction({ type: 'void', invoice })}
                                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                                  title="Void Invoice"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              )}
                              {invoice.stripe_invoice_url && (
                                <a
                                  href={invoice.stripe_invoice_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg hover:bg-white/[0.06] text-charcoal-400 transition-colors"
                                  title="View on Stripe"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            {filteredPayments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-xl bg-white/[0.04] flex items-center justify-center mb-4">
                  <Receipt className="w-8 h-8 text-charcoal-500" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No payments found</h3>
                <p className="text-charcoal-500 text-sm mb-6">
                  {searchQuery ? 'Try adjusting your search terms.' : 'Payments will appear here once clients make payments.'}
                </p>
              </div>
            )}

            {filteredPayments.length > 0 && (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left py-4 px-4 text-[10px] font-medium text-charcoal-500 uppercase tracking-[0.1em]">Client</th>
                        <th className="text-left py-4 px-4 text-[10px] font-medium text-charcoal-500 uppercase tracking-[0.1em]">Project</th>
                        <th className="text-left py-4 px-4 text-[10px] font-medium text-charcoal-500 uppercase tracking-[0.1em]">Amount</th>
                        <th className="text-left py-4 px-4 text-[10px] font-medium text-charcoal-500 uppercase tracking-[0.1em]">Status</th>
                        <th className="text-left py-4 px-4 text-[10px] font-medium text-charcoal-500 uppercase tracking-[0.1em]">Method</th>
                        <th className="text-left py-4 px-4 text-[10px] font-medium text-charcoal-500 uppercase tracking-[0.1em]">Date</th>
                        <th className="text-right py-4 px-4 text-[10px] font-medium text-charcoal-500 uppercase tracking-[0.1em]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayments.map((payment) => (
                        <tr key={payment.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={payment.client?.name || 'Unknown'} size="sm" />
                              <div>
                                <p className="font-medium text-white">{payment.client?.name || 'Unknown'}</p>
                                <p className="text-xs text-charcoal-500">{payment.client?.email || '-'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-charcoal-300">{payment.project?.name || payment.description || '-'}</td>
                          <td className="py-4 px-4 font-medium text-white">
                            {formatCurrency(payment.amount)}
                          </td>
                          <td className="py-4 px-4">
                            <Badge className={getStatusColor(payment.status)}>{payment.status}</Badge>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2 text-charcoal-400">
                              <CreditCard className="w-4 h-4" />
                              <span className="capitalize">{payment.payment_method?.replace('_', ' ') || 'card'}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-charcoal-400">{formatDate(payment.created_at)}</td>
                          <td className="py-4 px-4 text-right">
                            <button className="p-2 rounded-lg hover:bg-white/[0.04] transition-colors">
                              <MoreHorizontal className="w-4 h-4 text-charcoal-500" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Invoice Modal */}
      <Modal
        isOpen={isNewInvoiceModalOpen}
        onClose={() => { setIsNewInvoiceModalOpen(false); resetInvoiceForm() }}
        title="Create Invoice"
        description="Generate a new invoice for a client."
        size="lg"
      >
        <form onSubmit={handleCreateInvoice} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Select
              label="Client"
              placeholder="Select client"
              value={invoiceForm.client_id}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, client_id: e.target.value })}
              options={clients.map((c) => ({ value: c.id, label: c.name + (c.company ? ` (${c.company})` : '') }))}
              required
            />
            <Select
              label="Project (optional)"
              placeholder="No project"
              value={invoiceForm.project_id}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, project_id: e.target.value })}
              options={[{ value: '', label: 'No project' }, ...projects.map((p) => ({ value: p.id, label: p.name }))]}
            />
          </div>

          {/* Line Items */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Line Items</label>
            <div className="space-y-2">
              {invoiceForm.line_items.map((item, index) => (
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
                    placeholder="Price"
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
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-charcoal-500 hover:text-red-400 transition-colors"
                    disabled={invoiceForm.line_items.length <= 1}
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

          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Tax Amount"
              type="number"
              placeholder="0.00"
              value={invoiceForm.tax_amount}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, tax_amount: e.target.value })}
              min="0"
              step="0.01"
            />
            <Input
              label="Due Date"
              type="date"
              value={invoiceForm.due_date}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Notes (optional)</label>
            <textarea
              value={invoiceForm.notes}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={2}
              className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#23FD9E]/50 focus:ring-1 focus:ring-[#23FD9E]/20 resize-none transition-colors text-sm"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-white/60">
              Total: <span className="text-white font-semibold">{formatCurrency(Number(invoiceForm.amount || 0) + Number(invoiceForm.tax_amount || 0))}</span>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" type="button" onClick={() => { setIsNewInvoiceModalOpen(false); resetInvoiceForm() }}>
                Cancel
              </Button>
              <Button type="submit" disabled={actionLoading || !invoiceForm.client_id || !invoiceForm.amount}>
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Invoice
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit Invoice Modal */}
      <Modal
        isOpen={!!editingInvoice}
        onClose={() => { setEditingInvoice(null); resetInvoiceForm() }}
        title="Edit Invoice"
        description={`Editing ${editingInvoice?.invoice_number || ''}`}
        size="lg"
      >
        <form onSubmit={handleUpdateInvoice} className="space-y-4">
          {/* Line Items */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Line Items</label>
            <div className="space-y-2">
              {invoiceForm.line_items.map((item, index) => (
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
                    placeholder="Price"
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
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-charcoal-500 hover:text-red-400 transition-colors"
                    disabled={invoiceForm.line_items.length <= 1}
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

          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Tax Amount"
              type="number"
              placeholder="0.00"
              value={invoiceForm.tax_amount}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, tax_amount: e.target.value })}
              min="0"
              step="0.01"
            />
            <Input
              label="Due Date"
              type="date"
              value={invoiceForm.due_date}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Notes (optional)</label>
            <textarea
              value={invoiceForm.notes}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={2}
              className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#23FD9E]/50 focus:ring-1 focus:ring-[#23FD9E]/20 resize-none transition-colors text-sm"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-white/60">
              Total: <span className="text-white font-semibold">{formatCurrency(Number(invoiceForm.amount || 0) + Number(invoiceForm.tax_amount || 0))}</span>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" type="button" onClick={() => { setEditingInvoice(null); resetInvoiceForm() }}>
                Cancel
              </Button>
              <Button type="submit" disabled={actionLoading}>
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Confirm Action Modal */}
      <Modal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={
          confirmAction?.type === 'send' ? 'Send Invoice' :
          confirmAction?.type === 'void' ? 'Void Invoice' :
          'Delete Invoice'
        }
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-white/60 text-sm">
            {confirmAction?.type === 'send' && (
              <>Are you sure you want to send <span className="text-white font-medium">{confirmAction.invoice.invoice_number}</span> to <span className="text-white font-medium">{confirmAction.invoice.client?.name}</span> via Stripe? This will finalize the invoice and email it to the client.</>
            )}
            {confirmAction?.type === 'void' && (
              <>Are you sure you want to void <span className="text-white font-medium">{confirmAction.invoice.invoice_number}</span>? This will cancel the invoice in Stripe and it cannot be undone.</>
            )}
            {confirmAction?.type === 'delete' && (
              <>Are you sure you want to delete <span className="text-white font-medium">{confirmAction.invoice.invoice_number}</span>? This action cannot be undone.</>
            )}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmAction?.type === 'send' ? 'primary' : 'danger'}
              onClick={handleConfirmAction}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {confirmAction?.type === 'send' ? 'Send Invoice' :
               confirmAction?.type === 'void' ? 'Void Invoice' :
               'Delete Invoice'}
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
