import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { pathname } = request.nextUrl

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch role only when authenticated
  let role: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    role = profile?.role ?? null
  }

  const isAuthenticated = !!user

  // Redirect root
  if (pathname === '/') {
    if (!isAuthenticated) return NextResponse.redirect(new URL('/login', request.url))
    return NextResponse.redirect(new URL(role === 'parent' ? '/parent' : '/child', request.url))
  }

  // Redirect logged-in users away from login
  if (pathname === '/login' && isAuthenticated) {
    return NextResponse.redirect(new URL(role === 'parent' ? '/parent' : '/child', request.url))
  }

  // Protect /child routes
  if (pathname.startsWith('/child')) {
    if (!isAuthenticated) return NextResponse.redirect(new URL('/login', request.url))
    if (role !== 'child') return NextResponse.redirect(new URL('/parent', request.url))
  }

  // Protect /parent routes
  if (pathname.startsWith('/parent')) {
    if (!isAuthenticated) return NextResponse.redirect(new URL('/login', request.url))
    if (role !== 'parent') return NextResponse.redirect(new URL('/child', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/', '/login', '/child/:path*', '/parent/:path*'],
}
