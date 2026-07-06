import { NextResponse } from 'next/server'
import { requireLandlordAccess } from '@/lib/data/landlord'
import { getLandlordListingInsights } from '@/lib/data/analytics'
import { toCsv } from '@/lib/analytics/csv'

export const dynamic = 'force-dynamic'

/** CSV export of the landlord's per-listing insights (aggregates only). */
export async function GET() {
  const context = await requireLandlordAccess()
  const insights = await getLandlordListingInsights(context, 30)

  const csv = toCsv(
    ['annons', 'stad', 'status', 'visningar', 'ansokningar', 'intresseanmalningar', 'konvertering_procent'],
    insights.rows.map((row) => [
      row.title,
      row.city,
      row.status,
      row.views,
      row.applications,
      row.inquiries,
      row.conversionPercent,
    ]),
  )

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="bovaro-annonsstatistik-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
