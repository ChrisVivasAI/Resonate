import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: projectId } = params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, budget')
      .eq('id', projectId)
      .single()

    if (projectError) {
      throw new Error(projectError.message)
    }

    // Get all expenses for the project
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('*')
      .eq('project_id', projectId)
    if (expensesError) throw new Error(`Failed to fetch expenses: ${expensesError.message}`)

    // Get all labor entries for the project
    const { data: laborEntries, error: laborError } = await supabase
      .from('labor_entries')
      .select('*')
      .eq('project_id', projectId)
    if (laborError) throw new Error(`Failed to fetch labor entries: ${laborError.message}`)

    // Get all invoices for the project
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .eq('project_id', projectId)
    if (invoicesError) throw new Error(`Failed to fetch invoices: ${invoicesError.message}`)

    // Get all reimbursements for the project
    const { data: reimbursements, error: reimbursementsError } = await supabase
      .from('reimbursements')
      .select('*')
      .eq('project_id', projectId)
    if (reimbursementsError) throw new Error(`Failed to fetch reimbursements: ${reimbursementsError.message}`)

    // Get all returns for the project
    const { data: returns, error: returnsError } = await supabase
      .from('returns')
      .select('*')
      .eq('project_id', projectId)
    if (returnsError) throw new Error(`Failed to fetch returns: ${returnsError.message}`)

    // Calculate totals
    const totalExpenseCost = expenses?.reduce((sum, e) => sum + Number(e.total || 0), 0) || 0
    const totalExpenseClientCharges = expenses?.reduce((sum, e) => sum + Number(e.client_price || 0), 0) || 0
    const totalLaborCost = laborEntries?.reduce((sum, l) => sum + Number(l.actual_cost || 0), 0) || 0
    const totalEstimatedLaborCost = laborEntries?.reduce((sum, l) => sum + Number(l.estimated_cost || 0), 0) || 0

    const totalLaborOwed = laborEntries?.filter(l => l.payment_status !== 'paid').reduce((sum, l) => sum + Number(l.actual_cost || 0), 0) || 0
    const totalLaborPaid = laborEntries?.filter(l => l.payment_status === 'paid').reduce((sum, l) => sum + Number(l.actual_cost || 0), 0) || 0

    const totalInternalCost = totalExpenseCost + totalLaborCost
    const totalClientCharges = totalExpenseClientCharges + totalLaborCost

    const clientBudget = Number(project.budget) || 0

    const outstandingInvoices = invoices?.filter(i => ['sent', 'overdue'].includes(i.status))
      .reduce((sum, i) => sum + Number(i.total_amount), 0) || 0

    const paidInvoices = invoices?.filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + Number(i.total_amount), 0) || 0

    // Total invoiced (non-cancelled) represents what's been charged against the client budget
    const totalInvoiced = invoices?.filter(i => i.status !== 'cancelled')
      .reduce((sum, i) => sum + Number(i.total_amount), 0) || 0

    // Reimbursement totals
    const reimbursementsPending = reimbursements?.filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + Number(r.amount), 0) || 0
    const reimbursementsApproved = reimbursements?.filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + Number(r.amount), 0) || 0
    const reimbursementsPaid = reimbursements?.filter(r => r.status === 'paid')
      .reduce((sum, r) => sum + Number(r.amount), 0) || 0
    const reimbursementsTotal = reimbursements?.reduce((sum, r) => sum + Number(r.amount), 0) || 0

    // Returns totals
    const returnsPending = returns?.filter(r => ['pending', 'in_progress'].includes(r.status))
      .reduce((sum, r) => sum + Number(r.net_return || 0), 0) || 0
    const returnsCompleted = returns?.filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + Number(r.net_return || 0), 0) || 0
    const returnsExpected = returns?.reduce((sum, r) => sum + Number(r.net_return || 0), 0) || 0
    const restockingFees = returns?.reduce((sum, r) => sum + Number(r.restocking_fee || 0), 0) || 0

    const adjustedInternalCost = totalInternalCost - returnsCompleted + reimbursementsPaid
    const grossProfit = paidInvoices - adjustedInternalCost
    const profitMargin = paidInvoices > 0 ? (grossProfit / paidInvoices) * 100 : 0

    // Remaining budget uses the greater of invoiced or expense charges to avoid underreporting
    const remainingBudget = clientBudget - Math.max(totalInvoiced, totalClientCharges)

    // Expense breakdown by category
    const expensesByCategory = expenses?.reduce((acc, e) => {
      const category = e.category || 'Uncategorized'
      if (!acc[category]) {
        acc[category] = { total: 0, clientPrice: 0, count: 0 }
      }
      acc[category].total += Number(e.total || 0)
      acc[category].clientPrice += Number(e.client_price || 0)
      acc[category].count += 1
      return acc
    }, {} as Record<string, { total: number; clientPrice: number; count: number }>) || {}

    // Labor breakdown by role
    const laborByRole = laborEntries?.reduce((acc, l) => {
      const role = l.role || 'Other'
      if (!acc[role]) {
        acc[role] = { estimatedHours: 0, actualHours: 0, estimatedCost: 0, actualCost: 0, count: 0 }
      }
      acc[role].estimatedHours += Number(l.estimated_hours || 0)
      acc[role].actualHours += Number(l.actual_hours || 0)
      acc[role].estimatedCost += Number(l.estimated_cost || 0)
      acc[role].actualCost += Number(l.actual_cost || 0)
      acc[role].count += 1
      return acc
    }, {} as Record<string, { estimatedHours: number; actualHours: number; estimatedCost: number; actualCost: number; count: number }>) || {}

    return NextResponse.json({
      summary: {
        quoteAmount: clientBudget,
        totalClientCharges,
        totalInternalCost,
        adjustedInternalCost,
        grossProfit,
        profitMargin: Math.round(profitMargin * 10) / 10,
        remainingBudget,
        outstandingInvoices,
        paidInvoices,
        totalInvoiced,
      },
      expenses: {
        total: totalExpenseCost,
        clientCharges: totalExpenseClientCharges,
        count: expenses?.length || 0,
        byCategory: expensesByCategory,
      },
      labor: {
        estimatedCost: totalEstimatedLaborCost,
        actualCost: totalLaborCost,
        owed: totalLaborOwed,
        paid: totalLaborPaid,
        count: laborEntries?.length || 0,
        byRole: laborByRole,
      },
      invoices: {
        total: invoices?.filter(i => i.status !== 'cancelled').reduce((sum, i) => sum + Number(i.total_amount), 0) || 0,
        outstanding: outstandingInvoices,
        paid: paidInvoices,
        count: invoices?.length || 0,
      },
      reimbursements: {
        total: reimbursementsTotal,
        pending: reimbursementsPending,
        approved: reimbursementsApproved,
        paid: reimbursementsPaid,
        count: reimbursements?.length || 0,
        pendingCount: reimbursements?.filter(r => r.status === 'pending').length || 0,
        approvedCount: reimbursements?.filter(r => r.status === 'approved').length || 0,
      },
      returns: {
        expected: returnsExpected,
        pending: returnsPending,
        completed: returnsCompleted,
        restockingFees: restockingFees,
        count: returns?.length || 0,
        pendingCount: returns?.filter(r => ['pending', 'in_progress'].includes(r.status)).length || 0,
        completedCount: returns?.filter(r => r.status === 'completed').length || 0,
      },
    })
  } catch (error) {
    console.error('Error fetching project financials:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch financials' },
      { status: 500 }
    )
  }
}
