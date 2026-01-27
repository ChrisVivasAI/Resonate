import { createClient } from '@/lib/supabase/server'

// =====================================================
// TYPES
// =====================================================

export interface HistoricalProject {
  id: string
  name: string
  budget: number
  actual_cost: number
  duration_days: number | null
  tags: string[]
  labor_breakdown: Array<{
    role: string
    total_hours: number
    total_cost: number
  }>
  expense_breakdown: Array<{
    category: string
    total_amount: number
  }>
}

export interface LaborPattern {
  role: string
  avg_hourly_rate: number
  min_rate: number
  max_rate: number
  avg_hours_per_project: number
  frequency: number
}

export interface ExpensePattern {
  category: string
  avg_amount: number
  min_amount: number
  max_amount: number
  frequency: number
}

export interface TimelinePattern {
  avg_duration_days: number
  min_duration_days: number
  max_duration_days: number
  phases: Array<{
    name: string
    avg_days: number
    percent_of_total: number
  }>
}

export interface BudgetPattern {
  avg_budget: number
  avg_actual_cost: number
  avg_margin_percent: number
  labor_percent: number
  expenses_percent: number
  contingency_percent: number
}

export interface HistoricalAnalysis {
  similar_projects: HistoricalProject[]
  labor_patterns: LaborPattern[]
  expense_patterns: ExpensePattern[]
  timeline_pattern: TimelinePattern
  budget_pattern: BudgetPattern
  confidence: 'high' | 'medium' | 'low'
  sample_size: number
}

export interface ProjectGenerationSuggestion {
  suggested_budget: {
    total: number
    labor: number
    expenses: number
    contingency: number
    confidence: 'high' | 'medium' | 'low'
    based_on: number
  }
  suggested_timeline: {
    duration_days: number
    phases: Array<{
      name: string
      duration_days: number
    }>
  }
  suggested_team: Array<{
    role: string
    hourly_rate: number
    estimated_hours: number
  }>
  historical_reference: {
    similar_projects: Array<{
      id: string
      name: string
      budget: number
      actual_cost: number
      duration_days: number | null
    }>
    average_budget: number
    average_duration: number
    average_margin: number
  }
}

// =====================================================
// HISTORICAL ANALYSIS
// =====================================================

export async function analyzeHistoricalProjects(
  userId: string,
  options: {
    project_type?: string
    budget_min?: number
    budget_max?: number
    tags?: string[]
    limit?: number
  } = {}
): Promise<HistoricalAnalysis> {
  const supabase = await createClient()
  const limit = options.limit || 20

  // Build query for completed projects
  let query = supabase
    .from('projects')
    .select(`
      id,
      name,
      budget,
      start_date,
      due_date,
      completed_at,
      tags,
      expenses:expenses(id, category, cost_pre_tax),
      labor:labor_entries(id, role, hourly_rate, actual_hours)
    `)
    .eq('status', 'completed')
    .limit(limit)

  if (options.budget_min !== undefined) {
    query = query.gte('budget', options.budget_min)
  }
  if (options.budget_max !== undefined) {
    query = query.lte('budget', options.budget_max)
  }
  if (options.tags && options.tags.length > 0) {
    query = query.overlaps('tags', options.tags)
  }

  const { data: projects, error } = await query

  if (error || !projects) {
    return createEmptyAnalysis()
  }

  // Process projects
  const historicalProjects: HistoricalProject[] = projects.map(p => {
    const expenses = p.expenses || []
    const labor = p.labor || []

    const totalExpenses = expenses.reduce((sum: number, e: { cost_pre_tax: number }) => sum + (e.cost_pre_tax || 0), 0)
    const totalLabor = labor.reduce((sum: number, l: { hourly_rate: number; actual_hours: number }) =>
      sum + (l.hourly_rate || 0) * (l.actual_hours || 0), 0)

    // Calculate duration
    let durationDays: number | null = null
    if (p.start_date && p.completed_at) {
      durationDays = Math.ceil(
        (new Date(p.completed_at).getTime() - new Date(p.start_date).getTime()) / (1000 * 60 * 60 * 24)
      )
    }

    // Group labor by role
    const laborByRole = new Map<string, { total_hours: number; total_cost: number }>()
    for (const l of labor as Array<{ role: string; hourly_rate: number; actual_hours: number }>) {
      const existing = laborByRole.get(l.role) || { total_hours: 0, total_cost: 0 }
      existing.total_hours += l.actual_hours || 0
      existing.total_cost += (l.hourly_rate || 0) * (l.actual_hours || 0)
      laborByRole.set(l.role, existing)
    }

    // Group expenses by category
    const expensesByCategory = new Map<string, number>()
    for (const e of expenses as Array<{ category: string; cost_pre_tax: number }>) {
      const existing = expensesByCategory.get(e.category) || 0
      expensesByCategory.set(e.category, existing + (e.cost_pre_tax || 0))
    }

    return {
      id: p.id,
      name: p.name,
      budget: p.budget || 0,
      actual_cost: totalExpenses + totalLabor,
      duration_days: durationDays,
      tags: p.tags || [],
      labor_breakdown: Array.from(laborByRole.entries()).map(([role, data]) => ({
        role,
        total_hours: data.total_hours,
        total_cost: data.total_cost,
      })),
      expense_breakdown: Array.from(expensesByCategory.entries()).map(([category, total_amount]) => ({
        category,
        total_amount,
      })),
    }
  })

  // Calculate patterns
  const laborPatterns = calculateLaborPatterns(historicalProjects)
  const expensePatterns = calculateExpensePatterns(historicalProjects)
  const timelinePattern = calculateTimelinePattern(historicalProjects)
  const budgetPattern = calculateBudgetPattern(historicalProjects)

  // Determine confidence based on sample size
  let confidence: 'high' | 'medium' | 'low' = 'low'
  if (historicalProjects.length >= 10) {
    confidence = 'high'
  } else if (historicalProjects.length >= 5) {
    confidence = 'medium'
  }

  return {
    similar_projects: historicalProjects,
    labor_patterns: laborPatterns,
    expense_patterns: expensePatterns,
    timeline_pattern: timelinePattern,
    budget_pattern: budgetPattern,
    confidence,
    sample_size: historicalProjects.length,
  }
}

