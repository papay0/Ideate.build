import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/blog(.*)',
  '/api/webhook(.*)',
  '/api/stripe/webhook(.*)',
  '/api/og(.*)',
])

const isAdminRoute = createRouteMatcher(['/admin(.*)'])

// Lazy Supabase client for admin check (only used on admin routes)
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default clerkMiddleware(async (auth, request) => {
  // Public routes - no auth needed
  if (isPublicRoute(request)) {
    return NextResponse.next()
  }

  // Protected routes - require auth
  const { userId } = await auth.protect()

  // Admin routes - also require admin role (this is the only place we query Supabase)
  if (isAdminRoute(request)) {
    const supabase = getSupabaseAdmin()
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .single()

    if (user?.role !== 'admin') {
      return NextResponse.redirect(new URL('/home', request.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
