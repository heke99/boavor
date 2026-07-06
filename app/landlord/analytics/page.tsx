import { Download } from 'lucide-react'
import { LandlordShell } from '@/components/landlord/LandlordShell'
import { Card } from '@/components/ui/Card'
import { requireLandlordAccess } from '@/lib/data/landlord'
import { getLandlordListingInsights } from '@/lib/data/analytics'

export const dynamic = 'force-dynamic'

const statusLabels: Record<string, string> = {
  draft: 'Utkast',
  published: 'Publicerad',
  paused: 'Pausad',
  rented: 'Uthyrd',
  sold: 'Såld',
  archived: 'Arkiverad',
}

function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <Card className="p-5">
      <div className="text-sm font-medium text-[#6b7280]">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-[#111827]">{value}</div>
      {hint ? <div className="mt-2 text-xs text-[#6b7280]">{hint}</div> : null}
    </Card>
  )
}

export default async function LandlordAnalyticsPage() {
  const context = await requireLandlordAccess()
  const insights = await getLandlordListingInsights(context, 30)

  const overallConversion =
    insights.totals.views > 0 ? `${Math.round((insights.totals.applications / insights.totals.views) * 1000) / 10}%` : '–'

  return (
    <LandlordShell
      activePath="/landlord/analytics"
      title="Analys"
      description={`Visningar, ansökningar och intresseanmälningar per annons de senaste ${insights.windowDays} dagarna. Endast aggregerad statistik — aldrig enskilda besökare.`}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sidvisningar" value={insights.totals.views} hint={`Senaste ${insights.windowDays} dagarna`} />
        <StatCard label="Ansökningar" value={insights.totals.applications} hint={`Senaste ${insights.windowDays} dagarna`} />
        <StatCard label="Intresseanmälningar" value={insights.totals.inquiries} hint={`Senaste ${insights.windowDays} dagarna`} />
        <StatCard label="Konvertering" value={overallConversion} hint="Ansökningar per sidvisning" />
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[#111827]">Per annons</h2>
          <a
            href="/landlord/analytics/export"
            className="inline-flex items-center gap-2 rounded-full border border-[#e8ebf3] bg-white px-4 py-2 text-xs font-semibold text-[#111827] transition hover:bg-[#f7f8fc]"
          >
            <Download size={14} />
            Exportera CSV
          </a>
        </div>

        {insights.rows.length === 0 ? (
          <p className="mt-5 text-sm text-[#6b7280]">
            Inga annonser ännu. Statistiken fylls på när dina annonser börjar visas och få ansökningar.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-[#e8ebf3]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f7f8fc] text-xs uppercase tracking-[0.12em] text-[#6b7280]">
                <tr>
                  <th className="px-4 py-3">Annons</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Visningar</th>
                  <th className="px-4 py-3 text-right">Ansökningar</th>
                  <th className="px-4 py-3 text-right">Intresse</th>
                  <th className="px-4 py-3 text-right">Konvertering</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8ebf3]">
                {insights.rows.map((row) => (
                  <tr key={row.listingId}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#111827]">{row.title}</div>
                      <div className="text-xs text-[#6b7280]">{row.city}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#243b8f]">
                        {statusLabels[row.status] ?? row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[#111827]">{row.views}</td>
                    <td className="px-4 py-3 text-right text-[#111827]">{row.applications}</td>
                    <td className="px-4 py-3 text-right text-[#111827]">{row.inquiries}</td>
                    <td className="px-4 py-3 text-right text-[#6b7280]">
                      {row.conversionPercent === null ? '–' : `${row.conversionPercent}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-xs leading-5 text-[#6b7280]">
          Sidvisningar räknas från annonssidan och innehåller ingen information om vem som tittade. Konvertering =
          ansökningar delat med visningar under perioden.
        </p>
      </Card>
    </LandlordShell>
  )
}
