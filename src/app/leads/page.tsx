'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Search,
  Filter,
  Mail,
  Phone,
  Building2,
  MessageSquare,
  Calendar,
  Loader2,
  Inbox,
  ArrowUpRight,
  Clock,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react'
import { DashboardLayout, Header } from '@/components/layout'
import { Card, Button, Input, Badge, Avatar, Modal, Textarea, Select } from '@/components/ui'
import { formatRelativeTime } from '@/lib/utils'
import Link from 'next/link'
import { useLeads } from '@/hooks/use-leads'
import type { Lead, LeadStatus, LeadPriority, LeadSource } from '@/types'

const statusColors: Record<LeadStatus, string> = {
  new: 'bg-blue-500/20 text-blue-400',
  contacted: 'bg-yellow-500/20 text-yellow-400',
  qualified: 'bg-purple-500/20 text-purple-400',
  proposal: 'bg-orange-500/20 text-orange-400',
  converted: 'bg-green-500/20 text-green-400',
  lost: 'bg-red-500/20 text-red-400',
}

const priorityColors: Record<LeadPriority, string> = {
  low: 'bg-charcoal-500/20 text-charcoal-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  high: 'bg-red-500/20 text-red-400',
}

const statusLabels: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal: 'Proposal',
  converted: 'Converted',
  lost: 'Lost',
}

const sourceOptions: { value: LeadSource; label: string }[] = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'social', label: 'Social Media' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
]

