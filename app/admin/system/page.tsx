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

export default async function AdminSystemPage() {
  const [auditLogs, privacyRequests, rateLimitEvents, documentLogs] = await Promise.all([
    getAdminAuditLogs(30),
    getAdminPrivacyRequests(30),
    getAdminRateLimitEvents(30),
    getAdminDocumentAccessLogs(30),
  ])

  return (
    <AdminShell
      activePath="/admin/system"
      title="System och revision"
      description="Operativ vy för audit logs, integritetsärenden, rate limiting och dokumentåtkomst."
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <CompactTable
          title="Admin audit"
          rows={auditLogs}
          render={(row) => (
            <div key={row.id} className="p-5 text-sm">
              <div className="font-semibold text-[#111827]">{row.action}</div>
              <div className="mt-1 text-[#6b7280]">{row.target_type} · {row.target_id ?? 'utan mål'} · {formatDate(row.created_at)}</div>
            </div>
          )}
        />

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
