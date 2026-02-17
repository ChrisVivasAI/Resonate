'use client'

import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { DollarSign, FolderKanban, Loader2, CircleDollarSign, Check, ArrowLeft, Clock } from 'lucide-react'
import { DashboardLayout, Header } from '@/components/layout'
import { Card, Badge, Avatar } from '@/components/ui'
import { useTeamMember } from '@/hooks'
import Link from 'next/link'
import { useState } from 'react'

export default function TeamMemberPage() {
  const params = useParams()
  const memberId = params.id as string
  const { data, loading, error, refetch } = useTeamMember(memberId)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

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
                <p className="text-2xl font-semibold text-white">${totals.totalEarned.toFixed(2)}</p>
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
                <p className="text-2xl font-semibold text-amber-400">${totals.totalOwed.toFixed(2)}</p>
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
                <p className="text-2xl font-semibold text-emerald-400">${totals.totalPaid.toFixed(2)}</p>
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

      {/* Labor Entries Table */}
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
                      ${Number(entry.hourly_rate).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-300 text-right">
                      {Number(entry.actual_hours).toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-sm text-white text-right font-medium">
                      ${Number(entry.actual_cost).toFixed(2)}
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
    </DashboardLayout>
  )
}