function calculateLaborPatterns(projects: HistoricalProject[]): LaborPattern[] {
  const roleData = new Map<string, { rates: number[]; hours: number[] }>()

  for (const project of projects) {
    for (const labor of project.labor_breakdown) {
      const existing = roleData.get(labor.role) || { rates: [], hours: [] }
      if (labor.total_hours > 0 && labor.total_cost > 0) {
        existing.rates.push(labor.total_cost / labor.total_hours)
        existing.hours.push(labor.total_hours)
      }
      roleData.set(labor.role, existing)
    }
  }

  return Array.from(roleData.entries()).map(([role, data]) => ({
    role,
    avg_hourly_rate: data.rates.length > 0 ? data.rates.reduce((a, b) => a + b, 0) / data.rates.length : 0,
    min_rate: data.rates.length > 0 ? Math.min(...data.rates) : 0,
    max_rate: data.rates.length > 0 ? Math.max(...data.rates) : 0,
    avg_hours_per_project: data.hours.length > 0 ? data.hours.reduce((a, b) => a + b, 0) / data.hours.length : 0,
    frequency: data.rates.length,
  }))
}

function calculateExpensePatterns(projects: HistoricalProject[]): ExpensePattern[] {
  const categoryData = new Map<string, number[]>()

  for (const project of projects) {
    for (const expense of project.expense_breakdown) {
      const existing = categoryData.get(expense.category) || []
      existing.push(expense.total_amount)
      categoryData.set(expense.category, existing)
    }
  }

  return Array.from(categoryData.entries()).map(([category, amounts]) => ({
    category,
    avg_amount: amounts.reduce((a, b) => a + b, 0) / amounts.length,
    min_amount: Math.min(...amounts),
    max_amount: Math.max(...amounts),
    frequency: amounts.length,
  }))
}

function calculateTimelinePattern(projects: HistoricalProject[]): TimelinePattern {
  const durations = projects
    .filter(p => p.duration_days !== null)
    .map(p => p.duration_days!)

  if (durations.length === 0) {
    return {
      avg_duration_days: 30,
      min_duration_days: 14,
      max_duration_days: 60,
      phases: [
        { name: 'Discovery', avg_days: 5, percent_of_total: 15 },
        { name: 'Development', avg_days: 15, percent_of_total: 50 },
        { name: 'Review', avg_days: 7, percent_of_total: 25 },
        { name: 'Finalization', avg_days: 3, percent_of_total: 10 },
      ],
    }
  }

  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length

  return {
    avg_duration_days: Math.round(avgDuration),
    min_duration_days: Math.min(...durations),
    max_duration_days: Math.max(...durations),
    phases: [
      { name: 'Discovery', avg_days: Math.round(avgDuration * 0.15), percent_of_total: 15 },
      { name: 'Development', avg_days: Math.round(avgDuration * 0.50), percent_of_total: 50 },
      { name: 'Review', avg_days: Math.round(avgDuration * 0.25), percent_of_total: 25 },
      { name: 'Finalization', avg_days: Math.round(avgDuration * 0.10), percent_of_total: 10 },
    ],
  }
}

