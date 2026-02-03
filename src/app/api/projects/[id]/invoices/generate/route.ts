import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch project with client and milestones
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*, client:clients(id, name, email), milestones(*)')
      .eq('id', params.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!project.budget || project.budget <= 0) {
      return NextResponse.json(
        { error: 'Project must have a budget greater than 0' },
        { status: 400 }
      )
    }

    if (!project.client_id) {
      return NextResponse.json(
        { error: 'Project must have a client assigned' },
        { status: 400 }
      )
    }

    // Get the last invoice number
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

    const invoices: Array<Record<string, unknown>> = []
    const depositPercentage = project.deposit_percentage ?? 50
    const budget = Number(project.budget)

    // Create deposit invoice
    const depositAmount = budget * (depositPercentage / 100)
    if (depositAmount > 0) {
      const invoiceNumber = `INV-${String(nextNumber).padStart(4, '0')}`
      nextNumber++

      invoices.push({
        client_id: project.client_id,
        project_id: project.id,
        invoice_type: 'deposit',
        invoice_number: invoiceNumber,
        amount: depositAmount,
        tax_amount: 0,
        total_amount: depositAmount,
        currency: 'usd',
        status: 'draft',
        line_items: [
          {
            id: crypto.randomUUID(),
            description: `Deposit for ${project.name} (${depositPercentage}%)`,
            quantity: 1,
            unit_price: depositAmount,
            total: depositAmount,
          },
        ],
      })
    }

    // Create milestone invoices
    const milestones = (project.milestones || []) as Array<{
      id: string
      title: string
      payment_amount?: number
    }>

    let milestoneTotal = 0
    for (const milestone of milestones) {
      const paymentAmount = Number(milestone.payment_amount || 0)
      if (paymentAmount > 0) {
        const invoiceNumber = `INV-${String(nextNumber).padStart(4, '0')}`
        nextNumber++
        milestoneTotal += paymentAmount

        invoices.push({
          client_id: project.client_id,
          project_id: project.id,
          milestone_id: milestone.id,
          invoice_type: 'milestone',
          invoice_number: invoiceNumber,
          amount: paymentAmount,
          tax_amount: 0,
          total_amount: paymentAmount,
          currency: 'usd',
          status: 'draft',
          line_items: [
            {
              id: crypto.randomUUID(),
              description: `Milestone: ${milestone.title}`,
              quantity: 1,
              unit_price: paymentAmount,
              total: paymentAmount,
            },
          ],
        })
      }
    }

    // If there's remaining balance and no milestone invoices covered it
    const remaining = budget - depositAmount - milestoneTotal
    if (remaining > 0 && milestones.length === 0) {
      const invoiceNumber = `INV-${String(nextNumber).padStart(4, '0')}`
      nextNumber++

      invoices.push({
        client_id: project.client_id,
        project_id: project.id,
        invoice_type: 'custom',
        invoice_number: invoiceNumber,
        amount: remaining,
        tax_amount: 0,
        total_amount: remaining,
        currency: 'usd',
        status: 'draft',
        line_items: [
          {
            id: crypto.randomUUID(),
            description: `Remaining Balance for ${project.name}`,
            quantity: 1,
            unit_price: remaining,
            total: remaining,
          },
        ],
      })
    }

    if (invoices.length === 0) {
      return NextResponse.json(
        { error: 'No invoices to generate' },
        { status: 400 }
      )
    }

    // Insert all invoices
    const { data: created, error: insertError } = await supabase
      .from('invoices')
      .insert(invoices)
      .select('*, client:clients(id, name, email, company), project:projects(id, name)')

    if (insertError) throw new Error(insertError.message)

    return NextResponse.json({ invoices: created })
  } catch (error) {
    console.error('Error generating invoices:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate invoices' },
      { status: 500 }
    )
  }
}
