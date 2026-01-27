'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ProjectHealthReport, ProjectMonitoringSettings } from '@/types'

interface HealthHistory {
  health_score: number
  status: string
  created_at: string
}

interface UseProjectHealthOptions {
  projectId: string | null
  autoFetch?: boolean
}

export function useProjectHealth({ projectId, autoFetch = true }: UseProjectHealthOptions) {
  const [report, setReport] = useState<ProjectHealthReport | null>(null)
  const [settings, setSettings] = useState<ProjectMonitoringSettings | null>(null)
  const [history, setHistory] = useState<HealthHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHealth = useCallback(async () => {
    if (!projectId) {
      setReport(null)
      setSettings(null)
      setHistory([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/projects/${projectId}/ai/health`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch health data')
      }

      setReport(data.report)
      setSettings(data.settings)
      setHistory(data.history || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health data')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (autoFetch) {
      fetchHealth()
    }
  }, [fetchHealth, autoFetch])

  const runAnalysis = async () => {
    if (!projectId) return null

    setAnalyzing(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/ai/analyze`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run analysis')
      }

      // Refresh data after analysis
      await fetchHealth()

      return data.report
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to run analysis'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setAnalyzing(false)
    }
  }

  const updateSettings = async (updates: {
    monitoringEnabled?: boolean
    frequency?: 'daily' | 'weekly' | 'monthly'
    alertThreshold?: number
  }) => {
    if (!projectId) return null

    try {
      const response = await fetch(`/api/projects/${projectId}/monitoring`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update settings')
      }

      setSettings(data.settings)
      return data.settings
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update settings'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  return {
    report,
    settings,
    history,
    loading,
    analyzing,
    error,
    refetch: fetchHealth,
    runAnalysis,
    updateSettings,
  }
}

export function useTaskSuggestions(projectId: string | null) {
  const [suggestions, setSuggestions] = useState<{
    title: string
    description: string
    priority: 'low' | 'medium' | 'high'
    estimatedDuration?: string
  }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateSuggestions = async () => {
    if (!projectId) return []

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/ai/suggest-tasks`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate suggestions')
      }

      setSuggestions(data.suggestions || [])
      return data.suggestions
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate suggestions'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const clearSuggestions = () => {
    setSuggestions([])
  }

  return {
    suggestions,
    loading,
    error,
    generateSuggestions,
    clearSuggestions,
  }
}

export function useStatusSummary(projectId: string | null) {
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateSummary = async () => {
    if (!projectId) return null

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/ai/status-summary`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate summary')
      }

      setSummary(data.summary)
      return data.summary
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate summary'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return {
    summary,
    loading,
    error,
    generateSummary,
  }
}
