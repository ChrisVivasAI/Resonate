import { generateText, GEMINI_MODELS } from './gemini'
import type { Project, Task, Milestone, HealthAnalysis, HealthStatus } from '@/types'

export interface ProjectHealthInput {
  project: Project
  tasks: Task[]
  milestones?: Milestone[]
}

export interface HealthReport {
  score: number
  status: HealthStatus
  summary: string
  analysis: HealthAnalysis
  recommendations: string[]
  nextActions: string[]
  predictedCompletion?: string
  velocity?: number
}

export interface TaskSuggestion {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  estimatedDuration?: string
}

/**
 * Calculate the raw health metrics from project data
 */
function calculateMetrics(input: ProjectHealthInput): HealthAnalysis {
  const { project, tasks, milestones = [] } = input
  const now = new Date()
  const dueDate = project.due_date ? new Date(project.due_date) : null
  const startDate = project.start_date ? new Date(project.start_date) : null

  // Timeline analysis
  const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null
  const isOverdue = dueDate ? dueDate < now : false
  const totalDuration = startDate && dueDate ? Math.ceil((dueDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : null
  const daysElapsed = startDate ? Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : null
  const timeProgressPercent = totalDuration && daysElapsed ? Math.min(100, (daysElapsed / totalDuration) * 100) : null

  // Task analysis
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length
  const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  // Overdue tasks
  const overdueTasks = tasks.filter(t => {
    if (t.status === 'completed') return false
    if (!t.due_date) return false
    return new Date(t.due_date) < now
  }).length

  // Milestone analysis
  const totalMilestones = milestones.length
  const completedMilestones = milestones.filter(m => m.completed_at).length
  const overdueMilestones = milestones.filter(m => {
    if (m.completed_at) return false
    return new Date(m.due_date) < now
  }).length

  // Calculate individual scores (0-100)
  let timelineScore = 100
  let timelineIssues: string[] = []

  if (isOverdue) {
    timelineScore = Math.max(0, 30 - Math.abs(daysUntilDue || 0) * 2)
    timelineIssues.push(`Project is ${Math.abs(daysUntilDue || 0)} days overdue`)
  } else if (daysUntilDue !== null) {
    if (daysUntilDue <= 3 && project.progress < 90) {
      timelineScore = 40
      timelineIssues.push('Less than 3 days until deadline with low completion')
    } else if (daysUntilDue <= 7 && project.progress < 70) {
      timelineScore = 55
      timelineIssues.push('Less than a week until deadline, progress behind schedule')
    } else if (timeProgressPercent && taskCompletionRate < timeProgressPercent - 20) {
      timelineScore = 65
      timelineIssues.push('Task completion lagging behind timeline')
    }
  }

  let taskScore = 100
  let taskIssues: string[] = []

  if (totalTasks === 0) {
    taskScore = 50
    taskIssues.push('No tasks defined for this project')
  } else {
    // Penalize for overdue tasks
    if (overdueTasks > 0) {
      taskScore -= overdueTasks * 10
      taskIssues.push(`${overdueTasks} task${overdueTasks > 1 ? 's' : ''} overdue`)
    }
    // Penalize for low completion near deadline
    if (daysUntilDue !== null && daysUntilDue <= 14 && taskCompletionRate < 50) {
      taskScore -= 20
      taskIssues.push('Less than half of tasks completed with deadline approaching')
    }
    // Reward for good progress
    if (taskCompletionRate >= 80) {
      taskScore = Math.min(100, taskScore + 10)
    }
  }
  taskScore = Math.max(0, taskScore)

  let milestoneScore = 100
  if (totalMilestones > 0) {
    if (overdueMilestones > 0) {
      milestoneScore = Math.max(0, 100 - (overdueMilestones / totalMilestones) * 50)
    }
    const milestoneCompletionRate = (completedMilestones / totalMilestones) * 100
    if (timeProgressPercent && milestoneCompletionRate < timeProgressPercent - 30) {
      milestoneScore = Math.max(0, milestoneScore - 20)
    }
  }

  // Quote utilization score
  const budgetScore = 100
  const budgetUtilization = project.budget > 0 ? (project.spent / project.budget) * 100 : 0

  return {
    timeline: {
      score: Math.round(timelineScore),
      issues: timelineIssues,
      days_until_due: daysUntilDue ?? undefined,
      is_overdue: isOverdue,
    },
    budget: {
      score: budgetScore,
      issues: [],
      utilization: Math.round(budgetUtilization),
      remaining: project.budget - project.spent,
    },
    tasks: {
      score: Math.round(taskScore),
      completion_rate: Math.round(taskCompletionRate),
      total: totalTasks,
      completed: completedTasks,
      overdue: overdueTasks,
    },
    milestones: {
      score: Math.round(milestoneScore),
      total: totalMilestones,
      completed: completedMilestones,
      overdue: overdueMilestones,
    },
  }
}

/**
 * Calculate overall health score from analysis
 */
function calculateOverallScore(analysis: HealthAnalysis): { score: number; status: HealthStatus } {
  // Weighted average: timeline (40%), tasks (45%), milestones (15%)
  // Budget excluded for now as per requirements
  const weights = { timeline: 0.4, tasks: 0.45, milestones: 0.15 }

  const score = Math.round(
    analysis.timeline.score * weights.timeline +
    analysis.tasks.score * weights.tasks +
    analysis.milestones.score * weights.milestones
  )

  let status: HealthStatus = 'healthy'
  if (score < 40) {
    status = 'critical'
  } else if (score < 70) {
    status = 'at_risk'
  }

  return { score, status }
}

/**
 * Calculate project velocity (tasks completed per week)
 */
function calculateVelocity(tasks: Task[]): number {
  const completedTasks = tasks.filter(t => t.status === 'completed' && t.completed_at)
  if (completedTasks.length < 2) return 0

  // Sort by completion date
  const sorted = completedTasks.sort((a, b) =>
    new Date(a.completed_at!).getTime() - new Date(b.completed_at!).getTime()
  )

  const firstCompletion = new Date(sorted[0].completed_at!)
  const lastCompletion = new Date(sorted[sorted.length - 1].completed_at!)
  const weeksBetween = Math.max(1, (lastCompletion.getTime() - firstCompletion.getTime()) / (1000 * 60 * 60 * 24 * 7))

  return Math.round((completedTasks.length / weeksBetween) * 10) / 10
}

/**
 * Predict completion date based on velocity
 */
function predictCompletionDate(tasks: Task[], velocity: number): string | undefined {
  if (velocity <= 0) return undefined

  const remainingTasks = tasks.filter(t => t.status !== 'completed').length
  if (remainingTasks === 0) return 'Completed'

  const weeksToComplete = remainingTasks / velocity
  const completionDate = new Date()
  completionDate.setDate(completionDate.getDate() + Math.ceil(weeksToComplete * 7))

  return completionDate.toISOString().split('T')[0]
}

/**
 * Generate AI-powered recommendations based on project analysis
 */
async function generateAIRecommendations(
  input: ProjectHealthInput,
  analysis: HealthAnalysis,
  score: number,
  status: HealthStatus
): Promise<{ summary: string; recommendations: string[]; nextActions: string[] }> {
  const { project, tasks, milestones = [] } = input

  const completedTaskNames = tasks.filter(t => t.status === 'completed').map(t => t.title).slice(0, 5)
  const pendingTaskNames = tasks.filter(t => t.status !== 'completed').map(t => t.title).slice(0, 5)
  const overdueTaskNames = tasks.filter(t => {
    if (t.status === 'completed') return false
    if (!t.due_date) return false
    return new Date(t.due_date) < new Date()
  }).map(t => t.title)

  const prompt = `You are a project management AI assistant. Analyze this project and provide actionable insights.

PROJECT DETAILS:
- Name: ${project.name}
- Description: ${project.description || 'No description'}
- Status: ${project.status}
- Progress: ${project.progress}%
- Due Date: ${project.due_date || 'Not set'}
- Days Until Due: ${analysis.timeline.days_until_due ?? 'N/A'}
- Is Overdue: ${analysis.timeline.is_overdue ? 'Yes' : 'No'}

TASK METRICS:
- Total Tasks: ${analysis.tasks.total}
- Completed: ${analysis.tasks.completed}
- Completion Rate: ${analysis.tasks.completion_rate}%
- Overdue Tasks: ${analysis.tasks.overdue}
- Recently Completed: ${completedTaskNames.join(', ') || 'None'}
- Pending Tasks: ${pendingTaskNames.join(', ') || 'None'}
- Overdue Task Names: ${overdueTaskNames.join(', ') || 'None'}

MILESTONES:
- Total: ${analysis.milestones.total}
- Completed: ${analysis.milestones.completed}
- Overdue: ${analysis.milestones.overdue}

HEALTH STATUS:
- Overall Score: ${score}/100
- Status: ${status}
- Timeline Score: ${analysis.timeline.score}
- Task Score: ${analysis.tasks.score}
- Timeline Issues: ${analysis.timeline.issues.join('; ') || 'None'}

Based on this analysis, provide:
1. A brief 1-2 sentence summary of the project's current state
2. 3-5 specific, actionable recommendations to improve the project health
3. 2-3 immediate next actions the team should take

Format your response as JSON:
{
  "summary": "Brief summary of project state",
  "recommendations": ["recommendation 1", "recommendation 2", ...],
  "nextActions": ["action 1", "action 2", ...]
}

Be specific and practical. Reference actual task names and dates when relevant.`

  try {
    const response = await generateText(prompt, {
      model: GEMINI_MODELS.PRO,
      temperature: 0.3,
      maxTokens: 1024,
      systemPrompt: 'You are an expert project manager AI. Always respond with valid JSON only, no markdown or extra text.',
    })

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        summary: parsed.summary || 'Unable to generate summary',
        recommendations: parsed.recommendations || [],
        nextActions: parsed.nextActions || [],
      }
    }
  } catch (error) {
    console.error('AI recommendations error:', error)
  }

  // Fallback to rule-based recommendations
  return generateFallbackRecommendations(analysis, status)
}

