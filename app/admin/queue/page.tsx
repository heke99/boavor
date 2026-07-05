import { AdminShell } from '@/components/admin/AdminShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { adjustQueuePointsAction, setQueueStatusAction } from './actions'
import { requireAdminUser } from '@/lib/data/admin'

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, string> = {
  inactive: 'Inaktiv',
  active: 'Aktiv',
  paused: 'Pausad',
  cancelled: 'Avslutad',
  expired: 'Utgången',
}

function formatDateTime(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('sv-SE', { dateStyle: 'short' }).format(new Date(value))
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function AdminQueuePage({ searchParams }: Props) {
  const params = await searchParams
  const { supabase } = await requireAdminUser()

  const { data: memberships, error } = await supabase.rpc('admin_queue_overview')
  if (error) console.error('Failed to fetch queue overview', error)

  const inspectUserId = typeof params.user === 'string' ? params.user : null
  const { data: ledger } = inspectUserId
    ? await supabase
        .from('queue_point_ledger')
        .select('id, user_id, event_type, points_delta, balance_after, note, created_at')
        .eq('user_id', inspectUserId)
        .order('created_at', { ascending: false })
        .limit(50)
    : { data: null }

  return (
    <AdminShell
      activePath="/admin/queue"
      title="Bostadskö"
      description="Hantera kömedlemskap, justera poäng och inspektera poänghistorik. Alla justeringar kräver notering och loggas i audit-loggen."
    >
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Justera köpoäng</h2>
        <p className="mt-1 text-sm text-[#6b7280]">
          Positivt eller negativt antal poäng. Notering är obligatorisk. Ange datum för att korrigera köstart (t.ex.
          vid migrering av historisk kötid).
        </p>
        <form action={adjustQueuePointsAction} className="mt-5 grid gap-4 md:grid-cols-[1fr_140px_1fr_180px_auto]">
          <Input name="userId" placeholder="Användar-ID (uuid)" required className="h-12 rounded-2xl border-[#d7dbe7]" />
          <Input name="delta" type="number" placeholder="± poäng" required className="h-12 rounded-2xl border-[#d7dbe7]" />
          <Input name="note" placeholder="Notering (obligatorisk)" required className="h-12 rounded-2xl border-[#d7dbe7]" />
          <Input name="joinedAt" type="date" className="h-12 rounded-2xl border-[#d7dbe7]" />
          <Button className="h-12">Justera</Button>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Ändra köstatus</h2>
        <form action={setQueueStatusAction} className="mt-5 grid gap-4 md:grid-cols-[1fr_180px_1fr_auto]">
          <Input name="userId" placeholder="Användar-ID (uuid)" required className="h-12 rounded-2xl border-[#d7dbe7]" />
          <Select name="status" defaultValue="paused" className="h-12 rounded-2xl border-[#d7dbe7]">
            <option value="active">Aktiv</option>
            <option value="paused">Frys/pausa</option>
            <option value="cancelled">Avsluta</option>
            <option value="expired">Utgången</option>
          </Select>
          <Input name="note" placeholder="Notering" className="h-12 rounded-2xl border-[#d7dbe7]" />
          <Button className="h-12">Uppdatera</Button>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Kömedlemskap</h2>
        {!memberships || memberships.length === 0 ? (
          <p className="mt-5 rounded-2xl bg-[#f7f8fc] p-4 text-sm text-[#6b7280]">Inga kömedlemskap ännu.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-[#eef0f6] text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                  <th className="py-3 pr-4">Användare</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Kötyp</th>
                  <th className="py-3 pr-4">Köstart</th>
                  <th className="py-3 pr-4">Poäng</th>
                  <th className="py-3 pr-4">Nollställd</th>
                  <th className="py-3">Historik</th>
                </tr>
              </thead>
              <tbody>
                {memberships.map((membership) => (
                  <tr key={membership.membership_id} className="border-b border-[#f4f5fa]">
                    <td className="py-3 pr-4 font-mono text-xs">{membership.user_id}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          membership.membership_status === 'active'
                            ? 'bg-[#dcfce7] text-[#166534]'
                            : 'bg-[#f3f4f6] text-[#6b7280]'
                        }`}
                      >
                        {STATUS_LABELS[membership.membership_status] ?? membership.membership_status}
                      </span>
                    </td>
                    <td className="py-3 pr-4">{membership.queue_type}</td>
                    <td className="py-3 pr-4">{formatDateTime(membership.joined_queue_at)}</td>
                    <td className="py-3 pr-4 font-semibold">{membership.current_points}</td>
                    <td className="py-3 pr-4">{formatDateTime(membership.points_reset_at)}</td>
                    <td className="py-3">
                      <a href={`/admin/queue?user=${membership.user_id}`} className="text-sm font-semibold text-[#5b3df5]">
                        Visa ledger
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {inspectUserId ? (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-[#111827]">
            Poänghistorik för <span className="font-mono text-base">{inspectUserId.slice(0, 8)}…</span>
          </h2>
          {!ledger || ledger.length === 0 ? (
            <p className="mt-5 rounded-2xl bg-[#f7f8fc] p-4 text-sm text-[#6b7280]">Inga ledger-poster.</p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-[#eef0f6] text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                    <th className="py-3 pr-4">Händelse</th>
                    <th className="py-3 pr-4">Δ Poäng</th>
                    <th className="py-3 pr-4">Saldo</th>
                    <th className="py-3 pr-4">Notering</th>
                    <th className="py-3">Tidpunkt</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((entry) => (
                    <tr key={entry.id} className="border-b border-[#f4f5fa]">
                      <td className="py-3 pr-4 font-semibold">{entry.event_type}</td>
                      <td className="py-3 pr-4">{entry.points_delta >= 0 ? `+${entry.points_delta}` : entry.points_delta}</td>
                      <td className="py-3 pr-4">{entry.balance_after}</td>
                      <td className="max-w-[280px] py-3 pr-4 text-[#6b7280]">{entry.note ?? '—'}</td>
                      <td className="py-3">{new Intl.DateTimeFormat('sv-SE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(entry.created_at))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}
    </AdminShell>
  )
}
