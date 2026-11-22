import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Handles the OAuth redirect from Supabase after Google consent.
// @supabase/ssr uses PKCE by default, so the browser receives a `code` here
// that must be exchanged server-side before a session cookie is written.
//
// IMPORTANT: we cannot use createServerSupabase() here because its setAll handler
// writes to the next/headers cookies() store, which is NOT the same as the
// NextResponse.redirect() object we return. The session cookies would be silently
// discarded and the user would land on the dashboard with no session.
// Instead we wire setAll directly onto the redirect response's cookie jar.
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  // `next` lets callers (e.g. the password-reset email) control where we land
  // after a successful exchange instead of always going to /dashboard.
  const next = searchParams.get('next') ?? '/dashboard'
  const safeNext = next.startsWith('/') ? next : '/dashboard'

  if (code) {
    const successRedirect = NextResponse.redirect(`${origin}${safeNext}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              successRedirect.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      console.log(`[auth/callback] session exchange OK — redirecting to ${safeNext}`)
      return successRedirect
    }
    console.error('[auth/callback] exchangeCodeForSession failed:', error.message)
  } else {
    console.error('[auth/callback] no code in query string')
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`)
}