export default function LeadsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('')
  const [showFilters, setShowFilters] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    subject: '',
    message: '',
    source: 'website' as LeadSource,
  })

  // Edit/Delete lead state for card actions
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [showEditLeadModal, setShowEditLeadModal] = useState(false)
  const [showDeleteLeadModal, setShowDeleteLeadModal] = useState(false)
  const [editLeadLoading, setEditLeadLoading] = useState(false)
  const [deleteLeadLoading, setDeleteLeadLoading] = useState(false)
  const [editLeadForm, setEditLeadForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    subject: '',
    source: 'website' as LeadSource,
    message: '',
  })

  const { leads, isLoading, error, createLead, updateLead, deleteLead } = useLeads({
    status: statusFilter || undefined,
    search: searchQuery || undefined,
  })

  const filteredLeads = leads.filter(
    (lead) =>
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) return

    setIsCreating(true)
    const lead = await createLead({
      name: formData.name.trim(),
      email: formData.email.trim(),
      message: formData.message.trim(),
      phone: formData.phone.trim() || undefined,
      company: formData.company.trim() || undefined,
      subject: formData.subject.trim() || undefined,
      source: formData.source,
    })
    setIsCreating(false)

    if (lead) {
      setShowAddModal(false)
      setFormData({ name: '', email: '', phone: '', company: '', subject: '', message: '', source: 'website' })
      router.push(`/leads/${lead.id}`)
    }
  }

  const openEditLead = (lead: Lead) => {
    setEditingLead(lead)
    setEditLeadForm({
      name: lead.name,
      email: lead.email,
      phone: lead.phone || '',
      company: lead.company || '',
      subject: lead.subject || '',
      source: lead.source,
      message: lead.message,
    })
    setShowEditLeadModal(true)
  }

  const handleSaveEditLead = async () => {
    if (!editingLead || !editLeadForm.name.trim() || !editLeadForm.email.trim()) return
    setEditLeadLoading(true)
    try {
      await updateLead(editingLead.id, {
        name: editLeadForm.name,
        email: editLeadForm.email,
        phone: editLeadForm.phone || undefined,
        company: editLeadForm.company || undefined,
        subject: editLeadForm.subject || undefined,
        message: editLeadForm.message || undefined,
      })
      setShowEditLeadModal(false)
      setEditingLead(null)
    } catch (err) {
      console.error('Error saving lead:', err)
    } finally {
      setEditLeadLoading(false)
    }
  }

  const openDeleteLead = (lead: Lead) => {
    setEditingLead(lead)
    setShowDeleteLeadModal(true)
  }

  const handleDeleteLead = async () => {
    if (!editingLead) return
    setDeleteLeadLoading(true)
    try {
      await deleteLead(editingLead.id)
      setShowDeleteLeadModal(false)
      setEditingLead(null)
    } catch (err) {
      console.error('Error deleting lead:', err)
    } finally {
      setDeleteLeadLoading(false)
    }
  }

  // Stats
  const stats = {
    total: leads.length,
    new: leads.filter((l) => l.status === 'new').length,
    inProgress: leads.filter((l) => ['contacted', 'qualified', 'proposal'].includes(l.status)).length,
    converted: leads.filter((l) => l.status === 'converted').length,
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
            <p className="text-charcoal-500 text-sm">Loading leads...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <Header
        title="Leads"
        description="Manage incoming inquiries and convert them into clients."
        actions={
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setShowAddModal(true)}
          >
            Add New Lead
          </Button>
        }
      />

      <div className="p-8">
        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal-500" />
              <Input
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="secondary"
              leftIcon={<Filter className="w-4 h-4" />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filter
            </Button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <Card className="p-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={statusFilter === '' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setStatusFilter('')}
                >
                  All
                </Button>
                {(Object.keys(statusLabels) as LeadStatus[]).map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                  >
                    {statusLabels[status]}
                  </Button>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Leads', value: stats.total, icon: Inbox },
            { label: 'New', value: stats.new, icon: MessageSquare },
            { label: 'In Progress', value: stats.inProgress, icon: Clock },
            { label: 'Converted', value: stats.converted, icon: ArrowUpRight },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-charcoal-400 mb-1">{stat.label}</p>
                    <p className="text-2xl font-semibold text-white">{stat.value}</p>
                  </div>
                  <stat.icon className="w-8 h-8 text-charcoal-600" />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {filteredLeads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-xl bg-white/[0.04] flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8 text-charcoal-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No leads found</h3>
            <p className="text-charcoal-500 text-sm mb-6">
              {searchQuery || statusFilter
                ? 'Try adjusting your search or filters.'
                : 'Leads from your contact forms will appear here.'}
            </p>
          </div>
        )}

        {/* Leads List */}
        {filteredLeads.length > 0 && (
          <div className="space-y-4">
            {filteredLeads.map((lead, index) => (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Link href={`/leads/${lead.id}`}>
                  <Card variant="interactive" className="hover:border-white/20 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Avatar & Basic Info */}
                      <div className="flex items-center gap-4 flex-1">
                        <Avatar name={lead.name} size="lg" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-white truncate">{lead.name}</h3>
                            <Badge className={statusColors[lead.status]}>
                              {statusLabels[lead.status]}
                            </Badge>
                            <Badge className={priorityColors[lead.priority]}>
                              {lead.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-charcoal-400 truncate">
                            {lead.subject || lead.message.slice(0, 100)}
                          </p>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-charcoal-400">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <span className="truncate max-w-[180px]">{lead.email}</span>
                        </div>
                        {lead.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <span>{lead.phone}</span>
                          </div>
                        )}
                        {lead.company && (
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            <span>{lead.company}</span>
                          </div>
                        )}
                      </div>

                      {/* Time & Actions */}
                      <div className="flex items-center gap-2 text-sm text-charcoal-500 md:ml-4">
                        <Calendar className="w-4 h-4" />
                        <span>{formatRelativeTime(lead.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1 md:ml-2">
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditLead(lead) }}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                          title="Edit lead"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDeleteLead(lead) }}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors"
                          title="Delete lead"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add New Lead Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Lead"
        description="Manually enter a new lead's information."
        size="lg"
      >
        <form onSubmit={handleCreateLead} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Name *"
              placeholder="Full name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            <Input
              label="Email *"
              type="email"
              placeholder="email@example.com"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
            <Input
              label="Phone"
              placeholder="Phone number"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            />
            <Input
              label="Company"
              placeholder="Company name"
              value={formData.company}
              onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
            />
          </div>

          <Input
            label="Subject"
            placeholder="What are they interested in?"
            value={formData.subject}
            onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
          />

          <Select
            label="Source"
            options={sourceOptions}
            value={formData.source}
            onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value as LeadSource }))}
          />

          <Textarea
            label="Message *"
            placeholder="Describe the lead's inquiry or how they reached out..."
            value={formData.message}
            onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
            required
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isCreating || !formData.name.trim() || !formData.email.trim() || !formData.message.trim()}
              isLoading={isCreating}
            >
              Add Lead
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Lead Modal */}
      <Modal
        isOpen={showEditLeadModal}
        onClose={() => { setShowEditLeadModal(false); setEditingLead(null) }}
        title="Edit Lead"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Name"
              value={editLeadForm.name}
              onChange={(e) => setEditLeadForm({ ...editLeadForm, name: e.target.value })}
              placeholder="Full name"
            />
            <Input
              label="Email"
              type="email"
              value={editLeadForm.email}
              onChange={(e) => setEditLeadForm({ ...editLeadForm, email: e.target.value })}
              placeholder="email@example.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={editLeadForm.phone}
              onChange={(e) => setEditLeadForm({ ...editLeadForm, phone: e.target.value })}
              placeholder="Phone number"
            />
            <Input
              label="Company"
              value={editLeadForm.company}
              onChange={(e) => setEditLeadForm({ ...editLeadForm, company: e.target.value })}
              placeholder="Company name"
            />
          </div>
          <Input
            label="Subject"
            value={editLeadForm.subject}
            onChange={(e) => setEditLeadForm({ ...editLeadForm, subject: e.target.value })}
            placeholder="What are they interested in?"
          />
          <Select
            label="Source"
            value={editLeadForm.source}
            onChange={(e) => setEditLeadForm({ ...editLeadForm, source: e.target.value as LeadSource })}
            options={sourceOptions}
          />
          <Textarea
            label="Message"
            value={editLeadForm.message}
            onChange={(e) => setEditLeadForm({ ...editLeadForm, message: e.target.value })}
            placeholder="Lead's message"
            rows={4}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => { setShowEditLeadModal(false); setEditingLead(null) }}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEditLead}
              disabled={editLeadLoading || !editLeadForm.name.trim() || !editLeadForm.email.trim()}
              leftIcon={editLeadLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Lead Confirmation Modal */}
      <Modal
        isOpen={showDeleteLeadModal}
        onClose={() => { setShowDeleteLeadModal(false); setEditingLead(null) }}
        title="Delete Lead"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-white/60">
            Are you sure you want to delete <span className="text-white font-medium">{editingLead?.name}</span>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => { setShowDeleteLeadModal(false); setEditingLead(null) }}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteLead}
              disabled={deleteLeadLoading}
              leftIcon={deleteLeadLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            >
              Delete Lead
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
