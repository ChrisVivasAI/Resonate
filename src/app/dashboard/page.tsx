'use client'

import { motion } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FolderKanban,
  Users,
  CheckCircle2,
  ArrowUpRight,
  Sparkles,
  Clock,
  Plus,
  ArrowRight,
  Zap,
  Target,
  Loader2,
} from 'lucide-react'
import { DashboardLayout, Header } from '@/components/layout'
import { Card, CardHeader, CardTitle, CardContent, Badge, Avatar, Button } from '@/components/ui'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import Link from 'next/link'
import { useDashboardStats, useAuth } from '@/hooks'

const aiActivity = [
  { id: '1', type: 'image', prompt: 'Modern logo with abstract shapes', time: '2 hours ago', credits: 2 },
  { id: '2', type: 'text', prompt: 'Product description for wellness app', time: '4 hours ago', credits: 1 },
  { id: '3', type: 'image', prompt: 'Hero banner for e-commerce site', time: '1 day ago', credits: 2 },
]

export default function DashboardPage() {
  const { profile, loading: authLoading } = useAuth()
  const { stats, recentProjects, recentPayments, loading, error } = useDashboardStats()

  const userName = profile?.full_name?.split(' ')[0] || profile?.email?.split('@')[0] || 'there'

  const dashboardStats = [
    {
      name: 'REVENUE',
      value: formatCurrency(stats.totalRevenue),
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      description: 'vs last month',
      accent: true,
    },
    {
      name: 'PROJECTS',
      value: stats.activeProjects.toString(),
      change: '+3',
      trend: 'up',
      icon: FolderKanban,
      description: 'in progress',
      accent: false,
    },
    {
      name: 'CLIENTS',
      value: stats.totalClients.toString(),
      change: '+2',
      trend: 'up',
      icon: Users,
      description: 'total',
      accent: false,
    },
    {
      name: 'COMPLETED',
      value: stats.completedThisMonth.toString(),
      change: '+' + stats.completedThisMonth,
      trend: 'up',
      icon: CheckCircle2,
      description: 'this month',
      accent: false,
    },
  ]

  if (loading || authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-resonate-400 animate-spin" />
            <p className="text-charcoal-500 text-sm">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Custom Header */}
      <div className="px-8 pt-8 pb-2">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-end justify-between"
        >
          <div>
            <p className="text-[10px] text-charcoal-500 uppercase tracking-[0.2em] mb-2">Dashboard</p>
            <h1 className="font-display text-3xl text-white tracking-tight">
              Welcome back, {userName}
            </h1>
            <p className="text-charcoal-500 mt-1">Here's what's happening with your agency.</p>
          </div>
          <Link href="/projects/new">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg text-white text-sm tracking-wide transition-all duration-300"
            >
              <Plus className="w-4 h-4" />
              New Project
            </motion.button>
          </Link>
        </motion.div>
      </div>

      <div className="p-8 pt-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {dashboardStats.map((stat, index) => (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className={`relative p-5 rounded-lg backdrop-blur-sm transition-all duration-300 group hover:bg-white/[0.04] ${
                stat.accent
                  ? 'bg-resonate-400/[0.03] border border-resonate-400/10'
                  : 'bg-white/[0.02] border border-white/[0.06]'
              }`}>
                {/* Subtle top accent line for highlighted stat */}
                {stat.accent && (
                  <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-resonate-400/50 to-transparent" />
                )}

                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] text-charcoal-500 uppercase tracking-[0.15em] mb-3">{stat.name}</p>
                    <p className={`text-2xl font-medium tracking-tight ${stat.accent ? 'text-white' : 'text-white'}`}>
                      {stat.value}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`inline-flex items-center gap-1 text-xs ${
                        stat.trend === 'up' ? 'text-resonate-400' : 'text-red-400'
                      }`}>
                        {stat.trend === 'up' ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {stat.change}
                      </span>
                      <span className="text-[10px] text-charcoal-600">{stat.description}</span>
                    </div>
                  </div>
                  <div className={`p-2.5 rounded-md transition-colors duration-300 ${
                    stat.accent
                      ? 'bg-resonate-400/10 group-hover:bg-resonate-400/20'
                      : 'bg-white/[0.04] group-hover:bg-white/[0.08]'
                  }`}>
                    <stat.icon className={`w-5 h-5 ${stat.accent ? 'text-resonate-400' : 'text-charcoal-500'}`} />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Projects */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="lg:col-span-2"
          >
            <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg border border-white/[0.06] overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-white/[0.04]">
                    <Target className="w-4 h-4 text-charcoal-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white tracking-wide">Active Projects</h3>
                    <p className="text-[10px] text-charcoal-500 uppercase tracking-[0.1em] mt-0.5">{recentProjects.length} in progress</p>
                  </div>
                </div>
                <Link href="/projects">
                  <button className="flex items-center gap-1.5 text-xs text-charcoal-500 hover:text-white transition-colors">
                    View All
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </Link>
              </div>

              {recentProjects.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-charcoal-500 text-sm">No active projects yet.</p>
                  <Link href="/projects/new">
                    <Button variant="secondary" size="sm" className="mt-4">
                      Create Project
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {recentProjects.map((project, index) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.5 + index * 0.08 }}
                    >
                      <Link
                        href={`/projects/${project.id}`}
                        className="block p-5 hover:bg-white/[0.02] transition-colors group"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="text-sm font-medium text-white group-hover:text-resonate-400 transition-colors">
                              {project.name}
                            </h4>
                            <p className="text-xs text-charcoal-500 mt-0.5">{project.client?.name || 'No client'}</p>
                          </div>
                          <span className={`px-2 py-0.5 text-[9px] uppercase tracking-[0.1em] rounded ${
                            project.status === 'review'
                              ? 'text-amber-400 bg-amber-400/10 border border-amber-400/20'
                              : project.status === 'completed'
                              ? 'text-resonate-400 bg-resonate-400/10 border border-resonate-400/20'
                              : 'text-charcoal-400 bg-white/[0.04] border border-white/[0.08]'
                          }`}>
                            {project.status.replace('_', ' ')}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-[10px] mb-1.5">
                            <span className="text-charcoal-500 uppercase tracking-[0.1em]">Progress</span>
                            <span className="text-white">{project.progress}%</span>
                          </div>
                          <div className="h-1 bg-charcoal-800/50 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${project.progress}%` }}
                              transition={{ duration: 0.8, delay: 0.6 + index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                              className={`h-full rounded-full ${
                                project.progress >= 90
                                  ? 'bg-resonate-400'
                                  : project.progress >= 50
                                  ? 'bg-gradient-to-r from-resonate-500 to-resonate-400'
                                  : 'bg-charcoal-500'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Footer info */}
                        <div className="flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-1.5 text-charcoal-500">
                            <Clock className="w-3 h-3" />
                            <span>{project.due_date ? `Due ${formatRelativeTime(project.due_date)}` : 'No due date'}</span>
                          </div>
                          <div className="text-charcoal-500">
                            <span className="text-white">{formatCurrency(project.spent)}</span>
                            <span> / {formatCurrency(project.budget)}</span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Recent Payments */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg border border-white/[0.06] overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-md bg-resonate-400/10">
                      <DollarSign className="w-3.5 h-3.5 text-resonate-400" />
                    </div>
                    <span className="text-xs font-medium text-white tracking-wide">Payments</span>
                  </div>
                  <Link href="/payments" className="text-[10px] text-charcoal-500 hover:text-white transition-colors uppercase tracking-[0.1em]">
                    All
                  </Link>
                </div>
                {recentPayments.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-charcoal-500 text-xs">No payments yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.04]">
                    {recentPayments.slice(0, 3).map((payment, index) => (
                      <motion.div
                        key={payment.id}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.6 + index * 0.08 }}
                        className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md bg-charcoal-800 flex items-center justify-center text-xs font-medium text-white">
                            {(payment.client?.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-white">{payment.client?.name || 'Unknown'}</p>
                            <p className="text-[10px] text-charcoal-500">{new Date(payment.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-white">{formatCurrency(payment.amount)}</p>
                          <span className={`text-[9px] uppercase tracking-[0.1em] ${
                            payment.status === 'succeeded' ? 'text-resonate-400' : 'text-amber-400'
                          }`}>
                            {payment.status}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* AI Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <div className="relative bg-white/[0.02] backdrop-blur-sm rounded-lg border border-resonate-400/20 overflow-hidden">
                {/* Subtle glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-resonate-400/[0.03] to-transparent pointer-events-none" />

                <div className="relative flex items-center justify-between p-4 border-b border-resonate-400/10">
                  <div className="flex items-center gap-2.5">
                    <div className="relative p-1.5 rounded-md bg-resonate-400/10">
                      <Sparkles className="w-3.5 h-3.5 text-resonate-400" />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-white tracking-wide">AI Studio</span>
                      <p className="text-[9px] text-charcoal-500 uppercase tracking-[0.1em]">Recent activity</p>
                    </div>
                  </div>
                  <Link href="/ai-studio" className="text-[10px] text-resonate-400 hover:text-resonate-300 transition-colors uppercase tracking-[0.1em]">
                    Open
                  </Link>
                </div>

                <div className="relative p-3 space-y-2">
                  {aiActivity.map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.7 + index * 0.08 }}
                      className="p-3 rounded-md bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer group border border-transparent hover:border-white/[0.06]"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[9px] uppercase tracking-[0.1em] ${
                          activity.type === 'image' ? 'text-resonate-400' : 'text-charcoal-400'
                        }`}>
                          {activity.type}
                        </span>
                        <div className="flex items-center gap-1 text-[9px] text-charcoal-600">
                          <Zap className="w-2.5 h-2.5" />
                          <span>{activity.credits}</span>
                        </div>
                      </div>
                      <p className="text-xs text-charcoal-400 group-hover:text-charcoal-200 transition-colors line-clamp-1">
                        {activity.prompt}
                      </p>
                      <p className="text-[9px] text-charcoal-600 mt-1">{activity.time}</p>
                    </motion.div>
                  ))}

                  <Link href="/ai-studio" className="block mt-3">
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-resonate-400/10 hover:bg-resonate-400/20 border border-resonate-400/20 rounded-md text-resonate-400 text-xs tracking-wide transition-all duration-300"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Open AI Studio
                    </motion.button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
