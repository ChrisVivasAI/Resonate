'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Calendar,
  Loader2,
  Sparkles,
  MessageSquare,
  PhoneCall,
  Video,
  FileText,
  Send,
  Tag,
  User,
  ChevronDown,
} from 'lucide-react'
import { DashboardLayout, Header } from '@/components/layout'
import { Card, Button, Badge, Avatar, Input } from '@/components/ui'
import { formatDate, formatRelativeTime, getStatusColor, getPriorityColor } from '@/lib/utils'
import Link from 'next/link'
import { useLead } from '@/hooks/use-leads'
import { LeadChat } from '@/components/chat/lead-chat'
import type { LeadStatus, LeadPriority, LeadActivityType } from '@/types'

const statusOptions: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
]

const priorityOptions: { value: LeadPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const activityIcons: Record<LeadActivityType, typeof MessageSquare> = {
  note: FileText,
  email: Mail,
  call: PhoneCall,
  meeting: Video,
  ai_assist: Sparkles,
  status_change: Tag,
}

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const leadId = params.id as string

  const { lead, activities, isLoading, error, updateLead, addActivity, refetch } = useLead(leadId)

  const [isUpdating, setIsUpdating] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false)

  // Activity form state
  const [activityType, setActivityType] = useState<LeadActivityType>('note')
  const [activityContent, setActivityContent] = useState('')
  const [isAddingActivity, setIsAddingActivity] = useState(false)

  const handleStatusChange = async (status: LeadStatus) => {
    setIsUpdating(true)
    await updateLead({ status })
    setShowStatusDropdown(false)
    setIsUpdating(false)
  }

  const handlePriorityChange = async (priority: LeadPriority) => {
    setIsUpdating(true)
    await updateLead({ priority })
    setShowPriorityDropdown(false)
    setIsUpdating(false)
  }

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activityContent.trim()) return

    setIsAddingActivity(true)
    await addActivity(activityType, activityContent)
    setActivityContent('')
    setActivityType('note')
    setIsAddingActivity(false)
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
            <p className="text-charcoal-500 text-sm">Loading lead...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !lead) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <p className="text-red-400 mb-4">{error || 'Lead not found'}</p>
          <Button variant="secondary" onClick={() => router.push('/leads')}>
            Back to Leads
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <Header
        title={lead.name}
        description={lead.company || lead.email}
        actions={
          <div className="flex items-center gap-3">
            <Link href="/leads">
              <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
            </Link>
          </div>
        }
      />

      <div className="p-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Lead Info Card */}
            <Card>
              <div className="flex flex-col md:flex-row md:items-start gap-6">
                <Avatar name={lead.name} size="xl" />
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-white mb-2">{lead.name}</h2>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-3 text-charcoal-300">
                      <Mail className="w-4 h-4 text-charcoal-500" />
                      <a href={`mailto:${lead.email}`} className="hover:text-white">
                        {lead.email}
                      </a>
                    </div>
                    {lead.phone && (
                      <div className="flex items-center gap-3 text-charcoal-300">
                        <Phone className="w-4 h-4 text-charcoal-500" />
                        <span>{lead.phone}</span>
                      </div>
                    )}
                    {lead.company && (
                      <div className="flex items-center gap-3 text-charcoal-300">
                        <Building2 className="w-4 h-4 text-charcoal-500" />
                        <span>{lead.company}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-charcoal-300">
                      <Calendar className="w-4 h-4 text-charcoal-500" />
                      <span>{formatDate(lead.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Status Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                        className="flex items-center gap-2"
                        disabled={isUpdating}
                      >
                        <Badge className={getStatusColor(lead.status)}>
                          {lead.status}
                        </Badge>
                        <ChevronDown className="w-3 h-3 text-charcoal-500" />
                      </button>
                      <AnimatePresence>
                        {showStatusDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 mt-2 bg-charcoal-900 border border-white/10 rounded-lg shadow-xl z-10 min-w-[150px]"
                          >
                            {statusOptions.map((option) => (
                              <button
                                key={option.value}
                                onClick={() => handleStatusChange(option.value)}
                                className="w-full px-4 py-2 text-left text-sm text-charcoal-300 hover:bg-white/5 first:rounded-t-lg last:rounded-b-lg"
                              >
                                {option.label}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Priority Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                        className="flex items-center gap-2"
                        disabled={isUpdating}
                      >
                        <Badge className={getPriorityColor(lead.priority)}>
                          {lead.priority}
                        </Badge>
                        <ChevronDown className="w-3 h-3 text-charcoal-500" />
                      </button>
                      <AnimatePresence>
                        {showPriorityDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 mt-2 bg-charcoal-900 border border-white/10 rounded-lg shadow-xl z-10 min-w-[120px]"
                          >
                            {priorityOptions.map((option) => (
                              <button
                                key={option.value}
                                onClick={() => handlePriorityChange(option.value)}
                                className="w-full px-4 py-2 text-left text-sm text-charcoal-300 hover:bg-white/5 first:rounded-t-lg last:rounded-b-lg"
                              >
                                {option.label}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <Badge className="bg-charcoal-700/50 text-charcoal-300">
                      {lead.source}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>

            {/* Original Message */}
            <Card>
              <h3 className="text-lg font-semibold text-white mb-4">Original Message</h3>
              {lead.subject && (
                <p className="text-charcoal-400 text-sm mb-2">
                  <span className="font-medium">Subject:</span> {lead.subject}
                </p>
              )}
              <p className="text-charcoal-300 whitespace-pre-wrap">{lead.message}</p>
            </Card>

            {/* Activity Timeline */}
            <Card>
              <h3 className="text-lg font-semibold text-white mb-6">Activity Timeline</h3>

              {/* Add Activity Form */}
              <form onSubmit={handleAddActivity} className="mb-6 pb-6 border-b border-white/10">
                <div className="flex gap-3 mb-3">
                  {(['note', 'email', 'call', 'meeting'] as const).map((type) => {
                    const Icon = activityIcons[type]
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setActivityType(type)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          activityType === type
                            ? 'bg-white/10 text-white'
                            : 'text-charcoal-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    )
                  })}
                </div>
                <div className="flex gap-3">
                  <Input
                    placeholder={`Add a ${activityType}...`}
                    value={activityContent}
                    onChange={(e) => setActivityContent(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={isAddingActivity || !activityContent.trim()}>
                    {isAddingActivity ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </form>

              {/* Activities List */}
              <div className="space-y-4">
                {activities.length === 0 ? (
                  <p className="text-charcoal-500 text-center py-8">No activities yet</p>
                ) : (
                  activities.map((activity, index) => {
                    const Icon = activityIcons[activity.type as LeadActivityType] || MessageSquare
                    return (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex gap-4"
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-charcoal-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-white capitalize">
                              {activity.type.replace('_', ' ')}
                            </span>
                            {activity.user && (
                              <span className="text-xs text-charcoal-500">
                                by {activity.user.full_name}
                              </span>
                            )}
                            <span className="text-xs text-charcoal-600">
                              {formatRelativeTime(activity.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-charcoal-300 whitespace-pre-wrap">
                            {activity.content}
                          </p>
                        </div>
                      </motion.div>
                    )
                  })
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <Card>
              <h3 className="text-lg font-semibold text-white mb-4">Quick Info</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-charcoal-400 text-sm">Created</span>
                  <span className="text-white text-sm">{formatDate(lead.created_at)}</span>
                </div>
                {lead.last_contacted_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-charcoal-400 text-sm">Last Contact</span>
                    <span className="text-white text-sm">{formatDate(lead.last_contacted_at)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-charcoal-400 text-sm">Source</span>
                  <span className="text-white text-sm capitalize">{lead.source}</span>
                </div>
                {lead.source_page && (
                  <div className="flex items-center justify-between">
                    <span className="text-charcoal-400 text-sm">Source Page</span>
                    <span className="text-white text-sm">{lead.source_page}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Notes */}
            <Card>
              <h3 className="text-lg font-semibold text-white mb-4">Notes</h3>
              {lead.notes ? (
                <p className="text-charcoal-300 text-sm whitespace-pre-wrap">{lead.notes}</p>
              ) : (
                <p className="text-charcoal-500 text-sm">No notes added yet.</p>
              )}
            </Card>

            {/* Tags */}
            {lead.tags && lead.tags.length > 0 && (
              <Card>
                <h3 className="text-lg font-semibold text-white mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {lead.tags.map((tag) => (
                    <Badge key={tag} className="bg-charcoal-700/50 text-charcoal-300">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  leftIcon={<Mail className="w-4 h-4" />}
                  onClick={() => window.open(`mailto:${lead.email}`, '_blank')}
                >
                  Send Email
                </Button>
                {lead.phone && (
                  <Button
                    variant="secondary"
                    className="w-full justify-start"
                    leftIcon={<Phone className="w-4 h-4" />}
                    onClick={() => window.open(`tel:${lead.phone}`, '_blank')}
                  >
                    Call
                  </Button>
                )}
                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  leftIcon={<User className="w-4 h-4" />}
                  onClick={() => {
                    // Convert to client logic would go here
                  }}
                >
                  Convert to Client
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Floating AI Chat Assistant */}
      <LeadChat
        leadId={leadId}
        leadName={lead.name}
        onActionConfirmed={refetch}
      />
    </DashboardLayout>
  )
}