/**
 * Fallback recommendations when AI fails
 */
function generateFallbackRecommendations(
  analysis: HealthAnalysis,
  status: HealthStatus
): { summary: string; recommendations: string[]; nextActions: string[] } {
  const recommendations: string[] = []
  const nextActions: string[] = []
  let summary = ''

  if (status === 'critical') {
    summary = 'This project requires immediate attention due to significant timeline and task completion issues.'
  } else if (status === 'at_risk') {
    summary = 'This project has some areas of concern that should be addressed to stay on track.'
  } else {
    summary = 'This project is progressing well and is on track for completion.'
  }

  if (analysis.timeline.is_overdue) {
    recommendations.push('Review and update the project deadline with stakeholders')
    nextActions.push('Schedule a meeting to discuss timeline adjustments')
  }

  if (analysis.tasks.overdue > 0) {
    recommendations.push(`Address the ${analysis.tasks.overdue} overdue task(s) immediately`)
    nextActions.push('Prioritize and reassign overdue tasks')
  }

  if (analysis.tasks.completion_rate < 50 && analysis.timeline.days_until_due && analysis.timeline.days_until_due < 14) {
    recommendations.push('Consider reducing scope or extending deadline - current pace may not meet deadline')
  }

  if (analysis.tasks.total === 0) {
    recommendations.push('Break down the project into specific tasks to better track progress')
    nextActions.push('Create at least 5-10 tasks for the project')
  }

  if (analysis.milestones.overdue > 0) {
    recommendations.push('Review overdue milestones and update their deadlines if needed')
  }

  if (recommendations.length === 0) {
    recommendations.push('Continue with current pace - project is on track')
    recommendations.push('Consider documenting lessons learned for future projects')
  }

  if (nextActions.length === 0) {
    nextActions.push('Review upcoming tasks and ensure they are properly assigned')
    nextActions.push('Update project progress if there are recent completions')
  }

  return { summary, recommendations, nextActions }
}

