import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseEnv, hasSupabaseEnv } from '@/lib/supabase/env'

/** Hostnames that always serve the main site (never portal rewrites). */
function isPlatformHost(host: string): boolean {
  const siteHost = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname : null
  return (
    host === 'localhost' ||
    host.startsWith('localhost:') ||
    host.startsWith('127.0.0.1') ||
    host.endsWith('.vercel.app') ||
    (siteHost !== null && (host === siteHost || host === `www.${siteHost}`))
  )
}

/**
 * White-label domain mapping: requests on a mapped custom domain are
 * rewritten to the portal route. Only the root path is rewritten; deep
 * paths (login, listings, api) continue to work as the main app.
 */
async function rewriteForCustomDomain(request: NextRequest): Promise<NextResponse | null> {
  const host = request.headers.get('host')?.toLowerCase() ?? ''
  if (!host || isPlatformHost(host) || request.nextUrl.pathname !== '/') return null

  const { url, anonKey } = getSupabaseEnv()
  // Plain client (no cookies) — this lookup is anonymous and read-only.
  const supabase = createClient(url, anonKey, { auth: { persistSession: false } })
  const { data: portal } = await supabase
    .from('tenant_portals')
    .select('slug')
    .eq('custom_domain', host)
    .eq('is_active', true)
    .maybeSingle()

  if (!portal) return null
  const rewriteUrl = request.nextUrl.clone()
  rewriteUrl.pathname = `/p/${portal.slug}`
  return NextResponse.rewrite(rewriteUrl)
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  if (!hasSupabaseEnv()) {
    return response
  }

  const portalRewrite = await rewriteForCustomDomain(request)
  if (portalRewrite) return portalRewrite

  const { url, anonKey } = getSupabaseEnv()
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
