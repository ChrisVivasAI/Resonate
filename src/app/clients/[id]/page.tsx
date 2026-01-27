'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Calendar,
  DollarSign,
  FolderKanban,
  CreditCard,
  MoreHorizontal,
  Loader2,
  User,
  Edit2,
  Trash2,
  ChevronRight,
  ExternalLink,
  Send,
} from 'lucide-react'
import { DashboardLayout, Header } from '@/components/layout'
import { Card, Button, Badge, Avatar, Modal, Input, Textarea, Select } from '@/components/ui'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Client, Project, Payment } from '@/types'

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string
  const supabase = createClient()

  const [client, setClient] = useState<Client | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    status: 'active' as Client['status'],
    notes: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Invite modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [isInviting, setIsInviting] = useState(false)

  const fetchClientData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single()

      if (clientError) throw clientError

      // Fetch projects for this client
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      // Fetch payments for this client
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(5)

      // Calculate total spent
      const { data: totalPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('client_id', clientId)
        .eq('status', 'succeeded')

      const totalSpent = totalPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

      setClient({
        ...clientData,
        total_spent: totalSpent,
        projects_count: projectsData?.length || 0,
      })
      setProjects(projectsData || [])
      setPayments(paymentsData || [])

      // Populate edit form
      setEditForm({
        name: clientData.name,
        email: clientData.email,
        phone: clientData.phone || '',
        company: clientData.company || '',
        status: clientData.status,
        notes: clientData.notes || '',
      })
      setInviteEmail(clientData.email)
    } catch (err) {
      console.error('Error fetching client:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch client')
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchClientData()
  }, [fetchClientData])

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone || null,
          company: editForm.company || null,
          status: editForm.status,
          notes: editForm.notes || null,
        })
        .eq('id', clientId)

      if (error) throw error

      setIsEditModalOpen(false)
      fetchClientData()
    } catch (err) {
      console.error('Error updating client:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClient = async () => {
    if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase.from('clients').delete().eq('id', clientId)
      if (error) throw error
      router.push('/clients')
    } catch (err) {
      console.error('Error deleting client:', err)
    }
  }

  const handleSendInvite = async () => {
    setIsInviting(true)
    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientId,
          email: inviteEmail,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send invitation')
      }

      setIsInviteModalOpen(false)
      alert('Invitation sent successfully!')
    } catch (err) {
      console.error('Error sending invitation:', err)
      alert(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setIsInviting(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-resonate-400 animate-spin" />
            <p className="text-charcoal-500 text-sm">Loading client...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !client) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <User className="w-12 h-12 text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Client Not Found</h2>
          <p className="text-charcoal-500 mb-6">{error || 'The client you are looking for does not exist.'}</p>
          <Button onClick={() => router.push('/clients')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Clients
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const activeProjects = projects.filter(p => p.status === 'in_progress' || p.status === 'review')
  const completedProjects = projects.filter(p => p.status === 'completed')

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
            <span className="text-white">{client.name}</span>
          </div>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar name={client.name} size="xl" />
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">{client.name}</h1>
                <div className="flex items-center gap-3">
                  {client.company && (
                    <span className="text-charcoal-400">{client.company}</span>
                  )}
                  <Badge className={getStatusColor(client.status)}>
                    {client.status}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsInviteModalOpen(true)}
                leftIcon={<Send className="w-4 h-4" />}
              >
                Send Portal Invite
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setIsEditModalOpen(true)}>
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button variant="secondary" size="sm" onClick={handleDeleteClient}>
                <Trash2 className="w-4 h-4 text-red-400" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
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
                  <p className="text-xs text-charcoal-500 uppercase tracking-wider">Total Spent</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(client.total_spent)}</p>
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
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-xs text-charcoal-500 uppercase tracking-wider">Total Projects</p>
                  <p className="text-xl font-bold text-white">{client.projects_count}</p>
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
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-charcoal-500 uppercase tracking-wider">Active Projects</p>
                  <p className="text-xl font-bold text-white">{activeProjects.length}</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-xs text-charcoal-500 uppercase tracking-wider">Client Since</p>
                  <p className="text-xl font-bold text-white">{formatDate(client.created_at, 'MMM yyyy')}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Contact Information */}
          <Card className="col-span-1">
            <h3 className="text-sm font-medium text-charcoal-500 uppercase tracking-wider mb-4">Contact Information</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-charcoal-500" />
                <a href={`mailto:${client.email}`} className="text-white hover:text-resonate-400 transition-colors">
                  {client.email}
                </a>
              </div>
              {client.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-charcoal-500" />
                  <span className="text-white">{client.phone}</span>
                </div>
              )}
              {client.company && (
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-charcoal-500" />
                  <span className="text-white">{client.company}</span>
                </div>
              )}
            </div>
            {client.notes && (
              <div className="mt-6 pt-6 border-t border-white/[0.06]">
                <h4 className="text-sm font-medium text-charcoal-500 uppercase tracking-wider mb-2">Notes</h4>
                <p className="text-charcoal-300 text-sm">{client.notes}</p>
              </div>
            )}
          </Card>

          {/* Recent Projects */}
          <Card className="col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-charcoal-500 uppercase tracking-wider">Recent Projects</h3>
              <Link href={`/clients/${clientId}/projects`}>
                <Button variant="ghost" size="sm">
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            {projects.length === 0 ? (
              <div className="text-center py-8">
                <FolderKanban className="w-10 h-10 text-charcoal-600 mx-auto mb-3" />
                <p className="text-charcoal-500 text-sm">No projects yet</p>
                <Link href={`/projects/new?client=${clientId}`}>
                  <Button variant="secondary" size="sm" className="mt-4">
                    Create Project
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.slice(0, 3).map((project) => (
                  <Link
                    key={project.id}
                    href={`/clients/${clientId}/projects/${project.id}`}
                    className="block p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-white">{project.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getStatusColor(project.status)}>
                            {project.status.replace('_', ' ')}
                          </Badge>
                          {project.due_date && (
                            <span className="text-xs text-charcoal-500">
                              Due {formatDate(project.due_date, 'MMM d')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-white">{formatCurrency(project.budget)}</p>
                        <p className="text-xs text-charcoal-500">{project.progress}% complete</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Recent Payments */}
        <Card className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-charcoal-500 uppercase tracking-wider">Recent Payments</h3>
            <Link href={`/clients/${clientId}/payments`}>
              <Button variant="ghost" size="sm">
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-10 h-10 text-charcoal-600 mx-auto mb-3" />
              <p className="text-charcoal-500 text-sm">No payments recorded</p>
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-resonate-400/10 flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-resonate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {payment.description || 'Payment'}
                      </p>
                      <p className="text-xs text-charcoal-500">
                        {formatDate(payment.created_at, 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-white">{formatCurrency(payment.amount)}</p>
                    <Badge className={getStatusColor(payment.status)}>
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Edit Client Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Client"
      >
        <form onSubmit={handleUpdateClient} className="space-y-4">
          <Input
            label="Full Name"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={editForm.email}
            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            required
          />
          <Input
            label="Phone"
            type="tel"
            value={editForm.phone}
            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
          />
          <Input
            label="Company"
            value={editForm.company}
            onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
          />
          <Select
            label="Status"
            value={editForm.status}
            onChange={(e) => setEditForm({ ...editForm, status: e.target.value as Client['status'] })}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'lead', label: 'Lead' },
            ]}
          />
          <Textarea
            label="Notes"
            value={editForm.notes}
            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
            rows={3}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Send Invite Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Send Portal Invitation"
        description="Send an invitation for the client to access their portal."
      >
        <div className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="client@example.com"
          />
          <p className="text-sm text-charcoal-500">
            An email will be sent with a link for the client to create their portal account
            and access their projects and deliverables.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendInvite}
              disabled={isInviting || !inviteEmail}
              leftIcon={isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            >
              {isInviting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
