'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Plus,
  Search,
  Filter,
  Download,
  Send,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  FileText,
  CreditCard,
  Loader2,
  Receipt,
} from 'lucide-react'
import { DashboardLayout, Header } from '@/components/layout'
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge, Avatar, Tabs, TabsList, TabsTrigger, TabsContent, Modal } from '@/components/ui'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import { usePayments } from '@/hooks'

export default function PaymentsPage() {
  const { payments, loading, error } = usePayments()
  const [searchQuery, setSearchQuery] = useState('')
  const [isNewInvoiceModalOpen, setIsNewInvoiceModalOpen] = useState(false)

  const filteredPayments = payments.filter(
    (payment) =>
      payment.client?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.project?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalRevenue = payments.filter((p) => p.status === 'succeeded').reduce((acc, p) => acc + Number(p.amount), 0)
  const pendingAmount = payments.filter((p) => p.status === 'pending').reduce((acc, p) => acc + Number(p.amount), 0)

  // Calculate this month's revenue
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const thisMonthRevenue = payments
    .filter((p) => p.status === 'succeeded' && new Date(p.created_at) >= startOfMonth)
    .reduce((acc, p) => acc + Number(p.amount), 0)

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
            { label: 'Pending', value: formatCurrency(pendingAmount), icon: Clock, color: 'amber' },
            { label: 'This Month', value: formatCurrency(thisMonthRevenue), icon: TrendingUp, color: 'blue' },
            { label: 'Successful', value: payments.filter((p) => p.status === 'succeeded').length, icon: CheckCircle2, color: 'resonate' },
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
        <Tabs defaultValue="payments" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
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

          <TabsContent value="payments">
            {/* Empty State */}
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

          <TabsContent value="invoices">
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-xl bg-white/[0.04] flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-charcoal-500" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Invoices coming soon</h3>
              <p className="text-charcoal-500 text-sm mb-6">
                Invoice management will be available in a future update.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* New Invoice Modal */}
      <Modal
        isOpen={isNewInvoiceModalOpen}
        onClose={() => setIsNewInvoiceModalOpen(false)}
        title="Create Invoice"
        description="Generate a new invoice for a client."
        size="lg"
      >
        <form className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="Client" placeholder="Select client" />
            <Input label="Project" placeholder="Select project (optional)" />
          </div>
          <Input label="Description" placeholder="Invoice description" />
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="Amount" type="number" placeholder="0.00" leftIcon={<DollarSign className="w-4 h-4" />} />
            <Input label="Due Date" type="date" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsNewInvoiceModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Invoice</Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
