'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { format, formatDistanceToNow } from 'date-fns'
import {
  ArrowLeft,
  Calendar,
  Package,
  CheckCircle2,
  Clock,
  Loader2,
  FolderKanban,
} from 'lucide-react'
import { Header } from '@/components/layout'
import { Card, Badge, Progress, Button } from '@/components/ui'
import { DeliverableCard } from '@/components/deliverables'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Project, Deliverable } from '@/types'
import { getStatusColor } from '@/lib/utils'

export default function ClientProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const [projectId, setProjectId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<Project | null>(null)
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])

  useEffect(() => {
    params.then(({ id }) => setProjectId(id))
  }, [params])

  useEffect(() => {
    if (!projectId) return

    async function fetchData() {
      const supabase = createClient()

      // Fetch project
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (projectData) setProject(projectData)

      // Fetch deliverables (only visible ones for client)
      const { data: deliverablesData } = await supabase
        .from('deliverables')
        .select('*, creator:profiles!created_by(*)')
        .eq('project_id', projectId)
        .in('status', ['in_review', 'approved', 'rejected', 'final'])
        .order('updated_at', { ascending: false })

      if (deliverablesData) setDeliverables(deliverablesData)

      setLoading(false)
    }

    fetchData()
  }, [projectId])

  if (loading || !project) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#23FD9E] animate-spin" />
          <p className="text-white/40 text-sm">Loading project...</p>
        </div>
      </div>
    )
  }

  const pendingCount = deliverables.filter(d => d.status === 'in_review').length
  const approvedCount = deliverables.filter(d => d.status === 'approved' || d.status === 'final').length

  return (
    <>
      <Header
        title={project.name}
        description={project.description || 'Project details and deliverables'}
        actions={
          <Link href="/portal/projects">
            <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Projects
            </Button>
          </Link>
        }
      />

      <div className="p-8">
        {/* Project Info */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 text-white/40" />
                </div>
                <p className="text-sm text-white/40">Status</p>
              </div>
              <Badge className={getStatusColor(project.status)}>
                {project.status.replace('_', ' ')}
              </Badge>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white/40" />
                </div>
                <p className="text-sm text-white/40">Due Date</p>
              </div>
              <p className="text-white font-medium">
                {project.due_date
                  ? format(new Date(project.due_date), 'MMM d, yyyy')
                  : 'Not set'}
              </p>
              {project.due_date && (
                <p className="text-xs text-white/40 mt-1">
                  {formatDistanceToNow(new Date(project.due_date), { addSuffix: true })}
                </p>
              )}
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-amber-400" />
                </div>
                <p className="text-sm text-white/40">Pending Review</p>
              </div>
              <p className="text-2xl font-semibold text-white">{pendingCount}</p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#23FD9E]/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-[#23FD9E]" />
                </div>
                <p className="text-sm text-white/40">Approved</p>
              </div>
              <p className="text-2xl font-semibold text-white">{approvedCount}</p>
            </Card>
          </motion.div>
        </div>

        {/* Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-white">Project Progress</h3>
              <span className="text-2xl font-semibold text-[#23FD9E]">{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-2" />
          </Card>
        </motion.div>

        {/* Deliverables */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Deliverables</h2>
            <span className="text-sm text-white/40">{deliverables.length} items</span>
          </div>

          {deliverables.length === 0 ? (
            <Card className="p-8 text-center">
              <Package className="w-8 h-8 text-white/20 mx-auto mb-2" />
              <p className="text-white/40">No deliverables available yet</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {deliverables.map((deliverable, index) => (
                <DeliverableCard
                  key={deliverable.id}
                  deliverable={deliverable}
                  index={index}
                  onClick={() =>
                    router.push(`/portal/projects/${projectId}/deliverables?id=${deliverable.id}`)
                  }
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </>
  )
}
