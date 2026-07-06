import { NextResponse, type NextRequest } from 'next/server'
import { authenticateApiRequest, logApiRequest } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

/** Key validation endpoint: returns the key's scopes. */
export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request, null)
  if (auth instanceof NextResponse) return auth

  await logApiRequest(auth.supabase, auth.keyId, request, 200)
  return NextResponse.json({ ok: true, scopes: auth.scopes })
}
