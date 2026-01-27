'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings, Clock, Bell, Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProjectMonitoringSettings, MonitoringFrequency } from '@/types'

interface MonitoringConfigProps {
  settings: ProjectMonitoringSettings | null
  onUpdate: (updates: {
    monitoringEnabled?: boolean
    frequency?: MonitoringFrequency
    alertThreshold?: number
  }) => Promise<void>
}

const frequencyOptions: { value: MonitoringFrequency; label: string; description: string }[] = [
  { value: 'daily', label: 'Daily', description: 'Check every day at 9 AM' },
  { value: 'weekly', label: 'Weekly', description: 'Check every Monday at 9 AM' },
  { value: 'monthly', label: 'Monthly', description: 'Check on the 1st of each month' },
]

const thresholdOptions = [40, 50, 60, 70, 80]

export function MonitoringConfig({ settings, onUpdate }: MonitoringConfigProps) {
  const [enabled, setEnabled] = useState(settings?.monitoring_enabled ?? true)
  const [frequency, setFrequency] = useState<MonitoringFrequency>(
    settings?.frequency ?? 'weekly'
  )
  const [threshold, setThreshold] = useState(settings?.alert_threshold ?? 60)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Update local state when settings change
  useEffect(() => {
    if (settings) {
      setEnabled(settings.monitoring_enabled)
      setFrequency(settings.frequency)
      setThreshold(settings.alert_threshold)
    }
  }, [settings])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onUpdate({
        monitoringEnabled: enabled,
        frequency,
        alertThreshold: threshold,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const hasChanges =
    settings &&
    (enabled !== settings.monitoring_enabled ||
      frequency !== settings.frequency ||
      threshold !== settings.alert_threshold)

  return (
    <div className="bg-[#2B2B2B]/60 backdrop-blur-sm border border-white/10 rounded-xl">
      <div className="p-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <Settings className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="font-medium text-white">Monitoring Settings</h3>
            <p className="text-sm text-white/40">Configure automated health checks</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Enable Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-white">Enable Monitoring</p>
            <p className="text-sm text-white/40">Run automated health checks</p>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={cn(
              'relative w-12 h-6 rounded-full transition-colors',
              enabled ? 'bg-[#23FD9E]' : 'bg-white/10'
            )}
          >
            <motion.div
              className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
              animate={{ left: enabled ? '1.5rem' : '0.25rem' }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>

        {enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-6"
          >
            {/* Frequency */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-white/40" />
                <span className="text-sm font-medium text-white/60 uppercase tracking-wider">
                  Check Frequency
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {frequencyOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFrequency(option.value)}
                    className={cn(
                      'p-3 rounded-lg border text-left transition-all',
                      frequency === option.value
                        ? 'bg-[#23FD9E]/10 border-[#23FD9E]/30 text-white'
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                    )}
                  >
                    <p className="font-medium text-sm">{option.label}</p>
                    <p className="text-xs text-white/40 mt-0.5">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Alert Threshold */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Bell className="w-4 h-4 text-white/40" />
                <span className="text-sm font-medium text-white/60 uppercase tracking-wider">
                  Alert Threshold
                </span>
              </div>
              <p className="text-sm text-white/40 mb-3">
                Get notified when health score drops below this value
              </p>
              <div className="flex items-center gap-2">
                {thresholdOptions.map((value) => (
                  <button
                    key={value}
                    onClick={() => setThreshold(value)}
                    className={cn(
                      'flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all',
                      threshold === value
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <p className="text-xs text-white/30 mt-2">
                Current: Alert when score is below {threshold}
              </p>
            </div>

            {/* Next Check */}
            {settings?.next_check_at && (
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-1">
                  Next Scheduled Check
                </p>
                <p className="text-sm text-white">
                  {new Date(settings.next_check_at).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Save Button */}
      <div className="p-5 border-t border-white/[0.06]">
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className={cn(
            'w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all',
            hasChanges
              ? 'bg-[#23FD9E] text-[#1a1a1a] hover:bg-[#1ed189]'
              : 'bg-white/5 text-white/40 cursor-not-allowed'
          )}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <Check className="w-4 h-4" />
              Saved
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </div>
  )
}
