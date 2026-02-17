'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ListTodo,
  Loader2,
  Check,
  Calendar,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout'
import { Card, Badge, Button } from '@/components/ui'
import { useAuth } from '@/hooks'
import { TaskComments } from '@/components/tasks/task-comments'
import { formatDate, getPriorityColor, cn } from '@/lib/utils'
import Link from 'next/link'

interface AssignedTask {
  id: string
  project_id: string
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'review' | 'completed'
  priority: 'low' | 'medium' | 'high'
  due_date: string | null
  created_at: string
  project: {
    id: string
    name: string
    status: string
  } | null
}

type FilterStatus = 'all' | 'active' | 'completed'

export default function MyTasksPage() {
  const { supabase, user } = useAuth()
  const [tasks, setTasks] = useState<AssignedTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('active')
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set())

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/tasks/assigned')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to fetch tasks')
      setTasks(data.tasks || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleUpdateStatus = async (taskId: string, newStatus: AssignedTask['status']) => {
    setUpdatingTaskId(taskId)
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus, ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : { completed_at: null }) })
        .eq('id', taskId)

      if (error) throw error
      await fetchTasks()
    } catch (err) {
      console.error('Error updating task:', err)
    } finally {
      setUpdatingTaskId(null)
    }
  }

  const toggleProjectCollapse = (projectId: string) => {
    setCollapsedProjects(prev => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (filterStatus === 'active') return task.status !== 'completed'
    if (filterStatus === 'completed') return task.status === 'completed'
    return true
  })

  // Group by project
  const tasksByProject = filteredTasks.reduce<Record<string, { project: AssignedTask['project']; tasks: AssignedTask[] }>>((acc, task) => {
    const key = task.project_id
    if (!acc[key]) {
      acc[key] = { project: task.project, tasks: [] }
    }
    acc[key].tasks.push(task)
    return acc
  }, {})

  // Stats
  const totalTasks = tasks.length
  const activeTasks = tasks.filter(t => t.status !== 'completed').length
  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-obsidian-400" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white mb-1">My Tasks</h1>
        <p className="text-sm text-white/40">Tasks assigned to you across all projects</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10">
                <ListTodo className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-obsidian-400">Total</p>
                <p className="text-2xl font-semibold text-white">{totalTasks}</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-obsidian-400">Active</p>
                <p className="text-2xl font-semibold text-amber-400">{activeTasks}</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-obsidian-400">Completed</p>
                <p className="text-2xl font-semibold text-emerald-400">{completedTasks}</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-obsidian-400">Overdue</p>
                <p className="text-2xl font-semibold text-red-400">{overdueTasks}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 mb-6">
        {(['active', 'all', 'completed'] as FilterStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize',
              filterStatus === status
                ? 'bg-white/10 text-white'
                : 'text-obsidian-400 hover:text-white hover:bg-white/5'
            )}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Task List Grouped by Project */}
      {error && (
        <Card className="p-8 text-center">
          <p className="text-red-400">{error}</p>
          <Button variant="ghost" className="mt-4" onClick={fetchTasks}>Retry</Button>
        </Card>
      )}

      {!error && filteredTasks.length === 0 && (
        <Card className="p-12 text-center">
          <ListTodo className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            {filterStatus === 'completed' ? 'No completed tasks' : 'No tasks assigned'}
          </h3>
          <p className="text-white/40 text-sm">
            {filterStatus === 'active'
              ? 'You have no active tasks right now. Tasks assigned to you in projects will appear here.'
              : 'Tasks assigned to you will appear here.'}
          </p>
        </Card>
      )}

      <div className="space-y-6">
        {Object.entries(tasksByProject).map(([projectId, group]) => {
          const isCollapsed = collapsedProjects.has(projectId)
          const projectActiveTasks = group.tasks.filter(t => t.status !== 'completed').length

          return (
            <motion.div
              key={projectId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                {/* Project Header */}
                <button
                  onClick={() => toggleProjectCollapse(projectId)}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/5">
                      <FolderKanban className="w-4 h-4 text-white/60" />
                    </div>
                    <div className="text-left">
                      <Link
                        href={`/projects/${projectId}?tab=tasks`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm font-medium text-white hover:text-[#23FD9E] transition-colors"
                      >
                        {group.project?.name || 'Unknown Project'}
                      </Link>
                      <p className="text-xs text-white/40">
                        {group.tasks.length} task{group.tasks.length !== 1 ? 's' : ''}
                        {projectActiveTasks > 0 && ` \u00B7 ${projectActiveTasks} active`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {group.project?.status && (
                      <Badge variant="default" className="bg-white/5 text-white/40 text-xs">
                        {group.project.status.replace('_', ' ')}
                      </Badge>
                    )}
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-white/30" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-white/30" />
                    )}
                  </div>
                </button>

                {/* Tasks */}
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-white/[0.06]">
                        {group.tasks.map((task) => (
                          <div key={task.id}>
                            <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors group">
                              {/* Completion Toggle */}
                              <button
                                onClick={() => handleUpdateStatus(task.id, task.status === 'completed' ? 'todo' : 'completed')}
                                disabled={updatingTaskId === task.id}
                                className={cn(
                                  'w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0',
                                  task.status === 'completed'
                                    ? 'bg-[#23FD9E] border-[#23FD9E]'
                                    : 'border-white/20 hover:border-[#23FD9E]/50'
                                )}
                              >
                                {updatingTaskId === task.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin text-white/40" />
                                ) : task.status === 'completed' ? (
                                  <Check className="w-3 h-3 text-[#1a1a1a]" />
                                ) : null}
                              </button>

                              {/* Task Info */}
                              <div
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                              >
                                <div className="flex items-center gap-2">
                                  <p className={cn(
                                    'text-sm font-medium truncate',
                                    task.status === 'completed' ? 'text-white/40 line-through' : 'text-white'
                                  )}>
                                    {task.title}
                                  </p>
                                  {task.description && (
                                    <MessageSquare className="w-3 h-3 text-white/20 flex-shrink-0" />
                                  )}
                                </div>
                                {task.description && expandedTaskId !== task.id && (
                                  <p className="text-xs text-white/30 truncate mt-0.5">{task.description}</p>
                                )}
                              </div>

                              {/* Meta */}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {task.due_date && (
                                  <span className={cn(
                                    'text-xs flex items-center gap-1',
                                    new Date(task.due_date) < new Date() && task.status !== 'completed'
                                      ? 'text-red-400'
                                      : 'text-white/30'
                                  )}>
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(task.due_date, 'MMM d')}
                                  </span>
                                )}
                                <Badge className={cn('text-xs', getPriorityColor(task.priority))}>
                                  {task.priority}
                                </Badge>
                                {task.status !== 'completed' && task.status !== 'todo' && (
                                  <Badge variant="default" className={cn(
                                    'text-xs',
                                    task.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'
                                  )}>
                                    {task.status === 'in_progress' ? 'In Progress' : 'Review'}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Expanded Detail */}
                            <AnimatePresence>
                              {expandedTaskId === task.id && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-4 pb-4 pl-12 space-y-4">
                                    {/* Description */}
                                    {task.description && (
                                      <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                                        <p className="text-sm text-white/60 whitespace-pre-wrap">{task.description}</p>
                                      </div>
                                    )}

                                    {/* Status Actions */}
                                    {task.status !== 'completed' && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-white/30">Move to:</span>
                                        {task.status !== 'in_progress' && (
                                          <button
                                            onClick={() => handleUpdateStatus(task.id, 'in_progress')}
                                            disabled={updatingTaskId === task.id}
                                            className="px-2.5 py-1 text-xs rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                                          >
                                            In Progress
                                          </button>
                                        )}
                                        {task.status !== 'review' && (
                                          <button
                                            onClick={() => handleUpdateStatus(task.id, 'review')}
                                            disabled={updatingTaskId === task.id}
                                            className="px-2.5 py-1 text-xs rounded-md bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                                          >
                                            Review
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleUpdateStatus(task.id, 'completed')}
                                          disabled={updatingTaskId === task.id}
                                          className="px-2.5 py-1 text-xs rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                        >
                                          Complete
                                        </button>
                                      </div>
                                    )}

                                    {/* Comments */}
                                    <div>
                                      <p className="text-xs text-white/30 mb-2">Comments</p>
                                      <TaskComments taskId={task.id} />
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Separator between tasks */}
                            <div className="mx-4 h-px bg-white/[0.04]" />
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </DashboardLayout>
  )
}
