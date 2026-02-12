import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user role for authorization scoping
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, client_id')
      .eq('id', user.id)
      .single()

    const userRole = profile?.role || 'member'

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')
    const clientId = searchParams.get('client_id')
    const status = searchParams.get('status')
    const invoiceType = searchParams.get('invoice_type')

    let query = supabase
      .from('invoices')
      .select('*, client:clients(id, name, email, company), project:projects(id, name)')
      .order('created_at', { ascending: false })

    // Client users can only see their own invoices
    if (userRole === 'client') {
      const { data: clientRecord } = await supabase
        .from('clients')
        .select('id')
        .eq('profile_id', user.id)
        .single()

      if (!clientRecord) {
        return NextResponse.json({ error: 'Client record not found' }, { status: 403 })
      }
      query = query.eq('client_id', clientRecord.id)
    }

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
      { error: 'Failed to fetch invoices' },
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

    // Rate limit: 30 creates per minute
    const { allowed } = checkRateLimit(user.id, 'invoice:create', 30)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Only admin/member can create invoices
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'member'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

    // Validate amount > 0
    if (typeof amount !== 'number' && typeof amount !== 'string') {
      return NextResponse.json({ error: 'Amount must be a number' }, { status: 400 })
    }
    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 })
    }

    // Validate tax_amount >= 0
    const parsedTaxAmount = Number(tax_amount)
    if (!Number.isFinite(parsedTaxAmount) || parsedTaxAmount < 0) {
      return NextResponse.json({ error: 'Tax amount must be 0 or greater' }, { status: 400 })
    }

    // Validate due_date if provided
    if (due_date) {
      const parsedDate = new Date(due_date)
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json({ error: 'Invalid due date' }, { status: 400 })
      }
    }

    // Generate invoice number atomically via DB sequence
    const { data: invoiceNumberData, error: invoiceNumberError } = await supabase.rpc('generate_invoice_number')
    if (invoiceNumberError) throw new Error(invoiceNumberError.message)
    const invoiceNumber = invoiceNumberData as string

    const totalAmount = parsedAmount + parsedTaxAmount

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        client_id,
        project_id: project_id || null,
        milestone_id: milestone_id || null,
        invoice_type,
        invoice_number: invoiceNumber,
        amount: parsedAmount,
        tax_amount: parsedTaxAmount,
        total_amount: totalAmount,
        currency: 'usd',
        status: 'draft',
        due_date: due_date || null,
        line_items: line_items.length > 0 ? line_items : [
          { id: crypto.randomUUID(), description: 'Services', quantity: 1, unit_price: parsedAmount, total: parsedAmount },
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
      { error: 'Failed to create invoice' },
      { status: 500 }
    )
  }
}
