import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')
    const clientId = searchParams.get('client_id')
    const status = searchParams.get('status')
    const invoiceType = searchParams.get('invoice_type')

    let query = supabase
      .from('invoices')
      .select('*, client:clients(id, name, email, company), project:projects(id, name)')
      .order('created_at', { ascending: false })

    if (projectId) query = query.eq('project_id', projectId)
    if (clientId) query = query.eq('client_id', clientId)
    if (status) query = query.eq('status', status)
    if (invoiceType) query = query.eq('invoice_type', invoiceType)

    const { data: invoices, error } = await query

    if (error) throw new Error(error.message)

    return NextResponse.json({ invoices })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      client_id,
      project_id,
      milestone_id,
      invoice_type = 'custom',
      amount,
      tax_amount = 0,
      due_date,
      line_items = [],
      notes,
    } = body

    if (!client_id || amount === undefined) {
      return NextResponse.json(
        { error: 'Client ID and amount are required' },
        { status: 400 }
      )
    }

    // Generate invoice number (INV-0001 pattern)
    const { data: lastInvoice } = await supabase
      .from('invoices')
      .select('invoice_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let nextNumber = 1
    if (lastInvoice?.invoice_number) {
      const match = lastInvoice.invoice_number.match(/INV-(\d+)/)
      if (match) nextNumber = parseInt(match[1], 10) + 1
    }
    const invoiceNumber = `INV-${String(nextNumber).padStart(4, '0')}`

    const totalAmount = Number(amount) + Number(tax_amount)

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        client_id,
        project_id: project_id || null,
        milestone_id: milestone_id || null,
        invoice_type,
        invoice_number: invoiceNumber,
        amount: Number(amount),
        tax_amount: Number(tax_amount),
        total_amount: totalAmount,
        currency: 'usd',
        status: 'draft',
        due_date: due_date || null,
        line_items: line_items.length > 0 ? line_items : [
          { id: crypto.randomUUID(), description: 'Services', quantity: 1, unit_price: Number(amount), total: Number(amount) },
        ],
        notes: notes || null,
      })
      .select('*, client:clients(id, name, email, company), project:projects(id, name)')
      .single()

    if (error) throw new Error(error.message)

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create invoice' },
      { status: 500 }
    )
  }
}
