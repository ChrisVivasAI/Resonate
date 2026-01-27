'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Search,
  Loader2,
  CreditCard,
  ChevronRight,
  DollarSign,
  Calendar,
  Filter,
  Download,
  Plus,
} from 'lucide-react'
import { DashboardLayout, Header } from '@/components/layout'
import { Card, Button, Input, Badge, Avatar, Modal } from '@/components/ui'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Client, Payment } from '@/types'

export default function ClientPaymentsPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string
  const supabase = createClient()

  const [client, setClient] = useState<Client | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single()

      if (clientError) throw clientError

      // Fetch payments with project info
      const { data: paymentsData } = await supabase
        .from('payments')
        .select(`
          *,
          project:projects(id, name)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      setClient(clientData)
      setPayments(paymentsData || [])
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.project?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalReceived = payments
    .filter(p => p.status === 'succeeded')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const totalPending = payments
    .filter(p => p.status === 'pending' || p.status === 'processing')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const statusCounts = {
    all: payments.length,
    succeeded: payments.filter(p => p.status === 'succeeded').length,
    pending: payments.filter(p => p.status === 'pending').length,
    processing: payments.filter(p => p.status === 'processing').length,
    failed: payments.filter(p => p.status === 'failed').length,
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

  if (!client) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <CreditCard className="w-12 h-12 text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Client Not Found</h2>
          <Button onClick={() => router.push('/clients')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Clients
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="border-b border-white/[0.06]">
        <div className="px-8 py-6">
          <div className="flex items-center gap-3 text-sm text-charcoal-500 mb-4">
            <Link href="/clients" className="hover:text-white transition-colors">
              Clients
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link href={`/clients/${clientId}`} className="hover:text-white transition-colors">
              {client.name}
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white">Payments</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar name={client.name} size="lg" />
              <div>
                <h1 className="text-2xl font-bold text-white">{client.name}&apos;s Payments</h1>
                <p className="text-charcoal-400">{payments.length} total payments</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" leftIcon={<Download className="w-4 h-4" />}>
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-resonate-400/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-resonate-400" />
                </div>
                <div>
                  <p className="text-xs text-charcoal-500 uppercase tracking-wider">Total Received</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(totalReceived)}</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-charcoal-500 uppercase tracking-wider">Pending</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(totalPending)}</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-xs text-charcoal-500 uppercase tracking-wider">Transactions</p>
                  <p className="text-xl font-bold text-white">{payments.length}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal-500" />
              <Input
                placeholder="Search payments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-2 mb-6">
          {[
            { key: 'all', label: 'All' },
            { key: 'succeeded', label: 'Succeeded' },
            { key: 'pending', label: 'Pending' },
            { key: 'processing', label: 'Processing' },
            { key: 'failed', label: 'Failed' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === tab.key
                  ? 'bg-white/[0.08] text-white'
                  : 'text-charcoal-500 hover:text-charcoal-300 hover:bg-white/[0.04]'
              }`}
            >
              {tab.label}
              <span className="ml-2 text-xs opacity-60">
                {statusCounts[tab.key as keyof typeof statusCounts]}
              </span>
            </button>
          ))}
        </div>

        {/* Payments List */}
        {filteredPayments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-xl bg-white/[0.04] flex items-center justify-center mb-4">
              <CreditCard className="w-8 h-8 text-charcoal-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No payments found</h3>
            <p className="text-charcoal-500 text-sm">
              {searchQuery ? 'Try adjusting your search terms.' : 'No payments recorded for this client yet.'}
            </p>
          </div>
        ) : (
          <Card>
            <div className="divide-y divide-white/[0.06]">
              {filteredPayments.map((payment, index) => (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                  className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      payment.status === 'succeeded'
                        ? 'bg-resonate-400/10'
                        : payment.status === 'pending' || payment.status === 'processing'
                        ? 'bg-amber-500/10'
                        : 'bg-red-500/10'
                    }`}>
                      <DollarSign className={`w-5 h-5 ${
                        payment.status === 'succeeded'
                          ? 'text-resonate-400'
                          : payment.status === 'pending' || payment.status === 'processing'
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-white">
                        {payment.description || 'Payment'}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        {payment.project && (
                          <Link
                            href={`/projects/${payment.project.id}`}
                            className="text-xs text-charcoal-400 hover:text-resonate-400 transition-colors"
                          >
                            {payment.project.name}
                          </Link>
                        )}
                        <span className="text-xs text-charcoal-500">
                          {formatDate(payment.created_at, 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-white">{formatCurrency(payment.amount)}</p>
                      <p className="text-xs text-charcoal-500">{payment.currency.toUpperCase()}</p>
                    </div>
                    <Badge className={getStatusColor(payment.status)}>
                      {payment.status}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
