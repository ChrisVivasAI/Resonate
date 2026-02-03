import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*, client:clients(*), project:projects(id, name), milestone:milestones(id, title)')
      .eq('id', params.id)
      .single()

    if (error) throw new Error(error.message)

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch invoice' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify invoice is in draft status
    const { data: existing } = await supabase
      .from('invoices')
      .select('status')
      .eq('id', params.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }
    if (existing.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft invoices can be edited' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (body.amount !== undefined) updates.amount = Number(body.amount)
    if (body.tax_amount !== undefined) updates.tax_amount = Number(body.tax_amount)
    if (body.due_date !== undefined) updates.due_date = body.due_date
    if (body.line_items !== undefined) updates.line_items = body.line_items
    if (body.notes !== undefined) updates.notes = body.notes

    // Recalculate total if amount or tax changed
    if (body.amount !== undefined || body.tax_amount !== undefined) {
      const amount = body.amount !== undefined ? Number(body.amount) : undefined
      const taxAmount = body.tax_amount !== undefined ? Number(body.tax_amount) : undefined

      if (amount !== undefined || taxAmount !== undefined) {
        // Need to get current values for fields that weren't provided
        const { data: current } = await supabase
          .from('invoices')
          .select('amount, tax_amount')
          .eq('id', params.id)
          .single()

        const finalAmount = amount ?? Number(current?.amount ?? 0)
        const finalTax = taxAmount ?? Number(current?.tax_amount ?? 0)
        updates.total_amount = finalAmount + finalTax
      }
    }

    const { data: invoice, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', params.id)
      .select('*, client:clients(id, name, email, company), project:projects(id, name)')
      .single()

    if (error) throw new Error(error.message)

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error('Error updating invoice:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update invoice' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify invoice is in draft status
    const { data: existing } = await supabase
      .from('invoices')
      .select('status')
      .eq('id', params.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }
    if (existing.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft invoices can be deleted' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', params.id)

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting invoice:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete invoice' },
      { status: 500 }
    )
  }
}
