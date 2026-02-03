'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  X,
  Loader2,
  Package,
} from 'lucide-react'
import { Header } from '@/components/layout'
import { Button } from '@/components/ui'
import { DeliverableCard, DeliverableDetail } from '@/components/deliverables'
import { createClient } from '@/lib/supabase/client'
import type { Deliverable, DeliverableVersion } from '@/types'
import Link from 'next/link'

export default function ClientDeliverablesPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedId = searchParams.get('id')

  const [projectId, setProjectId] = useState<string>(params.id)
  const [loading, setLoading] = useState(true)
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null)
  const [versions, setVersions] = useState<DeliverableVersion[]>([])
  const [projectName, setProjectName] = useState('')

  const fetchDeliverables = useCallback(async () => {
    if (!projectId) return

    const supabase = createClient()

    // Fetch project name
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single()

    if (project) setProjectName(project.name)

    // Fetch deliverables (only visible ones for client)
    const { data: deliverablesData } = await supabase
      .from('deliverables')
      .select('*, project:projects(*), creator:profiles!created_by(*)')
      .eq('project_id', projectId)
      .in('status', ['in_review', 'approved', 'rejected', 'final'])
      .order('updated_at', { ascending: false })

    if (deliverablesData) setDeliverables(deliverablesData)

    setLoading(false)
  }, [projectId])

  useEffect(() => {
    fetchDeliverables()
  }, [fetchDeliverables])

  // Fetch selected deliverable details
  useEffect(() => {
    if (!selectedId) {
      setSelectedDeliverable(null)
      setVersions([])
      return
    }

    async function fetchDeliverable() {
      const supabase = createClient()

      const { data: deliverable } = await supabase
        .from('deliverables')
        .select(`
          *,
          project:projects(*),
          creator:profiles!created_by(*),
          comments(*, user:profiles(*))
        `)
        .eq('id', selectedId)
        .single()

      if (deliverable) {
        // Filter out internal comments
        if (deliverable.comments) {
          deliverable.comments = deliverable.comments.filter((c: { is_internal: boolean }) => !c.is_internal)
        }
        setSelectedDeliverable(deliverable)
      }

      // Fetch versions
      const { data: versionsData } = await supabase
        .from('deliverable_versions')
        .select('*, creator:profiles!created_by(*)')
        .eq('deliverable_id', selectedId)
        .order('version_number', { ascending: false })

      if (versionsData) setVersions(versionsData)
    }

    fetchDeliverable()
  }, [selectedId])

  const handleApprove = async (feedback?: string) => {
    if (!selectedId) return

    const response = await fetch(`/api/deliverables/${selectedId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback }),
    })

    if (response.ok) {
      await fetchDeliverables()
      // Refresh selected deliverable
      const supabase = createClient()
      const { data } = await supabase
        .from('deliverables')
        .select('*, project:projects(*), creator:profiles!created_by(*)')
        .eq('id', selectedId)
        .single()
      if (data) setSelectedDeliverable(data)
    }
  }

  const handleReject = async (feedback: string, requestChanges?: boolean) => {
    if (!selectedId) return

    const response = await fetch(`/api/deliverables/${selectedId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback, requestChanges }),
    })

    if (response.ok) {
      await fetchDeliverables()
      // Refresh selected deliverable
      const supabase = createClient()
      const { data } = await supabase
        .from('deliverables')
        .select('*, project:projects(*), creator:profiles!created_by(*)')
        .eq('id', selectedId)
        .single()
      if (data) setSelectedDeliverable(data)
    }
  }

  const closeDetail = () => {
    router.push(`/portal/projects/${projectId}/deliverables`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#23FD9E] animate-spin" />
          <p className="text-white/40 text-sm">Loading deliverables...</p>
        </div>
      </div>
    )
  }

  // Show detail view if a deliverable is selected
  if (selectedDeliverable) {
    return (
      <DeliverableDetail
        deliverable={selectedDeliverable}
        versions={versions}
        userRole="client"
        onBack={closeDetail}
        onApprove={selectedDeliverable.status === 'in_review' ? handleApprove : undefined}
        onReject={selectedDeliverable.status === 'in_review' ? handleReject : undefined}
      />
    )
  }

  return (
    <>
      <Header
        title={`${projectName} - Deliverables`}
        description="Review and approve content for this project."
        actions={
          <Link href={`/portal/projects/${projectId}`}>
            <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Project
            </Button>
          </Link>
        }
      />

      <div className="p-8">
        {deliverables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-xl bg-white/[0.04] flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-white/40" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No deliverables yet</h3>
            <p className="text-white/40 text-sm">
              Content will appear here when it's ready for your review.
            </p>
          </div>
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
      </div>
    </>
  )
}