function calculateBudgetPattern(projects: HistoricalProject[]): BudgetPattern {
  if (projects.length === 0) {
    return {
      avg_budget: 10000,
      avg_actual_cost: 9000,
      avg_margin_percent: 10,
      labor_percent: 70,
      expenses_percent: 25,
      contingency_percent: 5,
    }
  }

  const budgets = projects.map(p => p.budget)
  const actualCosts = projects.map(p => p.actual_cost)
  const margins = projects.map(p => p.budget > 0 ? ((p.budget - p.actual_cost) / p.budget) * 100 : 0)

  // Calculate labor vs expense percentages
  let totalLabor = 0
  let totalExpenses = 0
  for (const project of projects) {
    totalLabor += project.labor_breakdown.reduce((sum, l) => sum + l.total_cost, 0)
    totalExpenses += project.expense_breakdown.reduce((sum, e) => sum + e.total_amount, 0)
  }
  const totalCost = totalLabor + totalExpenses
  const laborPercent = totalCost > 0 ? (totalLabor / totalCost) * 100 : 70
  const expensesPercent = totalCost > 0 ? (totalExpenses / totalCost) * 100 : 25

  return {
    avg_budget: budgets.reduce((a, b) => a + b, 0) / budgets.length,
    avg_actual_cost: actualCosts.reduce((a, b) => a + b, 0) / actualCosts.length,
    avg_margin_percent: margins.reduce((a, b) => a + b, 0) / margins.length,
    labor_percent: Math.round(laborPercent),
    expenses_percent: Math.round(expensesPercent),
    contingency_percent: 5,
  }
}

function createEmptyAnalysis(): HistoricalAnalysis {
  return {
    similar_projects: [],
    labor_patterns: [],
    expense_patterns: [],
    timeline_pattern: {
      avg_duration_days: 30,
      min_duration_days: 14,
      max_duration_days: 60,
      phases: [],
    },
    budget_pattern: {
      avg_budget: 0,
      avg_actual_cost: 0,
      avg_margin_percent: 0,
      labor_percent: 70,
      expenses_percent: 25,
      contingency_percent: 5,
    },
    confidence: 'low',
    sample_size: 0,
  }
}

// =====================================================
// SMART PROJECT GENERATION
// =====================================================

export async function generateProjectSuggestions(
  userId: string,
  projectInfo: {
    name: string
    description: string
    project_type?: string
    scope: 'small' | 'medium' | 'large'
    target_budget?: number
  }
): Promise<ProjectGenerationSuggestion> {
  // Determine budget range based on scope
  const budgetRanges = {
    small: { min: 1000, max: 10000 },
    medium: { min: 10000, max: 50000 },
    large: { min: 50000, max: 500000 },
  }
  const range = budgetRanges[projectInfo.scope]

  // Analyze historical data
  const analysis = await analyzeHistoricalProjects(userId, {
    budget_min: range.min,
    budget_max: range.max,
    tags: projectInfo.project_type ? [projectInfo.project_type] : undefined,
  })

  // Generate suggestions based on analysis
  const baseBudget = projectInfo.target_budget || analysis.budget_pattern.avg_budget || range.min + (range.max - range.min) / 2

  const laborAmount = baseBudget * (analysis.budget_pattern.labor_percent / 100)
  const expensesAmount = baseBudget * (analysis.budget_pattern.expenses_percent / 100)
  const contingencyAmount = baseBudget * (analysis.budget_pattern.contingency_percent / 100)

  // Build team suggestions from labor patterns
  const suggestedTeam = analysis.labor_patterns
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5)
    .map(pattern => ({
      role: pattern.role,
      hourly_rate: Math.round(pattern.avg_hourly_rate),
      estimated_hours: Math.round(pattern.avg_hours_per_project),
    }))

  // If no labor patterns found, use defaults
  if (suggestedTeam.length === 0) {
    suggestedTeam.push(
      { role: 'Project Manager', hourly_rate: 75, estimated_hours: 20 },
      { role: 'Designer', hourly_rate: 65, estimated_hours: 40 },
      { role: 'Developer', hourly_rate: 85, estimated_hours: 60 },
    )
  }

  return {
    suggested_budget: {
      total: Math.round(baseBudget),
      labor: Math.round(laborAmount),
      expenses: Math.round(expensesAmount),
      contingency: Math.round(contingencyAmount),
      confidence: analysis.confidence,
      based_on: analysis.sample_size,
    },
    suggested_timeline: {
      duration_days: analysis.timeline_pattern.avg_duration_days,
      phases: analysis.timeline_pattern.phases.map(p => ({
        name: p.name,
        duration_days: p.avg_days,
      })),
    },
    suggested_team: suggestedTeam,
    historical_reference: {
      similar_projects: analysis.similar_projects.slice(0, 5).map(p => ({
        id: p.id,
        name: p.name,
        budget: p.budget,
        actual_cost: p.actual_cost,
        duration_days: p.duration_days,
      })),
      average_budget: analysis.budget_pattern.avg_budget,
      average_duration: analysis.timeline_pattern.avg_duration_days,
      average_margin: analysis.budget_pattern.avg_margin_percent,
    },
  }
}
