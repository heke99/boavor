import { NextResponse, type NextRequest } from 'next/server'
import { authenticateApiRequest, logApiRequest } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/listings — the key owner's listings (scope: listings:read).
 * Optional query: status=published|draft|… & limit (max 100).
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request, 'listings:read')
  if (auth instanceof NextResponse) return auth
  const { supabase, companyId, ownerUserId } = auth

  const status = request.nextUrl.searchParams.get('status')
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? 50) || 50, 100)

  let query = supabase
    .from('listings')
    .select('id, slug, title, status, listing_type, listing_segment, property_type, city, area_name, price, rooms, area_sqm, published_at, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  query = companyId ? query.eq('company_id', companyId) : query.eq('created_by', ownerUserId as string)
  if (status) query = query.eq('status', status as 'draft' | 'published' | 'paused' | 'rented' | 'sold' | 'archived')

  const { data, error } = await query
  if (error) {
    await logApiRequest(supabase, auth.keyId, request, 500)
    return NextResponse.json({ error: { code: 'query_failed', message: 'Kunde inte hämta annonser.' } }, { status: 500 })
  }

  await logApiRequest(supabase, auth.keyId, request, 200)
  return NextResponse.json({ data: data ?? [] })
}
