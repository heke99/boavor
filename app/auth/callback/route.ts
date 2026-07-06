import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { trackEvent } from '@/lib/analytics/track'
import { getSafeNextPath } from '@/lib/url'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = getSafeNextPath(requestUrl.searchParams.get('next'))

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing-auth-code', requestUrl.origin))
  }

  const supabase = await createSupabaseServerClient()
  if (!supabase) {
    return NextResponse.redirect(new URL('/login?error=supabase-not-configured', requestUrl.origin))
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(new URL('/login?error=auth-callback-failed', requestUrl.origin))
  }

  // The callback also runs for magic links and OAuth logins; treat only
  // accounts created within the last 15 minutes as completed registrations.
  const createdAt = data.user?.created_at ? new Date(data.user.created_at).getTime() : null
  if (createdAt && Date.now() - createdAt < 15 * 60 * 1000) {
    await trackEvent('registration_completed')
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin))
}
