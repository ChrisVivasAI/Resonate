'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import {
  CheckSquare,
  Loader2,
  Package,
} from 'lucide-react'
import { Header } from '@/components/layout'
import { Card } from '@/components/ui'
import { DeliverableCard, StatusBadge } from '@/components/deliverables'
import { createClient } from '@/lib/supabase/client'
import type { Deliverable } from '@/types'

export default function ClientApprovalsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [pendingApprovals, setPendingApprovals] = useState<Deliverable[]>([])
  const [recentActions, setRecentActions] = useState<Deliverable[]>([])

  useEffect(() => {
    async function fetchApprovals() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get the client record
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('profile_id', user.id)
        .single()

      if (!client) {
        setLoading(false)
        return
      }

      // Get projects for this client
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('client_id', client.id)

      if (!projects || projects.length === 0) {
        setLoading(false)
        return
      }

      const projectIds = projects.map(p => p.id)

      // Fetch pending approvals
      const { data: pending } = await supabase
        .from('deliverables')
        .select('*, project:projects(*), creator:profiles!created_by(*)')
        .eq('status', 'in_review')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })

      if (pending) setPendingApprovals(pending)

      // Fetch recently approved/rejected
      const { data: recent } = await supabase
        .from('deliverables')
        .select('*, project:projects(*), creator:profiles!created_by(*)')
        .in('status', ['approved', 'rejected'])
        .in('project_id', projectIds)
        .order('updated_at', { ascending: false })
        .limit(10)

      if (recent) setRecentActions(recent)

      setLoading(false)
    }

    fetchApprovals()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#23FD9E] animate-spin" />
          <p className="text-white/40 text-sm">Loading approvals...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Header
        title="Approvals"
        description="Review and approve deliverables from your projects."
      />

      <div className="p-8">
        {/* Pending Approvals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Pending Review</h2>
              <p className="text-sm text-white/40">{pendingApprovals.length} items awaiting your approval</p>
            </div>
          </div>

          {pendingApprovals.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckSquare className="w-8 h-8 text-white/20 mx-auto mb-2" />
              <p className="text-white/40">No pending approvals</p>
              <p className="text-sm text-white/30 mt-1">You're all caught up!</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {pendingApprovals.map((deliverable, index) => (
                <DeliverableCard
                  key={deliverable.id}
                  deliverable={deliverable}
                  index={index}
                  onClick={() =>
                    router.push(`/portal/projects/${deliverable.project_id}/deliverables?id=${deliverable.id}`)
                  }
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent Activity */}
        {recentActions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-lg font-semibold text-white mb-6">Recently Reviewed</h2>

            <Card>
              <div className="divide-y divide-white/[0.04]">
                {recentActions.map((deliverable) => (
                  <div
                    key={deliverable.id}
                    onClick={() =>
                      router.push(`/portal/projects/${deliverable.project_id}/deliverables?id=${deliverable.id}`)
                    }
                    className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center">
                        <Package className="w-6 h-6 text-white/30" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{deliverable.title}</p>
                        <p className="text-sm text-white/40">
                          {deliverable.project?.name} &bull;{' '}
                          {formatDistanceToNow(new Date(deliverable.updated_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={deliverable.status} />
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </>
  )
}
