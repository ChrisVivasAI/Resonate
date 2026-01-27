'use client'

import { useState, useEffect, use } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  Loader2,
  Package,
  ArrowLeft,
  FolderKanban,
} from 'lucide-react'
import { DashboardLayout, Header } from '@/components/layout'
import { Card, Button, Input, Badge } from '@/components/ui'
import { DeliverableCard, DeliverableUpload, StatusBadge } from '@/components/deliverables'
import { useDeliverables } from '@/hooks/use-deliverables'
import Link from 'next/link'
import type { DeliverableStatus } from '@/types'

export default function ProjectDeliverablesPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | DeliverableStatus>('all')
  const [showUpload, setShowUpload] = useState(false)

  const { deliverables, loading, error, createDeliverable } = useDeliverables({
    projectId,
    realtime: true,
  })

  const filteredDeliverables = deliverables.filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || d.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const statusCounts = {
    all: deliverables.length,
    draft: deliverables.filter((d) => d.status === 'draft').length,
    in_review: deliverables.filter((d) => d.status === 'in_review').length,
    approved: deliverables.filter((d) => d.status === 'approved').length,
    final: deliverables.filter((d) => d.status === 'final').length,
  }

  const handleUpload = async (data: {
    title: string
    description?: string
    type: 'image' | 'video' | 'audio' | 'document' | 'text'
    fileUrl?: string
    thumbnailUrl?: string
  }) => {
    await createDeliverable(data)
    setShowUpload(false)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-[#23FD9E] animate-spin" />
            <p className="text-white/40 text-sm">Loading deliverables...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <Header
        title="Deliverables"
        description="Manage project content and client approvals."
        actions={
          <div className="flex items-center gap-3">
            <Link href={`/projects/${projectId}`}>
              <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Back to Project
              </Button>
            </Link>
            <Button
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setShowUpload(true)}
            >
              Add Deliverable
            </Button>
          </div>
        }
      />

      <div className="p-8">
        {/* Filters & View Toggle */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <Input
                placeholder="Search deliverables..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={view === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={view === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="mb-8">
          <div className="flex items-center gap-1 p-1 bg-white/[0.02] rounded-lg w-fit border border-white/[0.06]">
            {[
              { value: 'all' as const, label: 'All' },
              { value: 'draft' as const, label: 'Draft' },
              { value: 'in_review' as const, label: 'In Review' },
              { value: 'approved' as const, label: 'Approved' },
              { value: 'final' as const, label: 'Final' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-4 py-2 rounded-md text-sm transition-all duration-200 flex items-center gap-2 ${
                  statusFilter === tab.value
                    ? 'bg-white/[0.06] text-white'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                {tab.label}
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/10">
                  {statusCounts[tab.value]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Empty State */}
        {filteredDeliverables.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-xl bg-white/[0.04] flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-white/40" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No deliverables found</h3>
            <p className="text-white/40 text-sm mb-6">
              {searchQuery
                ? 'Try adjusting your search terms.'
                : 'Add your first deliverable to this project.'}
            </p>
            <Button
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setShowUpload(true)}
            >
              Add Deliverable
            </Button>
          </div>
        )}

        {/* Deliverables Grid */}
        {filteredDeliverables.length > 0 && view === 'grid' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDeliverables.map((deliverable, index) => (
              <DeliverableCard
                key={deliverable.id}
                deliverable={deliverable}
                index={index}
                onClick={() =>
                  router.push(`/projects/${projectId}/deliverables/${deliverable.id}`)
                }
              />
            ))}
          </div>
        )}

        {/* Deliverables List */}
        {filteredDeliverables.length > 0 && view === 'list' && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left py-4 px-4 text-[10px] font-medium text-white/40 uppercase tracking-[0.1em]">
                      Title
                    </th>
                    <th className="text-left py-4 px-4 text-[10px] font-medium text-white/40 uppercase tracking-[0.1em]">
                      Type
                    </th>
                    <th className="text-left py-4 px-4 text-[10px] font-medium text-white/40 uppercase tracking-[0.1em]">
                      Status
                    </th>
                    <th className="text-left py-4 px-4 text-[10px] font-medium text-white/40 uppercase tracking-[0.1em]">
                      Version
                    </th>
                    <th className="text-left py-4 px-4 text-[10px] font-medium text-white/40 uppercase tracking-[0.1em]">
                      Updated
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeliverables.map((deliverable) => (
                    <tr
                      key={deliverable.id}
                      onClick={() =>
                        router.push(`/projects/${projectId}/deliverables/${deliverable.id}`)
                      }
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-4">
                        <span className="font-medium text-white">{deliverable.title}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-white/60 capitalize">{deliverable.type}</span>
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge status={deliverable.status} size="sm" />
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-white/40">v{deliverable.current_version}</span>
                      </td>
                      <td className="py-4 px-4 text-white/40">
                        {new Date(deliverable.updated_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Upload Modal */}
      <DeliverableUpload
        isOpen={showUpload}
        onUpload={handleUpload}
        onCancel={() => setShowUpload(false)}
      />
    </DashboardLayout>
  )
}
