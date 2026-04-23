import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Validate user authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get the invoice to find its stripe_invoice_id
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('stripe_invoice_id, stripe_invoice_url, client_id')
      .eq('id', params.id)
      .single()

    if (error || !invoice || !invoice.stripe_invoice_id) {
      return new NextResponse('Invoice not found or has no Stripe equivalent.', { status: 404 })
    }

    // Check authorization: User must be admin/member OR the client of this invoice
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'member', 'client'].includes(profile.role)) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const role = profile.role
    
    if (role === 'client') {
      const { data: clientRecord } = await supabase
        .from('clients')
        .select('id')
        .eq('profile_id', user.id)
        .single()
        
      if (!clientRecord || clientRecord.id !== invoice.client_id) {
        return new NextResponse('Forbidden', { status: 403 })
      }
    }

    // Fetch the invoice directly from Stripe to get a fresh URL
    let stripeInvoiceUrl = invoice.stripe_invoice_url
    
    try {
      const stripeInvoice = await stripe.invoices.retrieve(invoice.stripe_invoice_id)
      if (stripeInvoice.hosted_invoice_url) {
        stripeInvoiceUrl = stripeInvoice.hosted_invoice_url
      }
    } catch (err: any) {
      console.warn('Failed to fetch fresh invoice from Stripe, falling back to cached URL. Error:', err.message)
    }
    
    if (!stripeInvoiceUrl) {
       return new NextResponse('Invoice is not yet finalized in Stripe so it cannot be viewed.', { status: 400 })
    }

    return NextResponse.redirect(stripeInvoiceUrl)

  } catch (error) {
    console.error('Error viewing invoice:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
