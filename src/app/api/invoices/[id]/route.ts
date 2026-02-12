import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getProfileAndAuthorize(
  supabase: any,
  userId: string,
  invoiceClientId: string
): Promise<{ authorized: boolean; role: string }> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  const role = profile?.role || 'member'

  if (['admin', 'member'].includes(role)) {
    return { authorized: true, role }
  }

  if (role === 'client') {
    const { data: clientRecord } = await supabase
      .from('clients')
      .select('id')
      .eq('profile_id', userId)
      .single()

    if (clientRecord && clientRecord.id === invoiceClientId) {
      return { authorized: true, role }
    }
  }

  return { authorized: false, role }
}

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

    if (error || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Authorization: clients can only access their own invoices
    const { authorized } = await getProfileAndAuthorize(supabase, user.id, invoice.client_id)
    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
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

    // Fetch existing invoice for status check and auth
    const { data: existing } = await supabase
      .from('invoices')
      .select('status, client_id')
      .eq('id', params.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Authorization: clients can only edit their own invoices
    const { authorized, role } = await getProfileAndAuthorize(supabase, user.id, existing.client_id)
    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Clients cannot edit invoices
    if (role === 'client') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (existing.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft invoices can be edited' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    // Validate amount if provided
    if (body.amount !== undefined) {
      const parsedAmount = Number(body.amount)
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 })
      }
      updates.amount = parsedAmount
    }

    // Validate tax_amount if provided
    if (body.tax_amount !== undefined) {
      const parsedTaxAmount = Number(body.tax_amount)
      if (!Number.isFinite(parsedTaxAmount) || parsedTaxAmount < 0) {
        return NextResponse.json({ error: 'Tax amount must be 0 or greater' }, { status: 400 })
      }
      updates.tax_amount = parsedTaxAmount
    }

    // Validate due_date if provided
    if (body.due_date !== undefined) {
      if (body.due_date !== null) {
        const parsedDate = new Date(body.due_date)
        if (isNaN(parsedDate.getTime())) {
          return NextResponse.json({ error: 'Invalid due date' }, { status: 400 })
        }
      }
      updates.due_date = body.due_date
    }

    if (body.line_items !== undefined) {
      const EPSILON = 0.01
      for (const item of body.line_items) {
        const expectedTotal = item.quantity * item.unit_price
        if (Math.abs(expectedTotal - item.total) > EPSILON) {
          return NextResponse.json(
            { error: `Line item "${item.description}" total does not match quantity * unit_price` },
            { status: 400 }
          )
        }
      }
      if (body.amount !== undefined) {
        const lineItemSum = body.line_items.reduce((sum: number, item: { total: number }) => sum + item.total, 0)
        if (Math.abs(lineItemSum - Number(body.amount)) > EPSILON) {
          return NextResponse.json(
            { error: 'Sum of line item totals does not match invoice amount' },
            { status: 400 }
          )
        }
      }
      updates.line_items = body.line_items
    }

    if (body.notes !== undefined) updates.notes = body.notes

    // Recalculate total if amount or tax changed
    if (body.amount !== undefined || body.tax_amount !== undefined) {
      const amount = body.amount !== undefined ? Number(body.amount) : undefined
      const taxAmount = body.tax_amount !== undefined ? Number(body.tax_amount) : undefined

      if (amount !== undefined || taxAmount !== undefined) {
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
      { error: 'Failed to update invoice' },
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

    // Fetch existing for auth check
    const { data: existing } = await supabase
      .from('invoices')
      .select('status, client_id')
      .eq('id', params.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Authorization: only admin/member can delete
    const { authorized, role } = await getProfileAndAuthorize(supabase, user.id, existing.client_id)
    if (!authorized || role === 'client') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
      { error: 'Failed to delete invoice' },
      { status: 500 }
    )
  }
}
