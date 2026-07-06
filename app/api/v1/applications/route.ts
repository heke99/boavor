import { NextResponse, type NextRequest } from 'next/server'
import { authenticateApiRequest, logApiRequest } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/applications — incoming applications for the key owner
 * (scope: applications:read). Returns workflow data the landlord already
 * sees in the UI; documents and snapshots are NOT exposed via the API.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request, 'applications:read')
  if (auth instanceof NextResponse) return auth
  const { supabase, companyId, ownerUserId } = auth

  const status = request.nextUrl.searchParams.get('status')
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? 50) || 50, 100)

  let query = supabase
    .from('rental_applications')
    .select('id, listing_id, listing_slug, listing_title, listing_city, status, queue_points_snapshot, applicant_full_name, applicant_email, move_in_date, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  query = companyId
    ? query.eq('landlord_company_id', companyId)
    : query.eq('landlord_user_id', ownerUserId as string)
  if (status) query = query.eq('status', status as never)

  const { data, error } = await query
  if (error) {
    await logApiRequest(supabase, auth.keyId, request, 500)
    return NextResponse.json({ error: { code: 'query_failed', message: 'Kunde inte hämta ansökningar.' } }, { status: 500 })
  }

  await logApiRequest(supabase, auth.keyId, request, 200)
  return NextResponse.json({ data: data ?? [] })
}
