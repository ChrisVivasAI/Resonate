import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listStripeInvoices } from '@/lib/stripe/server'
import { checkRateLimit } from '@/lib/rate-limit'
import Stripe from 'stripe'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: 20 stripe list requests per minute
    const { allowed } = checkRateLimit(user.id, 'stripe:list', 20)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Only admin/member can list Stripe invoices
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'member'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startingAfter = searchParams.get('starting_after') || undefined
    const status = searchParams.get('status') as Stripe.InvoiceListParams['status'] | undefined

    // Fetch Stripe invoices
    const stripeInvoices = await listStripeInvoices({
      limit: 50,
      starting_after: startingAfter,
      status: status || undefined,
    })

    // Fetch already-imported stripe_invoice_ids from our DB
    const { data: existingInvoices } = await supabase
      .from('invoices')
      .select('stripe_invoice_id')
      .not('stripe_invoice_id', 'is', null)

    const importedIds = new Set(
      (existingInvoices || []).map((inv) => inv.stripe_invoice_id)
    )

    // Filter out already-imported invoices and map to simplified format
    const invoices = stripeInvoices.data
      .filter((inv) => !importedIds.has(inv.id))
      .map((inv) => {
        const customer = inv.customer as Stripe.Customer | null
        return {
          stripe_id: inv.id,
          number: inv.number,
          customer_name: customer?.name || null,
          customer_email: customer?.email || null,
          amount_due: Number((inv.amount_due / 100).toFixed(2)),
          amount_paid: Number((inv.amount_paid / 100).toFixed(2)),
          status: inv.status,
          due_date: inv.due_date,
          created: inv.created,
          hosted_invoice_url: inv.hosted_invoice_url,
        }
      })

    const lastInvoice = stripeInvoices.data[stripeInvoices.data.length - 1]

    return NextResponse.json({
      invoices,
      has_more: stripeInvoices.has_more,
      last_id: lastInvoice?.id || null,
    })
  } catch (error) {
    console.error('Error fetching Stripe invoices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Stripe invoices' },
      { status: 500 }
    )
  }
}
