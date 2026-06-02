import { NextResponse } from 'next/server'
import { getReadinessPayload } from '@/lib/health'

export async function GET() {
  const payload = await getReadinessPayload()
  return NextResponse.json(payload, { status: payload.ok ? 200 : 503 })
}
