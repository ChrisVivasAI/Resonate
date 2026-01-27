import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: projectId } = params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get or create monitoring settings
    let { data: settings, error } = await supabase
      .from('project_monitoring_settings')
      .select('*')
      .eq('project_id', projectId)
      .single()

    if (error && error.code === 'PGRST116') {
      // No settings found, create default
      const { data: newSettings, error: createError } = await supabase
        .from('project_monitoring_settings')
        .insert({
          project_id: projectId,
          monitoring_enabled: true,
          frequency: 'weekly',
          alert_threshold: 60,
        })
        .select()
        .single()

      if (createError) throw new Error(createError.message)
      settings = newSettings
    } else if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Get monitoring settings error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get monitoring settings' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: projectId } = params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin/member can update settings
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'member'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { monitoringEnabled, frequency, alertThreshold } = body

    // Calculate next check time based on frequency
    const now = new Date()
    let nextCheckAt: Date | null = null

    if (monitoringEnabled !== false) {
      const freq = frequency || 'weekly'
      nextCheckAt = new Date(now)

      switch (freq) {
        case 'daily':
          nextCheckAt.setDate(nextCheckAt.getDate() + 1)
          nextCheckAt.setHours(9, 0, 0, 0) // 9 AM next day
          break
        case 'weekly':
          nextCheckAt.setDate(nextCheckAt.getDate() + 7)
          nextCheckAt.setHours(9, 0, 0, 0)
          break
        case 'monthly':
          nextCheckAt.setMonth(nextCheckAt.getMonth() + 1)
          nextCheckAt.setDate(1)
          nextCheckAt.setHours(9, 0, 0, 0)
          break
      }
    }

    // Upsert settings
    const { data: settings, error } = await supabase
      .from('project_monitoring_settings')
      .upsert({
        project_id: projectId,
        monitoring_enabled: monitoringEnabled ?? true,
        frequency: frequency ?? 'weekly',
        alert_threshold: alertThreshold ?? 60,
        next_check_at: nextCheckAt?.toISOString(),
        updated_at: now.toISOString(),
      }, {
        onConflict: 'project_id',
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Update monitoring settings error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update monitoring settings' },
      { status: 500 }
    )
  }
}
