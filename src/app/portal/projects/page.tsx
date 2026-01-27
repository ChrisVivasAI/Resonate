'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import {
  Search,
  FolderKanban,
  Clock,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { Header } from '@/components/layout'
import { Card, Input, Badge, Progress } from '@/components/ui'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Project } from '@/types'
import { getStatusColor } from '@/lib/utils'

export default function ClientProjectsPage() {
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function fetchProjects() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get the client record linked to this user
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('profile_id', user.id)
        .single()

      if (client) {
        const { data: projectsData } = await supabase
          .from('projects')
          .select('*')
          .eq('client_id', client.id)
          .order('updated_at', { ascending: false })

        if (projectsData) setProjects(projectsData)
      }

      setLoading(false)
    }

    fetchProjects()
  }, [])

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#23FD9E] animate-spin" />
          <p className="text-white/40 text-sm">Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Header
        title="Your Projects"
        description="View and track all your active projects."
      />

      <div className="p-8">
        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Empty State */}
        {filteredProjects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-xl bg-white/[0.04] flex items-center justify-center mb-4">
              <FolderKanban className="w-8 h-8 text-white/40" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No projects found</h3>
            <p className="text-white/40 text-sm">
              {searchQuery
                ? 'Try adjusting your search terms.'
                : 'You don\'t have any projects yet.'}
            </p>
          </div>
        )}

        {/* Projects Grid */}
        {filteredProjects.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Link href={`/portal/projects/${project.id}`}>
                  <Card variant="interactive" className="h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-lg bg-[#23FD9E]/10 flex items-center justify-center">
                        <FolderKanban className="w-5 h-5 text-[#23FD9E]" />
                      </div>
                      <Badge className={getStatusColor(project.status)}>
                        {project.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <h3 className="text-lg font-semibold text-white mb-2">{project.name}</h3>
                    <p className="text-sm text-white/40 line-clamp-2 mb-4">
                      {project.description || 'No description'}
                    </p>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/40">Progress</span>
                        <span className="text-white">{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} />
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.06]">
                      {project.due_date && (
                        <div className="flex items-center gap-1 text-sm text-white/40">
                          <Clock className="w-4 h-4" />
                          <span>Due {formatDistanceToNow(new Date(project.due_date), { addSuffix: true })}</span>
                        </div>
                      )}
                      <ArrowRight className="w-4 h-4 text-white/30 ml-auto" />
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
