import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/data/admin'
import { getAdminAnalyticsOverview } from '@/lib/data/analytics'
import { toCsv } from '@/lib/analytics/csv'

export const dynamic = 'force-dynamic'

/** CSV export of the daily analytics aggregates (last 90 days). */
export async function GET() {
  const { supabase } = await requireAdminUser()
  const overview = await getAdminAnalyticsOverview(supabase, 90)

  const csv = toCsv(
    ['dag', 'matvarde', 'dimension', 'varde'],
    overview.daily.map((row) => [row.day, row.metric, row.dimension, row.value]),
  )

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="bovaro-analys-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
