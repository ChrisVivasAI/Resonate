import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { voidStripeInvoice } from '@/lib/stripe/server'

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

    // Only admin/member can void invoices
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'member'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch the invoice
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('id, status, stripe_invoice_id, client_id')
      .eq('id', params.id)
      .single()

    if (fetchError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (invoice.status !== 'sent' && invoice.status !== 'overdue') {
      return NextResponse.json(
        { error: 'Only sent or overdue invoices can be voided' },
        { status: 400 }
      )
    }

    // Void in Stripe if it exists there
    if (invoice.stripe_invoice_id) {
      await voidStripeInvoice(invoice.stripe_invoice_id)
    }

    // Update our DB record
    const { data: updated, error: updateError } = await supabase
      .from('invoices')
      .update({ status: 'cancelled' })
      .eq('id', params.id)
      .select('*, client:clients(id, name, email, company), project:projects(id, name)')
      .single()

    if (updateError) throw new Error(updateError.message)

    return NextResponse.json({ invoice: updated })
  } catch (error) {
    console.error('Error voiding invoice:', error)
    return NextResponse.json(
      { error: 'Failed to void invoice' },
      { status: 500 }
    )
  }
}
