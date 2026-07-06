import { Download } from 'lucide-react'
import { AdminShell } from '@/components/admin/AdminShell'
import { Card } from '@/components/ui/Card'
import { requireAdminUser } from '@/lib/data/admin'
import { getAdminAnalyticsOverview, type AdminDailyMetric } from '@/lib/data/analytics'

export const dynamic = 'force-dynamic'

const metricLabels: Record<string, string> = {
  new_users: 'Nya användare',
  applications_created: 'Nya ansökningar',
  inquiries_created: 'Nya intresseanmälningar',
  listings_created: 'Nya annonser',
  'events.listing_view': 'Annonsvisningar',
  'events.search_performed': 'Sökningar',
  'events.application_submitted': 'Ansökningar (händelser)',
  'events.inquiry_submitted': 'Intresseanmälningar (händelser)',
  'events.saved_search_created': 'Sparade sökningar',
  'events.exchange_interest': 'Bytesintressen',
  'events.registration_completed': 'Slutförda registreringar',
  'events.queue_joined': 'Nya kömedlemmar',
}

const eventLabels: Record<string, string> = {
  listing_view: 'Annonsvisningar',
  search_performed: 'Sökningar',
  application_submitted: 'Ansökningar',
  inquiry_submitted: 'Intresseanmälningar',
  saved_search_created: 'Sparade sökningar',
  exchange_interest: 'Bytesintressen',
  registration_completed: 'Registreringar',
  queue_joined: 'Kömedlemskap',
}

function MetricTrend({ metric, rows }: { metric: string; rows: AdminDailyMetric[] }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0)
  const max = Math.max(...rows.map((row) => row.value), 1)
  const recent = rows.slice(-14)

  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-sm font-medium text-[#6b7280]">{metricLabels[metric] ?? metric}</div>
        <div className="text-2xl font-semibold text-[#111827]">{total}</div>
      </div>
      <div className="mt-4 flex h-16 items-end gap-1" aria-hidden>
        {recent.map((row) => (
          <div
            key={row.day}
            title={`${row.day}: ${row.value}`}
            className="flex-1 rounded-t bg-[#5b3df5]/70"
            style={{ height: `${Math.max(6, Math.round((row.value / max) * 100))}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-[#9ca3af]">
        <span>{recent[0]?.day ?? ''}</span>
        <span>{recent[recent.length - 1]?.day ?? ''}</span>
      </div>
    </Card>
  )
}

export default async function AdminAnalyticsPage() {
  const { supabase } = await requireAdminUser()
  const overview = await getAdminAnalyticsOverview(supabase, 30)

  const byMetric = new Map<string, AdminDailyMetric[]>()
  for (const row of overview.daily) {
    if (row.dimension !== 'all') continue
    const list = byMetric.get(row.metric) ?? []
    list.push(row)
    byMetric.set(row.metric, list)
  }
  const orderedMetrics = [...byMetric.keys()].sort((a, b) => {
    const order = Object.keys(metricLabels)
    return (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b))
  })

  return (
    <AdminShell
      activePath="/admin/analytics"
      title="Analys"
      description={`Dagliga aggregat för de senaste ${overview.windowDays} dagarna plus råa händelser för de senaste 7 dagarna. All statistik är aggregerad — inga persondata.`}
    >
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[#111827]">Händelser senaste 7 dagarna</h2>
          <a
            href="/admin/analytics/export"
            className="inline-flex items-center gap-2 rounded-full border border-[#e8ebf3] bg-white px-4 py-2 text-xs font-semibold text-[#111827] transition hover:bg-[#f7f8fc]"
          >
            <Download size={14} />
            Exportera CSV
          </a>
        </div>
        {overview.recentEventCounts.length === 0 ? (
          <p className="mt-4 text-sm text-[#6b7280]">Inga händelser registrerade ännu.</p>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {overview.recentEventCounts.map((row) => (
              <div key={row.eventType} className="rounded-2xl border border-[#e8ebf3] p-4">
                <div className="text-sm text-[#6b7280]">{eventLabels[row.eventType] ?? row.eventType}</div>
                <div className="mt-1 text-2xl font-semibold text-[#111827]">{row.events}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div>
        <h2 className="mb-4 text-xl font-semibold text-[#111827]">Dagliga aggregat ({overview.windowDays} dagar)</h2>
        {orderedMetrics.length === 0 ? (
          <Card className="p-6">
            <p className="text-sm text-[#6b7280]">
              Inga dagliga aggregat ännu. Kör cron-jobbet <code className="rounded bg-[#f3f4f6] px-1">/api/cron/analytics-rollup</code>{' '}
              (schemalagt varje natt) för att fylla på tabellen.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {orderedMetrics.map((metric) => (
              <MetricTrend key={metric} metric={metric} rows={byMetric.get(metric) ?? []} />
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  )
}
