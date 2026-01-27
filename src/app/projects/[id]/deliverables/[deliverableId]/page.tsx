'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { DashboardLayout } from '@/components/layout'
import { DeliverableDetail } from '@/components/deliverables'
import { useDeliverable, useDeliverableVersions, useDeliverables } from '@/hooks/use-deliverables'
import { createClient } from '@/lib/supabase/client'

export default function DeliverableDetailPage({
  params,
}: {
  params: Promise<{ id: string; deliverableId: string }>
}) {
  const router = useRouter()
  const [projectId, setProjectId] = useState<string>('')
  const [deliverableId, setDeliverableId] = useState<string>('')
  const [userRole, setUserRole] = useState<'admin' | 'member' | 'client'>('member')

  // Resolve params
  useEffect(() => {
    params.then(({ id, deliverableId }) => {
      setProjectId(id)
      setDeliverableId(deliverableId)
    })
  }, [params])

  // Fetch user role
  useEffect(() => {
    async function fetchUserRole() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        if (profile) {
          setUserRole(profile.role as 'admin' | 'member' | 'client')
        }
      }
    }
    fetchUserRole()
  }, [])

  const { deliverable, loading: loadingDeliverable } = useDeliverable(deliverableId)
  const { versions, loading: loadingVersions, createVersion } = useDeliverableVersions(deliverableId)
  const { submitForReview, approveDeliverable, rejectDeliverable } = useDeliverables({ projectId })

  const loading = loadingDeliverable || loadingVersions || !deliverableId

  if (loading || !deliverable) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-[#23FD9E] animate-spin" />
            <p className="text-white/40 text-sm">Loading deliverable...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const handleBack = () => {
    router.push(`/projects/${projectId}/deliverables`)
  }

  const handleSubmitForReview = async () => {
    await submitForReview(deliverableId)
  }

  const handleApprove = async (feedback?: string) => {
    await approveDeliverable(deliverableId, feedback)
  }

  const handleReject = async (feedback: string, requestChanges?: boolean) => {
    await rejectDeliverable(deliverableId, feedback, requestChanges)
  }

  const handleMarkFinal = async () => {
    await approveDeliverable(deliverableId, undefined, true)
  }

  const handleUploadVersion = async (data: { fileUrl: string; notes?: string }) => {
    await createVersion(data)
  }

  return (
    <DashboardLayout>
      <DeliverableDetail
        deliverable={deliverable}
        versions={versions}
        userRole={userRole}
        onBack={handleBack}
        onSubmitForReview={['admin', 'member'].includes(userRole) ? handleSubmitForReview : undefined}
        onApprove={
          userRole === 'client' && deliverable.status === 'in_review'
            ? handleApprove
            : undefined
        }
        onReject={
          userRole === 'client' && deliverable.status === 'in_review'
            ? handleReject
            : undefined
        }
        onMarkFinal={
          ['admin', 'member'].includes(userRole) && deliverable.status === 'approved'
            ? handleMarkFinal
            : undefined
        }
        onUploadVersion={['admin', 'member'].includes(userRole) ? handleUploadVersion : undefined}
      />
    </DashboardLayout>
  )
}
