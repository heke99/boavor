import Link from 'next/link'
import { AdminShell } from '@/components/admin/AdminShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { requireAdminUser } from '@/lib/data/admin'
import { isGrantActive } from '@/lib/admin/support-access'
import { createSupportGrantAction, revokeSupportGrantAction } from './actions'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const threadTypeLabels: Record<string, string> = {
  application: 'Ansökan',
  listing: 'Annons',
  support: 'Support',
  exchange: 'Byte',
}

const errorMessages: Record<string, string> = {
  thread_required: 'Välj en konversation.',
  reason_required: 'Ange en motivering på minst 10 tecken — den loggas i granskningsloggen.',
  failed: 'Åtkomsten kunde inte skapas. Försök igen.',
}

function formatDateTime(value: string | null) {
  if (!value) return '–'
  return new Date(value).toLocaleString('sv-SE')
}

const inputClass =
  'w-full rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#5b3df5]'

export default async function AdminSupportPage({ searchParams }: Props) {
  const params = await searchParams
  const errorKey = typeof params.error === 'string' ? params.error : null
  const { supabase } = await requireAdminUser()

  const [{ data: threads }, { data: grants }] = await Promise.all([
    supabase.rpc('admin_recent_message_threads', { p_limit: 100 }),
    supabase
      .from('support_access_grants')
      .select('id, admin_user_id, thread_id, reason, expires_at, revoked_at, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  // Captured once per request so the render stays idempotent.
  const renderedAt = new Date()

  return (
    <AdminShell
      activePath="/admin/support"
      title="Supportläge"
      description="Tidsbegränsad, motiverad läsåtkomst till konversationer. Admins kan aldrig agera som en användare eller skriva i trådar — all åtkomst granskningsloggas."
    >
      {errorKey && errorMessages[errorKey] ? (
        <Card className="border border-[#fecaca] bg-[#fef2f2] p-5 text-sm font-semibold text-[#b91c1c]">
          {errorMessages[errorKey]}
        </Card>
      ) : null}

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Begär läsåtkomst</h2>
        <p className="mt-2 text-sm leading-6 text-[#6b7280]">
          Åtkomsten gäller en konversation, är tidsbegränsad och kräver en motivering som sparas i granskningsloggen.
        </p>
        <form action={createSupportGrantAction} className="mt-5 grid gap-4 md:grid-cols-[1fr_140px_auto]">
          <div className="md:col-span-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Konversation *</span>
              <select name="threadId" required className={inputClass} defaultValue="">
                <option value="" disabled>
                  Välj konversation…
                </option>
                {(threads ?? []).map((thread) => (
                  <option key={thread.id} value={thread.id}>
                    {threadTypeLabels[thread.thread_type] ?? thread.thread_type} · {thread.subject} · {thread.message_count} meddelanden
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block md:col-span-1">
            <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Motivering * (min 10 tecken)</span>
            <input name="reason" required minLength={10} maxLength={300} className={inputClass} placeholder="T.ex. Supportärende #123: användaren ser inte hyresvärdens svar" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Timmar</span>
            <select name="hours" className={inputClass} defaultValue="1">
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="4">4</option>
            </select>
          </label>
          <div className="flex items-end">
            <Button type="submit" className="h-12">Skapa åtkomst</Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Åtkomster</h2>
        {!grants?.length ? (
          <p className="mt-4 text-sm text-[#6b7280]">Inga supportåtkomster har skapats.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {grants.map((grant) => {
              const active = isGrantActive({ expiresAt: grant.expires_at, revokedAt: grant.revoked_at }, renderedAt)
              return (
                <div key={grant.id} className="rounded-2xl border border-[#e8ebf3] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={
                            active
                              ? 'rounded-full bg-[#ecfdf5] px-3 py-1 text-xs font-semibold text-[#047857]'
                              : 'rounded-full bg-[#f3f4f6] px-3 py-1 text-xs font-semibold text-[#6b7280]'
                          }
                        >
                          {active ? 'Aktiv' : grant.revoked_at ? 'Återkallad' : 'Utgången'}
                        </span>
                        <span className="text-xs text-[#6b7280]">
                          Tråd {grant.thread_id.slice(0, 8)}… · admin {grant.admin_user_id.slice(0, 8)}… · till {formatDateTime(grant.expires_at)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[#374151]">{grant.reason}</p>
                    </div>
                    <div className="flex gap-2">
                      {active ? (
                        <>
                          <Link
                            href={`/admin/support/${grant.thread_id}`}
                            className="inline-flex h-9 items-center rounded-xl border border-[#d7dbe7] bg-white px-3 text-xs font-semibold text-[#111827] hover:bg-[#f7f8fc]"
                          >
                            Öppna (läs)
                          </Link>
                          <form action={revokeSupportGrantAction}>
                            <input type="hidden" name="grantId" value={grant.id} />
                            <Button type="submit" variant="ghost" className="h-9 px-3 text-xs !text-[#b91c1c]">
                              Återkalla
                            </Button>
                          </form>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Konversationer (metadata)</h2>
        <p className="mt-2 text-sm leading-6 text-[#6b7280]">
          Endast metadata visas här. Innehåll kräver en aktiv, motiverad åtkomst ovan.
        </p>
        <div className="mt-5 overflow-x-auto rounded-2xl border border-[#e8ebf3]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-[#f7f8fc] text-xs uppercase tracking-[0.12em] text-[#6b7280]">
              <tr>
                <th className="px-4 py-3">Ämne</th>
                <th className="px-4 py-3">Typ</th>
                <th className="px-4 py-3 text-right">Deltagare</th>
                <th className="px-4 py-3 text-right">Meddelanden</th>
                <th className="px-4 py-3">Senaste aktivitet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8ebf3]">
              {(threads ?? []).map((thread) => (
                <tr key={thread.id}>
                  <td className="px-4 py-3 font-semibold text-[#111827]">{thread.subject}</td>
                  <td className="px-4 py-3 text-[#6b7280]">{threadTypeLabels[thread.thread_type] ?? thread.thread_type}</td>
                  <td className="px-4 py-3 text-right text-[#6b7280]">{thread.participant_count}</td>
                  <td className="px-4 py-3 text-right text-[#6b7280]">{thread.message_count}</td>
                  <td className="px-4 py-3 text-[#6b7280]">{formatDateTime(thread.last_message_at)}</td>
                </tr>
              ))}
              {!threads?.length ? (
                <tr>
                  <td colSpan={5} className="px-4 py-5 text-sm text-[#6b7280]">Inga konversationer ännu.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminShell>
  )
}
