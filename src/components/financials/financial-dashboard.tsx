'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { StatCard } from '@/components/ui/card'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  RotateCcw,
  CreditCard,
} from 'lucide-react'
import { useProjectFinancials, type ProjectFinancials } from '@/hooks'

interface FinancialDashboardProps {
  projectId: string
}

export function FinancialDashboard({ projectId }: FinancialDashboardProps) {
  const { financials, loading, error } = useProjectFinancials(projectId)

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="py-6">
              <div className="h-4 bg-obsidian-700 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-obsidian-700 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !financials) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-red-400">{error || 'Failed to load financials'}</div>
        </CardContent>
      </Card>
    )
  }

  const { summary, expenses, labor, invoices, reimbursements, returns } = financials

  const quoteInvoicedPercent = summary.quoteAmount > 0 ? (summary.totalInvoiced / summary.quoteAmount) * 100 : 0

  const getBudgetStatusColor = (percent: number) => {
    if (percent >= 100) return 'text-red-400'
    if (percent >= 80) return 'text-amber-400'
    return 'text-emerald-400'
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  return (
    <div className="space-y-6">
      {/* Quote & Profit Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard variant="default">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-obsidian-400 mb-1">Quote</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(summary.quoteAmount)}</p>
            </div>
            <div className="p-2 bg-ember-500/10 rounded-lg">
              <Wallet className="w-5 h-5 text-ember-400" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-obsidian-400">Invoiced</span>
              <span className={getBudgetStatusColor(quoteInvoicedPercent)}>{quoteInvoicedPercent.toFixed(1)}%</span>
            </div>
            <Progress value={Math.min(quoteInvoicedPercent, 100)} className="h-2" />
          </div>
        </StatCard>

        <StatCard variant={summary.grossProfit >= 0 ? 'success' : 'ember'}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-obsidian-400 mb-1">Gross Profit</p>
              <p className={`text-2xl font-bold ${summary.grossProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(summary.grossProfit)}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${summary.grossProfit >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
              {summary.grossProfit >= 0 ? (
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-400" />
              )}
            </div>
          </div>
          <div className="mt-3">
            <p className="text-sm">
              <span className="text-obsidian-400">Margin: </span>
              <span className={summary.profitMargin >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {summary.profitMargin.toFixed(1)}%
              </span>
            </p>
          </div>
        </StatCard>

        <StatCard variant="default">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-obsidian-400 mb-1">Total Expenses</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(summary.totalInternalCost)}</p>
            </div>
            <div className="p-2 bg-obsidian-500/10 rounded-lg">
              <Receipt className="w-5 h-5 text-obsidian-400" />
            </div>
          </div>
        </StatCard>

        <StatCard variant="default">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-obsidian-400 mb-1">Total Payments</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(summary.paidInvoices)}</p>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
        </StatCard>
      </div>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Expenses ({expenses.count})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-obsidian-400">Total Cost</span>
                <span className="text-white font-medium">{formatCurrency(expenses.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-obsidian-400">Client Charges</span>
                <span className="text-emerald-400 font-medium">{formatCurrency(expenses.clientCharges)}</span>
              </div>
              {Object.keys(expenses.byCategory).length > 0 && (
                <>
                  <div className="border-t border-obsidian-700 pt-3 mt-3">
                    <p className="text-xs text-obsidian-400 mb-2">By Category</p>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {Object.entries(expenses.byCategory).map(([category, data]) => (
                        <div key={category} className="flex justify-between text-sm">
                          <span className="text-obsidian-300">{category}</span>
                          <span className="text-white">{formatCurrency(data.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Labor Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Labor ({labor.count})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-obsidian-400">Estimated Cost</span>
                <span className="text-white font-medium">{formatCurrency(labor.estimatedCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-obsidian-400">Actual Cost</span>
                <span
                  className={`font-medium ${
                    labor.actualCost > labor.estimatedCost ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {formatCurrency(labor.actualCost)}
                </span>
              </div>
              {Object.keys(labor.byRole).length > 0 && (
                <>
                  <div className="border-t border-obsidian-700 pt-3 mt-3">
                    <p className="text-xs text-obsidian-400 mb-2">By Role</p>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {Object.entries(labor.byRole).map(([role, data]) => (
                        <div key={role} className="flex justify-between text-sm">
                          <span className="text-obsidian-300 truncate flex-1">{role}</span>
                          <span className="text-white ml-2">{formatCurrency(data.actualCost)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invoices Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-obsidian-800/30 rounded-xl text-center">
              <p className="text-xs text-obsidian-400 mb-1">Total Invoiced</p>
              <p className="text-xl font-bold text-white">{formatCurrency(invoices.total)}</p>
              <p className="text-xs text-obsidian-500 mt-1">{invoices.count} invoices</p>
            </div>
            <div className="p-4 bg-obsidian-800/30 rounded-xl text-center">
              <p className="text-xs text-obsidian-400 mb-1">Paid</p>
              <p className="text-xl font-bold text-emerald-400">{formatCurrency(invoices.paid)}</p>
            </div>
            <div className="p-4 bg-obsidian-800/30 rounded-xl text-center">
              <p className="text-xs text-obsidian-400 mb-1">Outstanding</p>
              <p className="text-xl font-bold text-amber-400">{formatCurrency(invoices.outstanding)}</p>
            </div>
            <div className="p-4 bg-obsidian-800/30 rounded-xl text-center">
              <p className="text-xs text-obsidian-400 mb-1">Collection Rate</p>
              <p className="text-xl font-bold text-white">
                {invoices.total > 0 ? ((invoices.paid / invoices.total) * 100).toFixed(0) : 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reimbursements & Returns Summary */}
      <h3 className="text-sm font-medium text-obsidian-400 uppercase tracking-wider">Reimbursements & Returns</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reimbursements */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-400" />
              <CardTitle className="text-lg">Reimbursements</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl text-center">
                <p className="text-xs text-amber-400 mb-1">Pending</p>
                <p className="text-lg font-bold text-white">{formatCurrency(reimbursements.pending)}</p>
                <p className="text-xs text-obsidian-500">{reimbursements.pendingCount} requests</p>
              </div>
              <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl text-center">
                <p className="text-xs text-blue-400 mb-1">Approved</p>
                <p className="text-lg font-bold text-white">{formatCurrency(reimbursements.approved)}</p>
                <p className="text-xs text-obsidian-500">{reimbursements.approvedCount} requests</p>
              </div>
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-center">
                <p className="text-xs text-emerald-400 mb-1">Paid</p>
                <p className="text-lg font-bold text-emerald-400">{formatCurrency(reimbursements.paid)}</p>
              </div>
              <div className="p-3 bg-obsidian-800/30 rounded-xl text-center">
                <p className="text-xs text-obsidian-400 mb-1">Total Owed</p>
                <p className="text-lg font-bold text-white">
                  {formatCurrency(reimbursements.pending + reimbursements.approved)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Returns */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-emerald-400" />
              <CardTitle className="text-lg">Returns</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl text-center">
                <p className="text-xs text-amber-400 mb-1">Pending</p>
                <p className="text-lg font-bold text-white">{formatCurrency(returns.pending)}</p>
                <p className="text-xs text-obsidian-500">{returns.pendingCount} items</p>
              </div>
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-center">
                <p className="text-xs text-emerald-400 mb-1">Completed</p>
                <p className="text-lg font-bold text-emerald-400">{formatCurrency(returns.completed)}</p>
                <p className="text-xs text-obsidian-500">{returns.completedCount} items</p>
              </div>
              <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl text-center">
                <p className="text-xs text-red-400 mb-1">Restocking Fees</p>
                <p className="text-lg font-bold text-red-400">-{formatCurrency(returns.restockingFees)}</p>
              </div>
              <div className="p-3 bg-obsidian-800/30 rounded-xl text-center">
                <p className="text-xs text-obsidian-400 mb-1">Expected Total</p>
                <p className="text-lg font-bold text-emerald-400">{formatCurrency(returns.expected)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
