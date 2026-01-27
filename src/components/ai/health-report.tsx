'use client'

import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import {
  Clock,
  CheckSquare,
  Flag,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  Calendar,
  TrendingUp,
} from 'lucide-react'
import { HealthScoreCard } from './health-score-card'
import { cn } from '@/lib/utils'
import type { ProjectHealthReport, HealthAnalysis } from '@/types'

interface HealthReportProps {
  report: ProjectHealthReport | null
  history?: { health_score: number; status: string; created_at: string }[]
  onRunAnalysis?: () => void
  analyzing?: boolean
}

export function HealthReport({
  report,
  history = [],
  onRunAnalysis,
  analyzing = false,
}: HealthReportProps) {
  if (!report) {
    return (
      <div className="bg-[#2B2B2B]/40 border border-white/10 rounded-xl p-8 text-center">
        <AlertTriangle className="w-8 h-8 text-white/20 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-white mb-2">No Health Data</h3>
        <p className="text-sm text-white/40 mb-4">
          Run an analysis to get insights about this project's health.
        </p>
        {onRunAnalysis && (
          <button
            onClick={onRunAnalysis}
            disabled={analyzing}
            className="px-4 py-2 rounded-lg bg-[#23FD9E] text-[#1a1a1a] font-medium hover:bg-[#1ed189] transition-colors disabled:opacity-50"
          >
            {analyzing ? 'Analyzing...' : 'Run Analysis'}
          </button>
        )}
      </div>
    )
  }

  const previousScore = history.length > 1 ? history[1].health_score : undefined
  const analysis = report.analysis as HealthAnalysis

  return (
    <div className="space-y-6">
      {/* Score Card */}
      <HealthScoreCard
        score={report.health_score}
        status={report.status}
        previousScore={previousScore}
        lastChecked={report.created_at}
        onRunAnalysis={onRunAnalysis}
        analyzing={analyzing}
      />

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#2B2B2B]/40 border border-white/10 rounded-xl p-5"
      >
        <h4 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-3">
          Summary
        </h4>
        <p className="text-white/80">{report.summary}</p>
      </motion.div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Clock}
          label="Timeline"
          score={analysis.timeline.score}
          detail={
            analysis.timeline.is_overdue
              ? 'Overdue'
              : analysis.timeline.days_until_due !== undefined
              ? `${analysis.timeline.days_until_due} days left`
              : 'No deadline'
          }
          issues={analysis.timeline.issues}
          delay={0.15}
        />
        <MetricCard
          icon={CheckSquare}
          label="Tasks"
          score={analysis.tasks.score}
          detail={`${analysis.tasks.completed}/${analysis.tasks.total} complete`}
          issues={analysis.tasks.overdue > 0 ? [`${analysis.tasks.overdue} overdue`] : []}
          delay={0.2}
        />
        <MetricCard
          icon={Flag}
          label="Milestones"
          score={analysis.milestones.score}
          detail={`${analysis.milestones.completed}/${analysis.milestones.total} reached`}
          issues={analysis.milestones.overdue > 0 ? [`${analysis.milestones.overdue} overdue`] : []}
          delay={0.25}
        />
        <MetricCard
          icon={TrendingUp}
          label="Completion"
          score={analysis.tasks.completion_rate}
          detail={`${analysis.tasks.completion_rate}% done`}
          issues={[]}
          delay={0.3}
        />
      </div>

      {/* Recommendations */}
      {report.recommendations && report.recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-[#2B2B2B]/40 border border-white/10 rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            <h4 className="text-sm font-medium text-white/60 uppercase tracking-wider">
              AI Recommendations
            </h4>
          </div>
          <ul className="space-y-3">
            {report.recommendations.map((rec, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.05 }}
                className="flex items-start gap-3 text-sm"
              >
                <ArrowRight className="w-4 h-4 text-[#23FD9E] mt-0.5 flex-shrink-0" />
                <span className="text-white/70">{rec}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Predicted Completion */}
      {(report as any).predictedCompletion && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <p className="text-xs text-violet-400/80 uppercase tracking-wider">
              Predicted Completion
            </p>
            <p className="text-lg font-semibold text-violet-400">
              {(report as any).predictedCompletion === 'Completed'
                ? 'Completed'
                : new Date((report as any).predictedCompletion).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
            </p>
            {(report as any).velocity && (
              <p className="text-xs text-violet-400/60">
                Based on velocity of {(report as any).velocity} tasks/week
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* History Trend */}
      {history.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="bg-[#2B2B2B]/40 border border-white/10 rounded-xl p-5"
        >
          <h4 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">
            Health Trend
          </h4>
          <div className="flex items-end gap-2 h-20">
            {history.slice(0, 10).reverse().map((h, index) => {
              const height = (h.health_score / 100) * 100
              const isLatest = index === history.slice(0, 10).length - 1
              return (
                <div
                  key={index}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ delay: 0.6 + index * 0.05, duration: 0.5 }}
                    className={cn(
                      'w-full rounded-t-sm min-h-[4px]',
                      h.status === 'healthy' ? 'bg-[#23FD9E]' :
                      h.status === 'at_risk' ? 'bg-amber-400' : 'bg-red-400',
                      isLatest && 'ring-2 ring-white/20'
                    )}
                    title={`${h.health_score}% - ${formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}`}
                  />
                </div>
              )
            })}
          </div>
          <div className="flex justify-between text-xs text-white/30 mt-2">
            <span>Oldest</span>
            <span>Latest</span>
          </div>
        </motion.div>
      )}
    </div>
  )
}

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  score: number
  detail: string
  issues: string[]
  delay: number
}

function MetricCard({ icon: Icon, label, score, detail, issues, delay }: MetricCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-[#23FD9E]'
    if (score >= 40) return 'text-amber-400'
    return 'text-red-400'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-[#2B2B2B]/40 border border-white/10 rounded-xl p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-white/40" />
        <span className="text-xs text-white/40 uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn('text-2xl font-bold mb-1', getScoreColor(score))}>
        {score}
      </p>
      <p className="text-sm text-white/60">{detail}</p>
      {issues.length > 0 && (
        <p className="text-xs text-red-400/80 mt-2 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          {issues[0]}
        </p>
      )}
    </motion.div>
  )
}
