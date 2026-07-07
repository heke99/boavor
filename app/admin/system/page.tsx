import Link from 'next/link'
import { AdminShell } from '@/components/admin/AdminShell'
import { Card } from '@/components/ui/Card'
import {
  getAdminAuditLogs,
  getAdminDocumentAccessLogs,
  getAdminPrivacyRequests,
  getAdminRateLimitEvents,
} from '@/lib/data/admin'

export const dynamic = 'force-dynamic'

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('sv-SE')
}

function CompactTable<T>({
  title,
  rows,
  render,
}: {
  title: string
  rows: T[]
  render: (row: T) => React.ReactNode
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-[#e8ebf3] p-5">
        <h2 className="text-xl font-semibold text-[#111827]">{title}</h2>
      </div>
      <div className="divide-y divide-[#eef0f6]">
        {rows.length ? rows.map(render) : <p className="p-5 text-sm text-[#6b7280]">Inga händelser att visa.</p>}
      </div>
    </Card>
  )
}

function buildQuery(params: Record<string, string | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value)
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

export default async function AdminSystemPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; targetType?: string; from?: string; to?: string; page?: string }>
}) {
  const params = await searchParams
  const auditFilters = {
    action: params.action?.trim() || undefined,
    targetType: params.targetType?.trim() || undefined,
    from: params.from?.trim() || undefined,
    to: params.to?.trim() || undefined,
    page: Number(params.page ?? 1) || 1,
    pageSize: 30,
  }

  const [audit, privacyRequests, rateLimitEvents, documentLogs] = await Promise.all([
    getAdminAuditLogs(auditFilters),
    getAdminPrivacyRequests(30),
    getAdminRateLimitEvents(30),
    getAdminDocumentAccessLogs(30),
  ])

  const filterQuery = {
    action: auditFilters.action,
    targetType: auditFilters.targetType,
    from: auditFilters.from,
    to: auditFilters.to,
  }

  return (
    <AdminShell
      activePath="/admin/system"
      title="System och revision"
      description="Operativ vy för audit logs, integritetsärenden, rate limiting och dokumentåtkomst."
    >
      <Card className="overflow-hidden p-0">
        <div className="border-b border-[#e8ebf3] p-5">
          <h2 className="text-xl font-semibold text-[#111827]">Admin audit</h2>
          <form method="GET" className="mt-4 grid gap-3 md:grid-cols-5">
            <input
              type="text"
              name="action"
              placeholder="Åtgärd, t.ex. listing_status"
              defaultValue={auditFilters.action ?? ''}
              className="rounded-xl border border-[#e8ebf3] px-3 py-2 text-sm"
            />
            <input
              type="text"
              name="targetType"
              placeholder="Måltyp, t.ex. company"
              defaultValue={auditFilters.targetType ?? ''}
              className="rounded-xl border border-[#e8ebf3] px-3 py-2 text-sm"
            />
            <input
              type="date"
              name="from"
              defaultValue={auditFilters.from ?? ''}
              className="rounded-xl border border-[#e8ebf3] px-3 py-2 text-sm"
            />
            <input
              type="date"
              name="to"
              defaultValue={auditFilters.to ?? ''}
              className="rounded-xl border border-[#e8ebf3] px-3 py-2 text-sm"
            />
            <div className="flex items-center gap-2">
              <button type="submit" className="rounded-xl bg-[#111827] px-4 py-2 text-sm font-semibold text-white">
                Filtrera
              </button>
              <Link href="/admin/system" className="text-sm text-[#6b7280] hover:underline">
                Rensa
              </Link>
            </div>
          </form>
        </div>
        <div className="divide-y divide-[#eef0f6]">
          {audit.rows.length ? (
            audit.rows.map((row) => (
              <div key={row.id} className="p-5 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-[#111827]">{row.action}</span>
                  <span className="rounded-full bg-[#f3f4f6] px-2 py-0.5 text-xs font-semibold text-[#4b5563]">{row.target_type}</span>
                </div>
                <div className="mt-1 text-[#6b7280]">
                  {row.actor_name ?? (row.admin_user_id ? `Admin ${row.admin_user_id.slice(0, 8)}` : 'System')}
                  {' · '}
                  {row.target_id ?? row.resource_key ?? 'utan mål'}
                  {' · '}
                  {formatDate(row.created_at)}
                </div>
                {row.metadata && Object.keys(row.metadata).length ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-semibold text-[#5b3df5]">Detaljer</summary>
                    <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-[#f7f8fc] p-3 text-xs text-[#374151]">
                      {JSON.stringify(row.metadata, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </div>
            ))
          ) : (
            <p className="p-5 text-sm text-[#6b7280]">Inga händelser matchar filtren.</p>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-[#e8ebf3] p-4 text-sm">
          <div>
            {audit.page > 1 ? (
              <Link
                href={`/admin/system${buildQuery({ ...filterQuery, page: String(audit.page - 1) })}`}
                className="font-semibold text-[#5b3df5] hover:underline"
              >
                Föregående
              </Link>
            ) : (
              <span className="text-[#9ca3af]">Föregående</span>
            )}
          </div>
          <span className="text-[#6b7280]">Sida {audit.page}</span>
          <div>
            {audit.hasMore ? (
              <Link
                href={`/admin/system${buildQuery({ ...filterQuery, page: String(audit.page + 1) })}`}
                className="font-semibold text-[#5b3df5] hover:underline"
              >
                Nästa
              </Link>
            ) : (
              <span className="text-[#9ca3af]">Nästa</span>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <CompactTable
          title="Integritetsärenden"
          rows={privacyRequests}
          render={(row) => (
            <div key={row.id} className="p-5 text-sm">
              <div className="font-semibold text-[#111827]">{row.request_type} · {row.status}</div>
              <div className="mt-1 text-[#6b7280]">{row.message ?? 'Ingen notering'} · {formatDate(row.created_at)}</div>
            </div>
          )}
        />

        <CompactTable
          title="Rate limit events"
          rows={rateLimitEvents}
          render={(row) => (
            <div key={row.id} className="p-5 text-sm">
              <div className="font-semibold text-[#111827]">{row.scope}</div>
              <div className="mt-1 text-[#6b7280]">{row.subject_hash.slice(0, 12)}... · {formatDate(row.created_at)}</div>
            </div>
          )}
        />

        <CompactTable
          title="Dokumentåtkomst"
          rows={documentLogs}
          render={(row) => (
            <div key={row.id} className="p-5 text-sm">
              <div className="font-semibold text-[#111827]">{row.access_type}</div>
              <div className="mt-1 text-[#6b7280]">Aktör {row.actor_user_id?.slice(0, 8) ?? '-'} · {formatDate(row.created_at)}</div>
            </div>
          )}
        />
      </div>
    </AdminShell>
  )
}
