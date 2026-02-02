'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Clock,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  Plus,
  FileText,
  Loader2,
  Activity,
  Settings,
  ChevronRight,
  Flag,
  ListTodo,
  Package,
  MessageSquare,
  Wallet,
  Sparkles,
  Bot,
  Zap,
  Pencil,
  Trash2,
  X,
  Check,
} from 'lucide-react'
import { DashboardLayout, Header } from '@/components/layout'
import { Card, Button, Badge, Avatar, Progress, Modal, Input, Textarea, Select } from '@/components/ui'
import type { Task, Milestone, Deliverable, Project } from '@/types'
import { useProject, useProjectHealth, useActivity, useDeliverables, useClients } from '@/hooks'
import { Image as ImageIcon, Video, Music, FileText as FileTextIcon, Code } from 'lucide-react'
import { HealthReport, MonitoringConfig } from '@/components/ai'
import { ActivityFeed } from '@/components/collaboration/activity-feed'
import { FinancialDashboard } from '@/components/financials'
import { ExpenseTable } from '@/components/expenses'
import { LaborTable } from '@/components/labor'
import { ReimbursementTable } from '@/components/reimbursements'
import { ReturnTable } from '@/components/returns'
import { ProjectChat } from '@/components/chat'
import { formatCurrency, formatDate, getStatusColor, getPriorityColor, cn } from '@/lib/utils'
import Link from 'next/link'

type TabType = 'overview' | 'tasks' | 'milestones' | 'deliverables' | 'financials' | 'health' | 'activity'

const tabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'milestones', label: 'Milestones', icon: Flag },
  { id: 'deliverables', label: 'Deliverables', icon: Package },
  { id: 'financials', label: 'Financials', icon: Wallet },
  { id: 'health', label: 'Health', icon: Activity },
  { id: 'activity', label: 'Activity', icon: MessageSquare },
]

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateResult, setGenerateResult] = useState<{
    tasks: number
    milestones: number
    deliverables: number
  } | null>(null)

  // Task modal state
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    status: 'todo' as Task['status'],
    due_date: '',
  })
  const [taskLoading, setTaskLoading] = useState(false)
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)

  // Milestone modal state
  const [showMilestoneModal, setShowMilestoneModal] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)
  const [milestoneForm, setMilestoneForm] = useState({
    title: '',
    description: '',
    due_date: '',
    payment_amount: '',
  })
  const [milestoneLoading, setMilestoneLoading] = useState(false)
  const [deletingMilestoneId, setDeletingMilestoneId] = useState<string | null>(null)

  // Deliverable modal state
  const [showDeliverableModal, setShowDeliverableModal] = useState(false)
  const [editingDeliverable, setEditingDeliverable] = useState<Deliverable | null>(null)
  const [deliverableForm, setDeliverableForm] = useState({
    title: '',
    description: '',
    type: 'document' as Deliverable['type'],
    file_url: '',
    draft_url: '',
    draft_platform: 'frame_io' as Deliverable['draft_platform'],
    final_url: '',
    final_platform: 'google_drive' as Deliverable['final_platform'],
    notes: '',
  })
  const [deliverableLoading, setDeliverableLoading] = useState(false)
  const [deletingDeliverableId, setDeletingDeliverableId] = useState<string | null>(null)

  // Project edit/delete state
  const [showEditProjectModal, setShowEditProjectModal] = useState(false)
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false)
  const [showProjectMenu, setShowProjectMenu] = useState(false)
  const [projectFormLoading, setProjectFormLoading] = useState(false)
  const [deleteProjectLoading, setDeleteProjectLoading] = useState(false)
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    client_id: '' as string | null,
    status: 'draft' as Project['status'],
    priority: 'medium' as Project['priority'],
    budget: '',
    start_date: '',
    due_date: '',
    tags: '',
  })

  const {
    project,
    tasks,
    milestones,
    loading,
    error,
    refetch,
    updateProject,
    deleteProject,
    addTask,
    updateTask,
    deleteTask,
    addMilestone,
    updateMilestone,
    deleteMilestone,
  } = useProject(projectId)

  const { clients } = useClients()

  const {
    deliverables,
    loading: deliverablesLoading,
    createDeliverable,
    updateDeliverable,
    deleteDeliverable,
    refetch: refetchDeliverables,
  } = useDeliverables({ projectId, realtime: true })

  const handleGeneratePlan = async () => {
    try {
      setIsGenerating(true)
      setGenerateResult(null)
      const response = await fetch(`/api/projects/${projectId}/generate`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error('Failed to generate plan')
      }
      const data = await response.json()
      setGenerateResult({
        tasks: data.created.tasks,
        milestones: data.created.milestones,
        deliverables: data.created.deliverables,
      })
      refetch() // Refresh project data
    } catch (err) {
      console.error('Error generating plan:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  // Project edit/delete handlers
  const openEditProject = () => {
    if (!project) return
    setProjectForm({
      name: project.name,
      description: project.description || '',
      client_id: project.client_id,
      status: project.status,
      priority: project.priority,
      budget: project.budget?.toString() || '',
      start_date: project.start_date?.split('T')[0] || '',
      due_date: project.due_date?.split('T')[0] || '',
      tags: project.tags?.join(', ') || '',
    })
    setShowEditProjectModal(true)
    setShowProjectMenu(false)
  }

  const handleSaveProject = async () => {
    if (!projectForm.name.trim()) return
    setProjectFormLoading(true)
    try {
      await updateProject({
        name: projectForm.name,
        description: projectForm.description || null,
        client_id: projectForm.client_id || null,
        status: projectForm.status,
        priority: projectForm.priority,
        budget: projectForm.budget ? parseFloat(projectForm.budget) : 0,
        start_date: projectForm.start_date || null,
        due_date: projectForm.due_date || null,
        tags: projectForm.tags ? projectForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      })
      setShowEditProjectModal(false)
    } catch (err) {
      console.error('Error saving project:', err)
    } finally {
      setProjectFormLoading(false)
    }
  }

  const handleDeleteProject = async () => {
    setDeleteProjectLoading(true)
    try {
      await deleteProject()
      router.push('/projects')
    } catch (err) {
      console.error('Error deleting project:', err)
    } finally {
      setDeleteProjectLoading(false)
    }
  }

  // Task handlers
  const openAddTask = () => {
    setEditingTask(null)
    setTaskForm({
      title: '',
      description: '',
      priority: 'medium',
      status: 'todo',
      due_date: '',
    })
    setShowTaskModal(true)
  }

  const openEditTask = (task: Task) => {
    setEditingTask(task)
    setTaskForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      due_date: task.due_date?.split('T')[0] || '',
    })
    setShowTaskModal(true)
  }

  const handleSaveTask = async () => {
    if (!taskForm.title.trim()) return
    setTaskLoading(true)
    try {
      if (editingTask) {
        await updateTask(editingTask.id, {
          title: taskForm.title,
          description: taskForm.description || undefined,
          priority: taskForm.priority,
          status: taskForm.status,
          due_date: taskForm.due_date || undefined,
        })
      } else {
        await addTask({
          title: taskForm.title,
          description: taskForm.description || undefined,
          priority: taskForm.priority,
          status: taskForm.status,
          due_date: taskForm.due_date || undefined,
        })
      }
      setShowTaskModal(false)
    } catch (err) {
      console.error('Error saving task:', err)
    } finally {
      setTaskLoading(false)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    setDeletingTaskId(taskId)
    try {
      await deleteTask(taskId)
    } catch (err) {
      console.error('Error deleting task:', err)
    } finally {
      setDeletingTaskId(null)
    }
  }

  const handleToggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'todo' : 'completed'
    try {
      await updateTask(task.id, { status: newStatus })
    } catch (err) {
      console.error('Error toggling task status:', err)
    }
  }

  // Milestone handlers
  const openAddMilestone = () => {
    setEditingMilestone(null)
    setMilestoneForm({
      title: '',
      description: '',
      due_date: '',
      payment_amount: '',
    })
    setShowMilestoneModal(true)
  }

  const openEditMilestone = (milestone: Milestone) => {
    setEditingMilestone(milestone)
    setMilestoneForm({
      title: milestone.title,
      description: milestone.description || '',
      due_date: milestone.due_date?.split('T')[0] || '',
      payment_amount: milestone.payment_amount?.toString() || '',
    })
    setShowMilestoneModal(true)
  }

  const handleSaveMilestone = async () => {
    if (!milestoneForm.title.trim()) return
    setMilestoneLoading(true)
    try {
      if (editingMilestone) {
        await updateMilestone(editingMilestone.id, {
          title: milestoneForm.title,
          description: milestoneForm.description || undefined,
          due_date: milestoneForm.due_date || undefined,
          payment_amount: milestoneForm.payment_amount ? parseFloat(milestoneForm.payment_amount) : undefined,
        })
      } else {
        await addMilestone({
          title: milestoneForm.title,
          description: milestoneForm.description || undefined,
          due_date: milestoneForm.due_date || new Date().toISOString().split('T')[0],
          payment_amount: milestoneForm.payment_amount ? parseFloat(milestoneForm.payment_amount) : undefined,
        })
      }
      setShowMilestoneModal(false)
    } catch (err) {
      console.error('Error saving milestone:', err)
    } finally {
      setMilestoneLoading(false)
    }
  }

  const handleDeleteMilestone = async (milestoneId: string) => {
    setDeletingMilestoneId(milestoneId)
    try {
      await deleteMilestone(milestoneId)
    } catch (err) {
      console.error('Error deleting milestone:', err)
    } finally {
      setDeletingMilestoneId(null)
    }
  }

  const handleToggleMilestoneStatus = async (milestone: Milestone) => {
    try {
      await updateMilestone(milestone.id, {
        completed_at: milestone.completed_at ? null : new Date().toISOString(),
      })
    } catch (err) {
      console.error('Error toggling milestone status:', err)
    }
  }

  // Deliverable handlers
  const openAddDeliverable = () => {
    setEditingDeliverable(null)
    setDeliverableForm({
      title: '',
      description: '',
      type: 'document',
      file_url: '',
      draft_url: '',
      draft_platform: 'frame_io',
      final_url: '',
      final_platform: 'google_drive',
      notes: '',
    })
    setShowDeliverableModal(true)
  }

  const openEditDeliverable = (deliverable: Deliverable) => {
    setEditingDeliverable(deliverable)
    setDeliverableForm({
      title: deliverable.title,
      description: deliverable.description || '',
      type: deliverable.type,
      file_url: deliverable.file_url || '',
      draft_url: deliverable.draft_url || '',
      draft_platform: deliverable.draft_platform || 'frame_io',
      final_url: deliverable.final_url || '',
      final_platform: deliverable.final_platform || 'google_drive',
      notes: deliverable.notes || '',
    })
    setShowDeliverableModal(true)
  }

  const handleSaveDeliverable = async () => {
    if (!deliverableForm.title.trim()) return
    setDeliverableLoading(true)
    try {
      if (editingDeliverable) {
        await updateDeliverable(editingDeliverable.id, {
          title: deliverableForm.title,
          description: deliverableForm.description || undefined,
          fileUrl: deliverableForm.file_url || undefined,
          draft_url: deliverableForm.draft_url || undefined,
          draft_platform: deliverableForm.draft_url ? deliverableForm.draft_platform : undefined,
          final_url: deliverableForm.final_url || undefined,
          final_platform: deliverableForm.final_url ? deliverableForm.final_platform : undefined,
          notes: deliverableForm.notes || undefined,
        })
      } else {
        await createDeliverable({
          title: deliverableForm.title,
          description: deliverableForm.description || undefined,
          type: deliverableForm.type,
          fileUrl: deliverableForm.file_url || undefined,
        })
      }
      setShowDeliverableModal(false)
    } catch (err) {
      console.error('Error saving deliverable:', err)
    } finally {
      setDeliverableLoading(false)
    }
  }

  const handleDeleteDeliverable = async (deliverableId: string) => {
    setDeletingDeliverableId(deliverableId)
    try {
      await deleteDeliverable(deliverableId)
    } catch (err) {
      console.error('Error deleting deliverable:', err)
    } finally {
      setDeletingDeliverableId(null)
    }
  }

  // Deliverable type icons
  const getDeliverableIcon = (type: Deliverable['type']) => {
    switch (type) {
      case 'image': return ImageIcon
      case 'video': return Video
      case 'audio': return Music
      case 'text': return Code
      default: return FileTextIcon
    }
  }

  const getDeliverableTypeColor = (type: Deliverable['type']) => {
    switch (type) {
      case 'image': return 'text-pink-400 bg-pink-500/10'
      case 'video': return 'text-blue-400 bg-blue-500/10'
      case 'audio': return 'text-orange-400 bg-orange-500/10'
      case 'text': return 'text-violet-400 bg-violet-500/10'
      default: return 'text-emerald-400 bg-emerald-500/10'
    }
  }

  const {
    report,
    settings,
    history,
    analyzing,
    runAnalysis,
    updateSettings
  } = useProjectHealth({ projectId })
  const { activities, loading: activitiesLoading } = useActivity({ projectId })

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-[#23FD9E] animate-spin" />
            <p className="text-white/40 text-sm">Loading project...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !project) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Project Not Found</h2>
          <p className="text-white/40 mb-6">{error || 'The project you are looking for does not exist.'}</p>
          <Button onClick={() => router.push('/projects')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const completedMilestones = milestones.filter(m => !!m.completed_at).length
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="border-b border-white/[0.06]">
        <div className="px-8 py-6">
          <div className="flex items-center gap-3 text-sm text-white/40 mb-4">
            <Link href="/projects" className="hover:text-white transition-colors">
              Projects
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white">{project.name}</span>
          </div>

          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {project.client && (
                <Avatar name={project.client.name} size="lg" />
              )}
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">{project.name}</h1>
                <div className="flex items-center gap-3">
                  {project.client && (
                    <span className="text-white/40">{project.client.name}</span>
                  )}
                  <Badge className={getStatusColor(project.status)}>
                    {project.status.replace('_', ' ')}
                  </Badge>
                  <Badge className={getPriorityColor(project.priority)}>
                    {project.priority}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={openEditProject}>
                <Settings className="w-4 h-4" />
              </Button>
              <div className="relative">
                <Button variant="secondary" size="sm" onClick={() => setShowProjectMenu(!showProjectMenu)}>
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
                <AnimatePresence>
                  {showProjectMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowProjectMenu(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 top-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl z-20 min-w-[180px] overflow-hidden"
                      >
                        <button
                          onClick={openEditProject}
                          className="w-full px-4 py-2.5 text-left text-sm text-white/70 hover:bg-white/5 flex items-center gap-2"
                        >
                          <Pencil className="w-4 h-4" />
                          Edit Project
                        </button>
                        <button
                          onClick={() => { setShowDeleteProjectModal(true); setShowProjectMenu(false) }}
                          className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Project
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-8">
          <div className="flex items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative',
                    activeTab === tab.id
                      ? 'text-white'
                      : 'text-white/40 hover:text-white/60'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#23FD9E]"
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#23FD9E]/10 flex items-center justify-center">
                    <ListTodo className="w-5 h-5 text-[#23FD9E]" />
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">Tasks</p>
                    <p className="text-xl font-bold text-white">{completedTasks}/{tasks.length}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <Flag className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">Milestones</p>
                    <p className="text-xl font-bold text-white">{completedMilestones}/{milestones.length}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">Due Date</p>
                    <p className="text-xl font-bold text-white">
                      {project.due_date ? formatDate(project.due_date, 'MMM d') : 'Not set'}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">Budget</p>
                    <p className="text-xl font-bold text-white">{formatCurrency(project.budget)}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Progress & Description */}
            <div className="grid grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">Progress</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white">Overall Completion</span>
                    <span className="text-2xl font-bold text-[#23FD9E]">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-3" />
                  {overdueTasks > 0 && (
                    <div className="flex items-center gap-2 text-amber-400 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>{overdueTasks} overdue task{overdueTasks > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">Description</h3>
                <p className="text-white/70 leading-relaxed">
                  {project.description || 'No description provided.'}
                </p>
                {project.tags && project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {project.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Quick Health Preview */}
            {report && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Health Status</h3>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('health')}>
                    View Details
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-3 h-3 rounded-full',
                      report.status === 'healthy' ? 'bg-[#23FD9E]' :
                      report.status === 'at_risk' ? 'bg-amber-400' : 'bg-red-400'
                    )} />
                    <span className={cn(
                      'text-lg font-semibold',
                      report.status === 'healthy' ? 'text-[#23FD9E]' :
                      report.status === 'at_risk' ? 'text-amber-400' : 'text-red-400'
                    )}>
                      {report.status === 'healthy' ? 'Healthy' :
                       report.status === 'at_risk' ? 'At Risk' : 'Critical'}
                    </span>
                  </div>
                  <div className="text-4xl font-bold text-white">{report.health_score}</div>
                  <p className="flex-1 text-white/50 text-sm">{report.summary}</p>
                </div>
              </Card>
            )}

            {/* AI Assistant Actions */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ember-500 to-ember-600 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">AI Project Assistant</h3>
                  <p className="text-sm text-white/40">Let AI help you manage this project</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Generate Plan Card */}
                <div className="bg-obsidian-800/30 rounded-xl p-4 border border-obsidian-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h4 className="font-medium text-white">Generate Project Plan</h4>
                  </div>
                  <p className="text-sm text-white/40 mb-4">
                    Automatically create tasks, milestones, and deliverables based on project details.
                  </p>
                  {generateResult ? (
                    <div className="bg-[#23FD9E]/10 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2 text-[#23FD9E] text-sm mb-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="font-medium">Plan Generated!</span>
                      </div>
                      <div className="flex gap-4 text-xs text-white/60">
                        <span>{generateResult.tasks} tasks</span>
                        <span>{generateResult.milestones} milestones</span>
                        <span>{generateResult.deliverables} deliverables</span>
                      </div>
                    </div>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGeneratePlan}
                    disabled={isGenerating}
                    leftIcon={isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  >
                    {isGenerating ? 'Generating...' : 'Generate Plan'}
                  </Button>
                </div>

                {/* Quick Actions Card */}
                <div className="bg-obsidian-800/30 rounded-xl p-4 border border-obsidian-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-violet-400" />
                    <h4 className="font-medium text-white">Chat with Assistant</h4>
                  </div>
                  <p className="text-sm text-white/40 mb-4">
                    Ask questions, create tasks, track progress, or get recommendations.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 text-xs bg-obsidian-700/50 text-white/60 rounded-full">
                      Project summary
                    </span>
                    <span className="px-2 py-1 text-xs bg-obsidian-700/50 text-white/60 rounded-full">
                      Overdue items
                    </span>
                    <span className="px-2 py-1 text-xs bg-obsidian-700/50 text-white/60 rounded-full">
                      Budget status
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Tasks</h2>
              <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openAddTask}>
                Add Task
              </Button>
            </div>
            {tasks.length === 0 ? (
              <Card className="p-8 text-center">
                <ListTodo className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Tasks Yet</h3>
                <p className="text-white/40 text-sm mb-4">Add tasks to track work on this project.</p>
                <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openAddTask}>Create First Task</Button>
              </Card>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <Card key={task.id} className="p-4 group hover:border-white/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleTaskStatus(task)}
                          className={cn(
                            'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                            task.status === 'completed'
                              ? 'bg-[#23FD9E] border-[#23FD9E]'
                              : 'border-white/20 hover:border-[#23FD9E]/50'
                          )}
                        >
                          {task.status === 'completed' && (
                            <Check className="w-3 h-3 text-[#1a1a1a]" />
                          )}
                        </button>
                        <div>
                          <p className={cn(
                            'font-medium',
                            task.status === 'completed' ? 'text-white/40 line-through' : 'text-white'
                          )}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-sm text-white/40 line-clamp-1">{task.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {task.due_date && (
                          <span className={cn(
                            'text-sm',
                            new Date(task.due_date) < new Date() && task.status !== 'completed'
                              ? 'text-red-400'
                              : 'text-white/40'
                          )}>
                            {formatDate(task.due_date, 'MMM d')}
                          </span>
                        )}
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditTask(task)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                            title="Edit task"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            disabled={deletingTaskId === task.id}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors"
                            title="Delete task"
                          >
                            {deletingTaskId === task.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'milestones' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Milestones</h2>
              <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openAddMilestone}>
                Add Milestone
              </Button>
            </div>
            {milestones.length === 0 ? (
              <Card className="p-8 text-center">
                <Flag className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Milestones Yet</h3>
                <p className="text-white/40 text-sm mb-4">Add milestones to track key deliverables.</p>
                <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openAddMilestone}>Create First Milestone</Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {milestones.map((milestone) => {
                  const isCompleted = !!milestone.completed_at
                  return (
                    <Card key={milestone.id} className="p-5 group hover:border-white/10 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <button
                            onClick={() => handleToggleMilestoneStatus(milestone)}
                            className={cn(
                              'w-10 h-10 rounded-lg flex items-center justify-center transition-all',
                              isCompleted
                                ? 'bg-[#23FD9E]/10 hover:bg-[#23FD9E]/20'
                                : 'bg-violet-500/10 hover:bg-violet-500/20'
                            )}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-5 h-5 text-[#23FD9E]" />
                            ) : (
                              <Flag className="w-5 h-5 text-violet-400" />
                            )}
                          </button>
                          <div>
                            <h4 className={cn(
                              'font-medium',
                              isCompleted ? 'text-white/60 line-through' : 'text-white'
                            )}>
                              {milestone.title}
                            </h4>
                            {milestone.description && (
                              <p className="text-sm text-white/40 mt-1">{milestone.description}</p>
                            )}
                            {milestone.payment_amount && milestone.payment_amount > 0 && (
                              <div className="flex items-center gap-1 mt-2 text-sm text-[#23FD9E]">
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>{formatCurrency(milestone.payment_amount)}</span>
                                {milestone.is_paid && (
                                  <Badge variant="outline" className="ml-2 text-xs">Paid</Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="text-right">
                            <Badge className={isCompleted ? 'bg-[#23FD9E]/10 text-[#23FD9E]' : 'bg-amber-500/10 text-amber-400'}>
                              {isCompleted ? 'Completed' : 'Pending'}
                            </Badge>
                            {milestone.due_date && (
                              <p className={cn(
                                'text-sm mt-2',
                                !isCompleted && new Date(milestone.due_date) < new Date()
                                  ? 'text-red-400'
                                  : 'text-white/40'
                              )}>
                                Due {formatDate(milestone.due_date, 'MMM d, yyyy')}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditMilestone(milestone)}
                              className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                              title="Edit milestone"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteMilestone(milestone.id)}
                              disabled={deletingMilestoneId === milestone.id}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors"
                              title="Delete milestone"
                            >
                              {deletingMilestoneId === milestone.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'deliverables' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Deliverables</h2>
              <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openAddDeliverable}>
                Add Deliverable
              </Button>
            </div>
            {deliverablesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-[#23FD9E] animate-spin" />
              </div>
            ) : deliverables.length === 0 ? (
              <Card className="p-8 text-center">
                <Package className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Deliverables Yet</h3>
                <p className="text-white/40 text-sm mb-4">Add deliverables to track content for client review.</p>
                <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openAddDeliverable}>Create First Deliverable</Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {deliverables.map((deliverable) => {
                  const Icon = getDeliverableIcon(deliverable.type)
                  const colorClass = getDeliverableTypeColor(deliverable.type)
                  return (
                    <Card key={deliverable.id} className="p-5 group hover:border-white/10 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', colorClass)}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-medium text-white">{deliverable.title}</h4>
                            {deliverable.description && (
                              <p className="text-sm text-white/40 mt-1 line-clamp-2">{deliverable.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              <Badge className={colorClass}>
                                {deliverable.type}
                              </Badge>
                              <Badge className={
                                deliverable.status === 'approved' ? 'bg-[#23FD9E]/10 text-[#23FD9E]' :
                                deliverable.status === 'in_review' ? 'bg-amber-500/10 text-amber-400' :
                                deliverable.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                                deliverable.status === 'final' ? 'bg-violet-500/10 text-violet-400' :
                                'bg-white/5 text-white/60'
                              }>
                                {deliverable.status.replace('_', ' ')}
                              </Badge>
                              <span className="text-xs text-white/30">v{deliverable.current_version}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditDeliverable(deliverable)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                            title="Edit deliverable"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDeliverable(deliverable.id)}
                            disabled={deletingDeliverableId === deliverable.id}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors"
                            title="Delete deliverable"
                          >
                            {deletingDeliverableId === deliverable.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'financials' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Budget & Profit Dashboard</h2>
              <FinancialDashboard projectId={projectId} />
            </div>
            <div>
              <ExpenseTable projectId={projectId} />
            </div>
            <div>
              <LaborTable projectId={projectId} />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <ReimbursementTable projectId={projectId} />
              <ReturnTable projectId={projectId} />
            </div>
          </div>
        )}

        {activeTab === 'health' && (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2">
              <HealthReport
                report={report}
                history={history}
                onRunAnalysis={runAnalysis}
                analyzing={analyzing}
              />
            </div>
            <div>
              <MonitoringConfig
                settings={settings}
                onUpdate={updateSettings}
              />
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="max-w-3xl">
            <h2 className="text-lg font-semibold text-white mb-6">Activity Feed</h2>
            <ActivityFeed
              activities={activities}
              loading={activitiesLoading}
            />
          </div>
        )}
      </div>

      {/* Project AI Chat */}
      <ProjectChat
        projectId={projectId}
        projectName={project.name}
        onActionConfirmed={() => {
          // Refresh all project data when AI makes changes
          refetch()
          refetchDeliverables()
        }}
      />

      {/* Task Modal */}
      <Modal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title={editingTask ? 'Edit Task' : 'Add Task'}
      >
        <div className="space-y-4">
          <Input
            label="Title"
            value={taskForm.title}
            onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
            placeholder="Enter task title"
          />
          <Textarea
            label="Description"
            value={taskForm.description}
            onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
            placeholder="Enter task description (optional)"
            rows={3}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Priority"
              value={taskForm.priority}
              onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as Task['priority'] })}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
              ]}
            />
            <Select
              label="Status"
              value={taskForm.status}
              onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as Task['status'] })}
              options={[
                { value: 'todo', label: 'To Do' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'review', label: 'In Review' },
                { value: 'completed', label: 'Completed' },
              ]}
            />
          </div>
          <Input
            label="Due Date"
            type="date"
            value={taskForm.due_date}
            onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowTaskModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveTask}
              disabled={taskLoading || !taskForm.title.trim()}
              leftIcon={taskLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
            >
              {editingTask ? 'Save Changes' : 'Create Task'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Milestone Modal */}
      <Modal
        isOpen={showMilestoneModal}
        onClose={() => setShowMilestoneModal(false)}
        title={editingMilestone ? 'Edit Milestone' : 'Add Milestone'}
      >
        <div className="space-y-4">
          <Input
            label="Title"
            value={milestoneForm.title}
            onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
            placeholder="Enter milestone title"
          />
          <Textarea
            label="Description"
            value={milestoneForm.description}
            onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
            placeholder="Enter milestone description (optional)"
            rows={3}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Due Date"
              type="date"
              value={milestoneForm.due_date}
              onChange={(e) => setMilestoneForm({ ...milestoneForm, due_date: e.target.value })}
            />
            <Input
              label="Payment Amount"
              type="number"
              value={milestoneForm.payment_amount}
              onChange={(e) => setMilestoneForm({ ...milestoneForm, payment_amount: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowMilestoneModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveMilestone}
              disabled={milestoneLoading || !milestoneForm.title.trim()}
              leftIcon={milestoneLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
            >
              {editingMilestone ? 'Save Changes' : 'Create Milestone'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Deliverable Modal */}
      <Modal
        isOpen={showDeliverableModal}
        onClose={() => setShowDeliverableModal(false)}
        title={editingDeliverable ? 'Edit Deliverable' : 'Add Deliverable'}
      >
        <div className="space-y-4">
          <Input
            label="Title"
            value={deliverableForm.title}
            onChange={(e) => setDeliverableForm({ ...deliverableForm, title: e.target.value })}
            placeholder="Enter deliverable title"
          />
          <Textarea
            label="Description"
            value={deliverableForm.description}
            onChange={(e) => setDeliverableForm({ ...deliverableForm, description: e.target.value })}
            placeholder="Enter deliverable description (optional)"
            rows={3}
          />
          {!editingDeliverable && (
            <Select
              label="Type"
              value={deliverableForm.type}
              onChange={(e) => setDeliverableForm({ ...deliverableForm, type: e.target.value as Deliverable['type'] })}
              options={[
                { value: 'document', label: 'Document' },
                { value: 'image', label: 'Image' },
                { value: 'video', label: 'Video' },
                { value: 'audio', label: 'Audio' },
                { value: 'text', label: 'Text/Code' },
              ]}
            />
          )}
          <Input
            label="Asset URL"
            value={deliverableForm.file_url}
            onChange={(e) => setDeliverableForm({ ...deliverableForm, file_url: e.target.value })}
            placeholder="https://drive.google.com/... or file URL"
          />
          {editingDeliverable && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Draft Link URL"
                  value={deliverableForm.draft_url}
                  onChange={(e) => setDeliverableForm({ ...deliverableForm, draft_url: e.target.value })}
                  placeholder="https://..."
                />
                <Select
                  label="Draft Platform"
                  value={deliverableForm.draft_platform}
                  onChange={(e) => setDeliverableForm({ ...deliverableForm, draft_platform: e.target.value as Deliverable['draft_platform'] })}
                  options={[
                    { value: 'frame_io', label: 'Frame.io' },
                    { value: 'vimeo', label: 'Vimeo' },
                    { value: 'youtube', label: 'YouTube' },
                    { value: 'dropbox', label: 'Dropbox' },
                    { value: 'other', label: 'Other' },
                  ]}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Final Link URL"
                  value={deliverableForm.final_url}
                  onChange={(e) => setDeliverableForm({ ...deliverableForm, final_url: e.target.value })}
                  placeholder="https://..."
                />
                <Select
                  label="Final Platform"
                  value={deliverableForm.final_platform}
                  onChange={(e) => setDeliverableForm({ ...deliverableForm, final_platform: e.target.value as Deliverable['final_platform'] })}
                  options={[
                    { value: 'google_drive', label: 'Google Drive' },
                    { value: 'dropbox', label: 'Dropbox' },
                    { value: 'wetransfer', label: 'WeTransfer' },
                    { value: 's3', label: 'Amazon S3' },
                    { value: 'other', label: 'Other' },
                  ]}
                />
              </div>
              <Textarea
                label="Notes"
                value={deliverableForm.notes}
                onChange={(e) => setDeliverableForm({ ...deliverableForm, notes: e.target.value })}
                placeholder="Internal notes (optional)"
                rows={2}
              />
            </>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowDeliverableModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveDeliverable}
              disabled={deliverableLoading || !deliverableForm.title.trim()}
              leftIcon={deliverableLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
            >
              {editingDeliverable ? 'Save Changes' : 'Create Deliverable'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Project Modal */}
      <Modal
        isOpen={showEditProjectModal}
        onClose={() => setShowEditProjectModal(false)}
        title="Edit Project"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Project Name"
            value={projectForm.name}
            onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
            placeholder="Enter project name"
          />
          <Textarea
            label="Description"
            value={projectForm.description}
            onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
            placeholder="Enter project description (optional)"
            rows={3}
          />
          <Select
            label="Client"
            value={projectForm.client_id || ''}
            onChange={(e) => setProjectForm({ ...projectForm, client_id: e.target.value || null })}
            options={[
              { value: '', label: 'No Client' },
              ...clients.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              value={projectForm.status}
              onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value as Project['status'] })}
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'review', label: 'Review' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
            <Select
              label="Priority"
              value={projectForm.priority}
              onChange={(e) => setProjectForm({ ...projectForm, priority: e.target.value as Project['priority'] })}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' },
              ]}
            />
          </div>
          <Input
            label="Budget"
            type="number"
            value={projectForm.budget}
            onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })}
            placeholder="0.00"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={projectForm.start_date}
              onChange={(e) => setProjectForm({ ...projectForm, start_date: e.target.value })}
            />
            <Input
              label="Due Date"
              type="date"
              value={projectForm.due_date}
              onChange={(e) => setProjectForm({ ...projectForm, due_date: e.target.value })}
            />
          </div>
          <Input
            label="Tags"
            value={projectForm.tags}
            onChange={(e) => setProjectForm({ ...projectForm, tags: e.target.value })}
            placeholder="Comma-separated tags (e.g. design, branding)"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowEditProjectModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveProject}
              disabled={projectFormLoading || !projectForm.name.trim()}
              leftIcon={projectFormLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Project Confirmation Modal */}
      <Modal
        isOpen={showDeleteProjectModal}
        onClose={() => setShowDeleteProjectModal(false)}
        title="Delete Project"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-white/60">
            Are you sure you want to delete <span className="text-white font-medium">{project.name}</span>? This action cannot be undone. All tasks, milestones, and deliverables associated with this project will also be removed.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowDeleteProjectModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteProject}
              disabled={deleteProjectLoading}
              leftIcon={deleteProjectLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            >
              Delete Project
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
