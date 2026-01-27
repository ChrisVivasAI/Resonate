'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Plus,
  Search,
  Filter,
  ArrowLeft,
  Loader2,
  FolderKanban,
  ChevronRight,
  Clock,
  DollarSign,
} from 'lucide-react'
import { DashboardLayout, Header } from '@/components/layout'
import { Card, Button, Input, Badge, Avatar, Progress } from '@/components/ui'
import { formatCurrency, formatDate, getStatusColor, getPriorityColor } from '@/lib/utils'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Client, Project } from '@/types'

export default function ClientProjectsPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string
  const supabase = createClient()

  const [client, setClient] = useState<Client | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single()

      if (clientError) throw clientError

      // Fetch projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      setClient(clientData)
      setProjects(projectsData || [])
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const statusCounts = {
    all: projects.length,
    in_progress: projects.filter(p => p.status === 'in_progress').length,
    review: projects.filter(p => p.status === 'review').length,
    completed: projects.filter(p => p.status === 'completed').length,
    draft: projects.filter(p => p.status === 'draft').length,
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-resonate-400 animate-spin" />
            <p className="text-charcoal-500 text-sm">Loading projects...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!client) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <FolderKanban className="w-12 h-12 text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Client Not Found</h2>
          <Button onClick={() => router.push('/clients')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Clients
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="border-b border-white/[0.06]">
        <div className="px-8 py-6">
          <div className="flex items-center gap-3 text-sm text-charcoal-500 mb-4">
            <Link href="/clients" className="hover:text-white transition-colors">
              Clients
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link href={`/clients/${clientId}`} className="hover:text-white transition-colors">
              {client.name}
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white">Projects</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar name={client.name} size="lg" />
              <div>
                <h1 className="text-2xl font-bold text-white">{client.name}&apos;s Projects</h1>
                <p className="text-charcoal-400">{projects.length} total projects</p>
              </div>
            </div>
            <Link href={`/projects/new?client=${clientId}`}>
              <Button leftIcon={<Plus className="w-4 h-4" />}>
                New Project
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal-500" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-2 mb-6">
          {[
            { key: 'all', label: 'All' },
            { key: 'in_progress', label: 'In Progress' },
            { key: 'review', label: 'In Review' },
            { key: 'completed', label: 'Completed' },
            { key: 'draft', label: 'Draft' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === tab.key
                  ? 'bg-white/[0.08] text-white'
                  : 'text-charcoal-500 hover:text-charcoal-300 hover:bg-white/[0.04]'
              }`}
            >
              {tab.label}
              <span className="ml-2 text-xs opacity-60">
                {statusCounts[tab.key as keyof typeof statusCounts]}
              </span>
            </button>
          ))}
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-xl bg-white/[0.04] flex items-center justify-center mb-4">
              <FolderKanban className="w-8 h-8 text-charcoal-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No projects found</h3>
            <p className="text-charcoal-500 text-sm mb-6">
              {searchQuery ? 'Try adjusting your search terms.' : 'Get started by creating a new project.'}
            </p>
            <Link href={`/projects/new?client=${clientId}`}>
              <Button leftIcon={<Plus className="w-4 h-4" />}>
                Create Project
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Link href={`/clients/${clientId}/projects/${project.id}`}>
                  <Card variant="interactive" className="h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-white">{project.name}</h3>
                        {project.description && (
                          <p className="text-sm text-charcoal-400 line-clamp-2 mt-1">
                            {project.description}
                          </p>
                        )}
                      </div>
                      <Badge className={getStatusColor(project.status)}>
                        {project.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-charcoal-500">Progress</span>
                        <span className="text-white font-medium">{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="h-1.5" />
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-charcoal-500" />
                        <span className="text-charcoal-400">
                          {project.due_date
                            ? formatDate(project.due_date, 'MMM d')
                            : 'No due date'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-charcoal-500" />
                        <span className="text-charcoal-400">
                          {formatCurrency(project.budget)}
                        </span>
                      </div>
                    </div>

                    {project.priority && (
                      <div className="mt-3">
                        <Badge className={getPriorityColor(project.priority)}>
                          {project.priority} priority
                        </Badge>
                      </div>
                    )}
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
