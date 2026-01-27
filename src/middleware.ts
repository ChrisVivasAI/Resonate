import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Define route types
  const agencyPaths = ['/dashboard', '/admin', '/projects', '/clients', '/payments', '/ai-studio', '/leads', '/settings']
  const clientPortalPaths = ['/portal']
  const authPaths = ['/auth/login', '/auth/signup', '/auth/forgot-password']
  const publicInvitePath = '/auth/invite'

  const pathname = request.nextUrl.pathname

  const isAgencyPath = agencyPaths.some(path => pathname.startsWith(path))
  const isClientPortalPath = clientPortalPaths.some(path => pathname.startsWith(path))
  const isAuthPath = authPaths.some(path => pathname.startsWith(path))
  const isInvitePath = pathname.startsWith(publicInvitePath)

  // Allow public invite path without authentication
  if (isInvitePath) {
    return response
  }

  // Redirect unauthenticated users from protected paths
  if ((isAgencyPath || isClientPortalPath) && !user) {
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Handle authenticated users
  if (user) {
    // Fetch user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const userRole = profile?.role || 'member'
    const isClientUser = userRole === 'client'
    const isAgencyUser = ['admin', 'member'].includes(userRole)

    // Redirect authenticated users from auth pages
    if (isAuthPath) {
      if (isClientUser) {
        return NextResponse.redirect(new URL('/portal', request.url))
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Protect agency paths from client users
    if (isAgencyPath && isClientUser) {
      return NextResponse.redirect(new URL('/portal', request.url))
    }

    // Protect client portal from agency users
    if (isClientPortalPath && isAgencyUser) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Redirect root to appropriate dashboard
    if (pathname === '/') {
      if (isClientUser) {
        return NextResponse.redirect(new URL('/portal', request.url))
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public|api/webhooks|api/).*)'],
}
