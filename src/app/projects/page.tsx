'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  Clock,
  MoreHorizontal,
  Loader2,
  FolderKanban,
} from 'lucide-react'
import { DashboardLayout, Header } from '@/components/layout'
import { Card, Button, Input, Badge, Avatar, Progress, Tabs, TabsList, TabsTrigger } from '@/components/ui'
import { formatCurrency, formatDate, getStatusColor, getPriorityColor } from '@/lib/utils'
import { useProjects } from '@/hooks'
import Link from 'next/link'

export default function ProjectsPage() {
  const { projects, loading, error } = useProjects()
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.client?.name?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && ['in_progress', 'review'].includes(project.status)) ||
      (statusFilter === 'review' && project.status === 'review') ||
      (statusFilter === 'completed' && project.status === 'completed')

    return matchesSearch && matchesStatus
  })

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

  return (
    <DashboardLayout>
      <Header
        title="Projects"
        description="Manage and track all your creative projects."
        actions={
          <Link href="/projects/new">
            <Button leftIcon={<Plus className="w-4 h-4" />}>New Project</Button>
          </Link>
        }
      />

      <div className="p-8">
        {/* Filters & View Toggle */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
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
            <Button variant="secondary" leftIcon={<Filter className="w-4 h-4" />}>
              Filter
            </Button>
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

        {/* Tabs */}
        <div className="mb-8">
          <div className="flex items-center gap-1 p-1 bg-white/[0.02] rounded-lg w-fit border border-white/[0.06]">
            {[
              { value: 'all', label: 'All Projects' },
              { value: 'active', label: 'Active' },
              { value: 'review', label: 'In Review' },
              { value: 'completed', label: 'Completed' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-4 py-2 rounded-md text-sm transition-all duration-200 ${
                  statusFilter === tab.value
                    ? 'bg-white/[0.06] text-white'
                    : 'text-charcoal-500 hover:text-charcoal-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Empty State */}
        {filteredProjects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-xl bg-white/[0.04] flex items-center justify-center mb-4">
              <FolderKanban className="w-8 h-8 text-charcoal-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No projects found</h3>
            <p className="text-charcoal-500 text-sm mb-6">
              {searchQuery ? 'Try adjusting your search terms.' : 'Get started by creating your first project.'}
            </p>
            <Link href="/projects/new">
              <Button leftIcon={<Plus className="w-4 h-4" />}>Create Project</Button>
            </Link>
          </div>
        )}

        {/* Projects Grid */}
        {filteredProjects.length > 0 && view === 'grid' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Link href={`/projects/${project.id}`}>
                  <Card variant="interactive" className="h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={project.client?.name || 'Unknown'} size="sm" />
                        <span className="text-sm text-charcoal-400">{project.client?.name || 'No client'}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                        }}
                        className="p-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4 text-charcoal-500" />
                      </button>
                    </div>

                    <h3 className="text-lg font-semibold text-white mb-2">{project.name}</h3>
                    <p className="text-sm text-charcoal-400 line-clamp-2 mb-4">{project.description}</p>

                    {project.tags && project.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-charcoal-500">Progress</span>
                        <span className="text-charcoal-300">{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} />
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(project.status)}>
                          {project.status.replace('_', ' ')}
                        </Badge>
                        <Badge className={getPriorityColor(project.priority)}>
                          {project.priority}
                        </Badge>
                      </div>
                      {project.due_date && (
                        <div className="flex items-center gap-1 text-sm text-charcoal-500">
                          <Clock className="w-4 h-4" />
                          <span>{formatDate(project.due_date, 'MMM d')}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Projects List */}
        {filteredProjects.length > 0 && view === 'list' && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left py-4 px-4 text-[10px] font-medium text-charcoal-500 uppercase tracking-[0.1em]">Project</th>
                    <th className="text-left py-4 px-4 text-[10px] font-medium text-charcoal-500 uppercase tracking-[0.1em]">Client</th>
                    <th className="text-left py-4 px-4 text-[10px] font-medium text-charcoal-500 uppercase tracking-[0.1em]">Status</th>
                    <th className="text-left py-4 px-4 text-[10px] font-medium text-charcoal-500 uppercase tracking-[0.1em]">Progress</th>
                    <th className="text-left py-4 px-4 text-[10px] font-medium text-charcoal-500 uppercase tracking-[0.1em]">Quote</th>
                    <th className="text-left py-4 px-4 text-[10px] font-medium text-charcoal-500 uppercase tracking-[0.1em]">Due Date</th>
                    <th className="text-right py-4 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((project) => (
                    <tr key={project.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-4">
                        <Link href={`/projects/${project.id}`} className="font-medium text-white hover:text-resonate-400">
                          {project.name}
                        </Link>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Avatar name={project.client?.name || 'Unknown'} size="sm" />
                          <span className="text-charcoal-300">{project.client?.name || 'No client'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge className={getStatusColor(project.status)}>
                          {project.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <Progress value={project.progress} className="w-20" />
                          <span className="text-sm text-charcoal-400">{project.progress}%</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-charcoal-300">
                        {formatCurrency(project.budget)}
                      </td>
                      <td className="py-4 px-4 text-charcoal-400">
                        {project.due_date ? formatDate(project.due_date) : '-'}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button className="p-2 rounded-lg hover:bg-white/[0.04] transition-colors">
                          <MoreHorizontal className="w-4 h-4 text-charcoal-500" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
