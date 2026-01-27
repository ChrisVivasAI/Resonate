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

    // Get the latest health report
    const { data: report, error } = await supabase
      .from('project_health_reports')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No report found
        return NextResponse.json({ report: null, message: 'No health report available' })
      }
      throw new Error(error.message)
    }

    // Get monitoring settings
    const { data: settings } = await supabase
      .from('project_monitoring_settings')
      .select('*')
      .eq('project_id', projectId)
      .single()

    // Get historical reports for trend
    const { data: history } = await supabase
      .from('project_health_reports')
      .select('health_score, status, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      report,
      settings,
      history: history || [],
    })
  } catch (error) {
    console.error('Get health report error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get health report' },
      { status: 500 }
    )
  }
}
