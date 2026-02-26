'use client'

import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { DollarSign, FolderKanban, Loader2, CircleDollarSign, Check, ArrowLeft, Clock, ListTodo, Briefcase } from 'lucide-react'
import { DashboardLayout, Header } from '@/components/layout'
import { Card, Badge, Avatar, Button } from '@/components/ui'
import { useTeamMember } from '@/hooks'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { useState } from 'react'

export default function TeamMemberPage() {
  const params = useParams()
  const memberId = params.id as string
  const { data, loading, error, refetch } = useTeamMember(memberId)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'labor' | 'tasks'>('labor')

  const handleMarkPaid = async (entryId: string) => {
    setUpdatingId(entryId)
    try {
      const response = await fetch(`/api/labor/${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_status: 'paid',
          payment_date: new Date().toISOString().split('T')[0],
        }),
      })
      if (response.ok) await refetch()
    } finally {
      setUpdatingId(null)
    }
  }

  const handleMarkOwed = async (entryId: string) => {
    if (!confirm('Mark this entry as unpaid?')) return
    setUpdatingId(entryId)
    try {
      const response = await fetch(`/api/labor/${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_status: 'owed',
          payment_date: null,
          payment_method: null,
        }),
      })
      if (response.ok) await refetch()
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-obsidian-400" />
        </div>
      </DashboardLayout>
    )
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <div className="text-center py-24 text-red-400">{error || 'Member not found'}</div>
      </DashboardLayout>
    )
  }

  const { profile, laborEntries, totals } = data

  const BILLING_TYPE_SUFFIXES: Record<string, string> = {
    hourly: '/hr',
    per_item: '/item',
    per_asset: '/asset',
    per_service: '/service',
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <Link href="/team" className="inline-flex items-center gap-1 text-sm text-obsidian-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Team
        </Link>
      </div>

      {/* Profile Header */}
      <div className="flex items-center gap-4 mb-8">
        <Avatar name={profile.full_name} size="lg" />
        <div>
          <h1 className="text-2xl font-semibold text-white">{profile.full_name}</h1>
          <p className="text-sm text-obsidian-400">{profile.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10">
                <DollarSign className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-obsidian-400">Total Earned</p>
                <p className="text-2xl font-semibold text-white">{formatCurrency(totals.totalEarned)}</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10">
                <CircleDollarSign className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-obsidian-400">Total Owed</p>
                <p className="text-2xl font-semibold text-amber-400">{formatCurrency(totals.totalOwed)}</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10">
                <Check className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-obsidian-400">Total Paid</p>
                <p className="text-2xl font-semibold text-emerald-400">{formatCurrency(totals.totalPaid)}</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10">
                <FolderKanban className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-obsidian-400">Active Projects</p>
                <p className="text-2xl font-semibold text-white">{totals.activeProjects}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Tab Buttons */}
      <div className="flex items-center gap-1 mb-4">
        <button
          onClick={() => setActiveTab('labor')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'labor'
              ? 'bg-white/10 text-white'
              : 'text-obsidian-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Labor Entries
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'tasks'
              ? 'bg-white/10 text-white'
              : 'text-obsidian-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ListTodo className="w-4 h-4" />
          Assigned Tasks
        </button>
      </div>

      {activeTab === 'labor' && (
        <Card>
          <div className="p-4 border-b border-obsidian-800">
            <h2 className="text-lg font-semibold text-white">Labor Entries</h2>
            <p className="text-sm text-obsidian-400">{totals.entryCount} entries across all projects</p>
          </div>

          {laborEntries.length === 0 ? (
            <div className="text-center py-12 text-obsidian-400">No labor entries found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-obsidian-800">
                    <th className="text-left py-3 px-4 text-sm font-medium text-obsidian-400">Project</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-obsidian-400">Role</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-obsidian-400">Rate</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-obsidian-400">Qty</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-obsidian-400">Cost</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-obsidian-400">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {laborEntries.map((entry) => (
                    <tr key={entry.id} className="border-b border-obsidian-800/50 hover:bg-obsidian-800/30">
                      <td className="py-3 px-4 text-sm text-white">
                        {entry.project?.name || 'Unknown Project'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="default">{entry.role}</Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-300 text-right">
                        {formatCurrency(Number(entry.hourly_rate))}{BILLING_TYPE_SUFFIXES[entry.billing_type || 'hourly'] || '/hr'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-300 text-right">
                        {Number(entry.actual_hours).toFixed(1)}
                      </td>
                      <td className="py-3 px-4 text-sm text-white text-right font-medium">
                        {formatCurrency(Number(entry.actual_cost))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {Number(entry.actual_cost) > 0 ? (
                          updatingId === entry.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-obsidian-400 mx-auto" />
                          ) : entry.payment_status === 'paid' ? (
                            <button
                              onClick={() => handleMarkOwed(entry.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors cursor-pointer"
                              title="Click to mark as owed"
                            >
                              <Check className="w-3 h-3" />
                              Paid
                            </button>
                          ) : (
                            <button
                              onClick={() => handleMarkPaid(entry.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors cursor-pointer"
                            >
                              <CircleDollarSign className="w-3 h-3" />
                              Mark Paid
                            </button>
                          )
                        ) : (
                          <span className="text-obsidian-500">&mdash;</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'tasks' && (
        <Card>
          <div className="p-4 border-b border-obsidian-800">
            <h2 className="text-lg font-semibold text-white">Assigned Tasks</h2>
            <p className="text-sm text-obsidian-400">Tasks assigned to {profile.full_name}</p>
          </div>

          {!data.assignedTasks || data.assignedTasks.length === 0 ? (
            <div className="text-center py-12 text-obsidian-400">
              <ListTodo className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No tasks assigned</p>
            </div>
          ) : (
            <div className="divide-y divide-obsidian-800/50">
              {data.assignedTasks.map((task) => (
                <div key={task.id} className="px-4 py-3 hover:bg-obsidian-800/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        task.status === 'completed' ? 'bg-emerald-400' :
                        task.status === 'in_progress' ? 'bg-blue-400' :
                        task.status === 'review' ? 'bg-amber-400' :
                        'bg-white/20'
                      }`} />
                      <div>
                        <p className={`text-sm font-medium ${
                          task.status === 'completed' ? 'text-white/40 line-through' : 'text-white'
                        }`}>
                          {task.title}
                        </p>
                        {task.project && (
                          <Link
                            href={`/projects/${task.project_id}`}
                            className="text-xs text-obsidian-400 hover:text-[#23FD9E] transition-colors"
                          >
                            {task.project.name}
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className={
                        task.priority === 'high' ? 'bg-red-500/10 text-red-400' :
                        task.priority === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-white/5 text-white/50'
                      }>
                        {task.priority}
                      </Badge>
                      <Badge variant="default" className={
                        task.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                        task.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400' :
                        task.status === 'review' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-white/5 text-white/50'
                      }>
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </DashboardLayout>
  )
}
