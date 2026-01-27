'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Loader2,
  Tag,
  X,
  Plus,
  FolderKanban,
  Sparkles,
  Bot,
} from 'lucide-react'
import { DashboardLayout, Header } from '@/components/layout'
import { Card, Button, Input, Badge } from '@/components/ui'
import { useClients, useProjects } from '@/hooks'
import { cn } from '@/lib/utils'
import Link from 'next/link'

type ProjectStatus = 'draft' | 'in_progress' | 'review' | 'completed' | 'cancelled'
type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent'

const statusOptions: { value: ProjectStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: 'bg-white/10 text-white/60' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-500/10 text-blue-400' },
  { value: 'review', label: 'In Review', color: 'bg-amber-500/10 text-amber-400' },
]

const priorityOptions: { value: ProjectPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-white/10 text-white/60' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-500/10 text-blue-400' },
  { value: 'high', label: 'High', color: 'bg-amber-500/10 text-amber-400' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500/10 text-red-400' },
]

export default function NewProjectPage() {
  const router = useRouter()
  const { clients, loading: clientsLoading } = useClients()
  const { addProject } = useProjects()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')

  const [autoGenerate, setAutoGenerate] = useState(true)
  const [generatingPlan, setGeneratingPlan] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    client_id: '',
    status: 'draft' as ProjectStatus,
    priority: 'medium' as ProjectPriority,
    budget: '',
    start_date: '',
    due_date: '',
    tags: [] as string[],
  })

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      })
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const projectData = {
        name: formData.name,
        description: formData.description || null,
        client_id: formData.client_id || null,
        status: formData.status,
        priority: formData.priority,
        budget: formData.budget ? parseFloat(formData.budget) : 0,
        spent: 0,
        start_date: formData.start_date || null,
        due_date: formData.due_date || null,
        completed_at: null,
        progress: 0,
        tags: formData.tags,
      }

      const newProject = await addProject(projectData)

      // Auto-generate project plan if enabled
      if (autoGenerate) {
        setGeneratingPlan(true)
        try {
          await fetch(`/api/projects/${newProject.id}/generate`, {
            method: 'POST',
          })
        } catch (genErr) {
          console.error('Error generating project plan:', genErr)
          // Don't block navigation if generation fails
        } finally {
          setGeneratingPlan(false)
        }
      }

      router.push(`/projects/${newProject.id}`)
    } catch (err) {
      console.error('Error creating project:', err)
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardLayout>
      <Header
        title="Create Project"
        description="Set up a new project with all the details."
        actions={
          <Link href="/projects">
            <Button variant="secondary" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Projects
            </Button>
          </Link>
        }
      />

      <div className="p-8 max-w-4xl mx-auto">
        <form onSubmit={handleSubmit}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Error Alert */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Basic Info */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-[#23FD9E]/10 flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 text-[#23FD9E]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Project Details</h2>
                  <p className="text-sm text-white/40">Basic information about the project</p>
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  label="Project Name"
                  placeholder="Enter project name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">
                    Description
                  </label>
                  <textarea
                    placeholder="Describe the project scope, goals, and deliverables..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#23FD9E]/50 focus:ring-1 focus:ring-[#23FD9E]/20 resize-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">
                    Client
                  </label>
                  <select
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#23FD9E]/50 focus:ring-1 focus:ring-[#23FD9E]/20 transition-colors"
                    disabled={clientsLoading}
                  >
                    <option value="">No client assigned</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} {client.company ? `(${client.company})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>

            {/* Status & Priority */}
            <Card className="p-6">
              <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">
                Status & Priority
              </h3>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-3">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {statusOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, status: option.value })}
                        className={cn(
                          'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                          formData.status === option.value
                            ? 'bg-[#23FD9E]/10 border-[#23FD9E]/30 text-[#23FD9E] border'
                            : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/60 mb-3">Priority</label>
                  <div className="flex flex-wrap gap-2">
                    {priorityOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, priority: option.value })}
                        className={cn(
                          'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                          formData.priority === option.value
                            ? option.value === 'urgent'
                              ? 'bg-red-500/10 border-red-500/30 text-red-400 border'
                              : option.value === 'high'
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 border'
                              : 'bg-[#23FD9E]/10 border-[#23FD9E]/30 text-[#23FD9E] border'
                            : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Timeline & Budget */}
            <Card className="p-6">
              <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">
                Timeline & Budget
              </h3>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#23FD9E]/50 focus:ring-1 focus:ring-[#23FD9E]/20 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#23FD9E]/50 focus:ring-1 focus:ring-[#23FD9E]/20 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-2" />
                    Budget
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#23FD9E]/50 focus:ring-1 focus:ring-[#23FD9E]/20 transition-colors"
                  />
                </div>
              </div>
            </Card>

            {/* Tags */}
            <Card className="p-6">
              <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">
                <Tag className="w-4 h-4 inline mr-2" />
                Tags
              </h3>

              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Add a tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#23FD9E]/50 transition-colors"
                />
                <Button type="button" variant="secondary" onClick={handleAddTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </Card>

            {/* AI Auto-Generate */}
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-violet-600/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-violet-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        AI Project Setup
                      </h3>
                      <p className="text-sm text-white/40 mt-1">
                        Let AI automatically generate tasks, milestones, and deliverables based on your project details.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoGenerate}
                        onChange={(e) => setAutoGenerate(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#23FD9E]/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#23FD9E]/60"></div>
                    </label>
                  </div>
                  {autoGenerate && (
                    <div className="mt-3 p-3 bg-[#23FD9E]/5 border border-[#23FD9E]/20 rounded-lg">
                      <p className="text-xs text-[#23FD9E]/80">
                        After creating the project, AI will analyze your description and timeline to generate a comprehensive project plan. This may add tasks, milestones, deliverables, and team role suggestions.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <Link href="/projects">
                <Button variant="secondary" type="button">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting || generatingPlan || !formData.name}>
                {isSubmitting || generatingPlan ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {generatingPlan ? 'Generating Plan...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Project
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </form>
      </div>
    </DashboardLayout>
  )
}