/**
 * Main function to analyze project health
 */
export async function analyzeProjectHealth(input: ProjectHealthInput): Promise<HealthReport> {
  const analysis = calculateMetrics(input)
  const { score, status } = calculateOverallScore(analysis)
  const velocity = calculateVelocity(input.tasks)
  const predictedCompletion = predictCompletionDate(input.tasks, velocity)

  const { summary, recommendations, nextActions } = await generateAIRecommendations(
    input,
    analysis,
    score,
    status
  )

  return {
    score,
    status,
    summary,
    analysis,
    recommendations,
    nextActions,
    predictedCompletion,
    velocity: velocity > 0 ? velocity : undefined,
  }
}

/**
 * Generate task breakdown suggestions for a project
 */
export async function suggestTaskBreakdown(
  projectName: string,
  projectDescription: string,
  existingTasks: string[] = []
): Promise<TaskSuggestion[]> {
  const prompt = `You are a project management AI. Break down this project into specific, actionable tasks.

PROJECT: ${projectName}
DESCRIPTION: ${projectDescription || 'No description provided'}
EXISTING TASKS: ${existingTasks.length > 0 ? existingTasks.join(', ') : 'None'}

Generate 5-8 new tasks that would help complete this project. Don't duplicate existing tasks.

Format your response as JSON array:
[
  {
    "title": "Task title",
    "description": "Brief description of what needs to be done",
    "priority": "low" | "medium" | "high",
    "estimatedDuration": "e.g., 2 hours, 1 day, 1 week"
  }
]

Tasks should be specific, measurable, and achievable. Order them by suggested execution sequence.`

  try {
    const response = await generateText(prompt, {
      model: GEMINI_MODELS.PRO,
      temperature: 0.5,
      maxTokens: 2048,
      systemPrompt: 'You are an expert project manager. Always respond with valid JSON array only.',
    })

    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (error) {
    console.error('Task suggestion error:', error)
  }

  return []
}

/**
 * Generate a status update summary
 */
export async function generateStatusSummary(input: ProjectHealthInput): Promise<string> {
  const { project, tasks, milestones = [] } = input

  const recentlyCompleted = tasks
    .filter(t => t.status === 'completed' && t.completed_at)
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())
    .slice(0, 3)
    .map(t => t.title)

  const inProgress = tasks
    .filter(t => t.status === 'in_progress')
    .map(t => t.title)
    .slice(0, 3)

  const upcomingMilestones = milestones
    .filter(m => !m.completed_at)
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 2)
    .map(m => `${m.title} (due ${new Date(m.due_date).toLocaleDateString()})`)

  const prompt = `Generate a brief project status update (2-3 sentences) for stakeholders.

PROJECT: ${project.name}
PROGRESS: ${project.progress}%
STATUS: ${project.status}
DUE DATE: ${project.due_date || 'Not set'}

RECENTLY COMPLETED:
${recentlyCompleted.length > 0 ? recentlyCompleted.map(t => `- ${t}`).join('\n') : '- No recent completions'}

IN PROGRESS:
${inProgress.length > 0 ? inProgress.map(t => `- ${t}`).join('\n') : '- No tasks in progress'}

UPCOMING MILESTONES:
${upcomingMilestones.length > 0 ? upcomingMilestones.map(m => `- ${m}`).join('\n') : '- No upcoming milestones'}

Write a concise, professional status update that highlights progress and any key points. Do not use markdown formatting.`

  try {
    const response = await generateText(prompt, {
      model: GEMINI_MODELS.FLASH,
      temperature: 0.4,
      maxTokens: 256,
    })
    return response.trim()
  } catch (error) {
    console.error('Status summary error:', error)
    return `Project is at ${project.progress}% completion. ${recentlyCompleted.length > 0 ? `Recently completed: ${recentlyCompleted.join(', ')}.` : ''} ${inProgress.length > 0 ? `Currently working on: ${inProgress.join(', ')}.` : ''}`
  }
}

/**
 * Determine if an alert should be sent to the client
 */
export function shouldAlertClient(
  previousStatus: HealthStatus | null,
  currentStatus: HealthStatus,
  analysis: HealthAnalysis
): { shouldAlert: boolean; reason?: string } {
  // Alert client when status improves to healthy (good news)
  if (previousStatus && previousStatus !== 'healthy' && currentStatus === 'healthy') {
    return { shouldAlert: true, reason: 'Project health has improved and is now on track' }
  }

  // Alert client when a major milestone is reached
  if (analysis.milestones.completed > 0 && analysis.milestones.completed === analysis.milestones.total) {
    return { shouldAlert: true, reason: 'All project milestones have been completed' }
  }

  // Alert client when project is nearly complete
  if (analysis.tasks.completion_rate >= 90 && analysis.tasks.completion_rate < 100) {
    return { shouldAlert: true, reason: 'Project is nearly complete (90%+ tasks done)' }
  }

  return { shouldAlert: false }
}
