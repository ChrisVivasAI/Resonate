'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import {
  FolderKanban,
  CheckSquare,
  Clock,
  ArrowRight,
  Loader2,
  Package,
} from 'lucide-react'
import { Header } from '@/components/layout'
import { Card } from '@/components/ui'
import { StatusBadge } from '@/components/deliverables'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Project, Deliverable } from '@/types'

export default function ClientPortalPage() {
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<Deliverable[]>([])
  const [recentDeliverables, setRecentDeliverables] = useState<Deliverable[]>([])
  const [clientName, setClientName] = useState('')

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      // Get current user and their client_id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, client_id')
        .eq('id', user.id)
        .single()

      if (profile) {
        setClientName(profile.full_name || 'Client')

        if (profile.client_id) {
          // Get client record to find their projects
          const { data: client } = await supabase
            .from('clients')
            .select('id')
            .eq('profile_id', user.id)
            .single()

          if (client) {
            // Fetch projects for this client
            const { data: projectsData } = await supabase
              .from('projects')
              .select('*')
              .eq('client_id', client.id)
              .order('updated_at', { ascending: false })
              .limit(5)

            if (projectsData) setProjects(projectsData)

            // Fetch deliverables pending approval
            const { data: pendingData } = await supabase
              .from('deliverables')
              .select('*, project:projects(*)')
              .eq('status', 'in_review')
              .in('project_id', projectsData?.map(p => p.id) || [])
              .order('created_at', { ascending: false })
              .limit(5)

            if (pendingData) setPendingApprovals(pendingData)

            // Fetch recent deliverables
            const { data: recentData } = await supabase
              .from('deliverables')
              .select('*, project:projects(*)')
              .in('status', ['in_review', 'approved', 'final'])
              .in('project_id', projectsData?.map(p => p.id) || [])
              .order('updated_at', { ascending: false })
              .limit(10)

            if (recentData) setRecentDeliverables(recentData)
          }
        }
      }

      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#23FD9E] animate-spin" />
          <p className="text-white/40 text-sm">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Header
        title={`Welcome back, ${clientName.split(' ')[0]}`}
        description="View your projects and pending approvals."
      />

      <div className="p-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#23FD9E]/10 flex items-center justify-center">
                  <FolderKanban className="w-6 h-6 text-[#23FD9E]" />
                </div>
                <div>
                  <p className="text-sm text-white/40">Active Projects</p>
                  <p className="text-2xl font-semibold text-white">
                    {projects.filter(p => p.status !== 'completed').length}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <CheckSquare className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-white/40">Pending Approvals</p>
                  <p className="text-2xl font-semibold text-white">{pendingApprovals.length}</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Package className="w-6 h-6 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm text-white/40">Total Deliverables</p>
                  <p className="text-2xl font-semibold text-white">{recentDeliverables.length}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pending Approvals */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card>
              <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-amber-400" />
                  <h3 className="font-medium text-white">Pending Approvals</h3>
                </div>
                <Link
                  href="/portal/approvals"
                  className="text-sm text-[#23FD9E] hover:text-[#23FD9E]/80 flex items-center gap-1"
                >
                  View all <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {pendingApprovals.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckSquare className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-white/40 text-sm">No pending approvals</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {pendingApprovals.map((deliverable) => (
                    <Link
                      key={deliverable.id}
                      href={`/portal/projects/${deliverable.project_id}/deliverables?id=${deliverable.id}`}
                      className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                    >
                      <div>
                        <p className="font-medium text-white mb-1">{deliverable.title}</p>
                        <p className="text-xs text-white/40">
                          {deliverable.project?.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={deliverable.status} size="sm" />
                        <ArrowRight className="w-4 h-4 text-white/30" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-white/40" />
                  <h3 className="font-medium text-white">Recent Deliverables</h3>
                </div>
              </div>

              {recentDeliverables.length === 0 ? (
                <div className="p-8 text-center">
                  <Package className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-white/40 text-sm">No deliverables yet</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {recentDeliverables.slice(0, 5).map((deliverable) => (
                    <Link
                      key={deliverable.id}
                      href={`/portal/projects/${deliverable.project_id}/deliverables?id=${deliverable.id}`}
                      className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                    >
                      <div>
                        <p className="font-medium text-white mb-1">{deliverable.title}</p>
                        <p className="text-xs text-white/40">
                          {formatDistanceToNow(new Date(deliverable.updated_at), { addSuffix: true })}
                        </p>
                      </div>
                      <StatusBadge status={deliverable.status} size="sm" />
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        </div>

        {/* Projects */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-8"
        >
          <Card>
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-[#23FD9E]" />
                <h3 className="font-medium text-white">Your Projects</h3>
              </div>
              <Link
                href="/portal/projects"
                className="text-sm text-[#23FD9E] hover:text-[#23FD9E]/80 flex items-center gap-1"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {projects.length === 0 ? (
              <div className="p-8 text-center">
                <FolderKanban className="w-8 h-8 text-white/20 mx-auto mb-2" />
                <p className="text-white/40 text-sm">No projects yet</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/portal/projects/${project.id}`}
                    className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div>
                      <p className="font-medium text-white mb-1">{project.name}</p>
                      <p className="text-xs text-white/40">
                        {project.description?.slice(0, 60) || 'No description'}
                        {project.description && project.description.length > 60 ? '...' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-white">{project.progress}%</p>
                        <p className="text-xs text-white/40">Progress</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-white/30" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </>
  )
}
