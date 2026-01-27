'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Plus,
  Search,
  Filter,
  Mail,
  Phone,
  Building2,
  MoreHorizontal,
  ExternalLink,
  Loader2,
  Users,
} from 'lucide-react'
import { DashboardLayout, Header } from '@/components/layout'
import { Card, Button, Input, Badge, Avatar, Modal } from '@/components/ui'
import { formatCurrency, getStatusColor } from '@/lib/utils'
import Link from 'next/link'
import { useClients } from '@/hooks'

export default function ClientsPage() {
  const { clients, loading, error, addClient } = useClients()
  const [searchQuery, setSearchQuery] = useState('')
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
  })

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await addClient({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        company: formData.company || null,
        avatar_url: null,
        status: 'lead',
        stripe_customer_id: null,
        notes: null,
      })
      setIsNewClientModalOpen(false)
      setFormData({ name: '', email: '', phone: '', company: '' })
    } catch (err) {
      console.error('Error adding client:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-resonate-400 animate-spin" />
            <p className="text-charcoal-500 text-sm">Loading clients...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <Header
        title="Clients"
        description="Manage your client relationships and contact information."
        actions={
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsNewClientModalOpen(true)}>
            Add Client
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
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="secondary" leftIcon={<Filter className="w-4 h-4" />}>
              Filter
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Clients', value: clients.length },
            { label: 'Active Clients', value: clients.filter((c) => c.status === 'active').length },
            { label: 'New Leads', value: clients.filter((c) => c.status === 'lead').length },
            { label: 'Total Revenue', value: formatCurrency(clients.reduce((acc, c) => acc + (c.totalSpent || 0), 0)) },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card>
                <p className="text-sm text-charcoal-400 mb-1">{stat.label}</p>
                <p className="text-2xl font-semibold text-white">{stat.value}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {filteredClients.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-xl bg-white/[0.04] flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-charcoal-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No clients found</h3>
            <p className="text-charcoal-500 text-sm mb-6">
              {searchQuery ? 'Try adjusting your search terms.' : 'Get started by adding your first client.'}
            </p>
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsNewClientModalOpen(true)}>
              Add Client
            </Button>
          </div>
        )}

        {/* Clients Grid */}
        {filteredClients.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client, index) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Card variant="interactive">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <Avatar name={client.name} size="lg" />
                      <div>
                        <h3 className="font-semibold text-white">{client.name}</h3>
                        <p className="text-sm text-charcoal-400">{client.company || 'No company'}</p>
                      </div>
                    </div>
                    <button className="p-2 rounded-lg hover:bg-white/[0.04] transition-colors">
                      <MoreHorizontal className="w-4 h-4 text-charcoal-500" />
                    </button>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="w-4 h-4 text-charcoal-500" />
                      <a href={`mailto:${client.email}`} className="text-charcoal-300 hover:text-resonate-400">
                        {client.email}
                      </a>
                    </div>
                    {client.phone && (
                      <div className="flex items-center gap-3 text-sm">
                        <Phone className="w-4 h-4 text-charcoal-500" />
                        <span className="text-charcoal-300">{client.phone}</span>
                      </div>
                    )}
                    {client.company && (
                      <div className="flex items-center gap-3 text-sm">
                        <Building2 className="w-4 h-4 text-charcoal-500" />
                        <span className="text-charcoal-300">{client.company}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                    <div>
                      <p className="text-xs text-charcoal-500">Total Spent</p>
                      <p className="font-semibold text-white">{formatCurrency(client.totalSpent || 0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-charcoal-500">Projects</p>
                      <p className="font-semibold text-white">{client.projectsCount || 0}</p>
                    </div>
                    <Badge className={getStatusColor(client.status)}>{client.status}</Badge>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Link href={`/clients/${client.id}`} className="flex-1">
                      <Button variant="secondary" size="sm" className="w-full">
                        View Details
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* New Client Modal */}
      <Modal
        isOpen={isNewClientModalOpen}
        onClose={() => setIsNewClientModalOpen(false)}
        title="Add New Client"
        description="Enter the client's information to add them to your database."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="John Doe"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            placeholder="john@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <Input
            label="Phone"
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <Input
            label="Company"
            placeholder="Acme Inc."
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsNewClientModalOpen(false)} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Client'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
