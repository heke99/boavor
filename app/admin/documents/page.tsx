import { AdminShell } from '@/components/admin/AdminShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { reviewProfileDocumentAction } from './actions'
import { requireAdminUser } from '@/lib/data/admin'

export const dynamic = 'force-dynamic'

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  employment_certificate: 'Anställningsintyg',
  salary_slip: 'Lönespecifikation',
  reference: 'Referens',
  id_document: 'ID-handling',
  income_proof: 'Inkomstintyg',
  register_extract: 'Registerutdrag',
  student_certificate: 'Studieintyg',
  other: 'Annat',
  general: 'Allmänt',
}

const STATUS_LABELS: Record<string, string> = {
  pending_review: 'Väntar på granskning',
  active: 'Godkänt',
  rejected: 'Nekat',
  expired: 'Utgånget',
  replaced: 'Ersatt',
}

function formatDateTime(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('sv-SE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

export default async function AdminDocumentsPage() {
  const { supabase } = await requireAdminUser()

  const { data: pending } = await supabase
    .from('profile_documents')
    .select('id, user_id, file_name, document_type, document_status, document_expires_at, created_at')
    .eq('document_status', 'pending_review')
    .order('created_at', { ascending: true })
    .limit(100)

  const { data: recentlyReviewed } = await supabase
    .from('profile_documents')
    .select('id, user_id, file_name, document_type, document_status, reviewed_at, rejection_reason')
    .in('document_status', ['active', 'rejected'])
    .not('reviewed_at', 'is', null)
    .order('reviewed_at', { ascending: false })
    .limit(50)

  return (
    <AdminShell
      activePath="/admin/documents"
      title="Dokumentgranskning"
      description="Granska uppladdade profildokument. Dokumentinnehåll öppnas via signerade länkar och varje åtkomst loggas."
    >
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Väntar på granskning</h2>
        {!pending || pending.length === 0 ? (
          <p className="mt-5 rounded-2xl bg-[#f7f8fc] p-4 text-sm text-[#6b7280]">Inga dokument väntar på granskning.</p>
        ) : (
          <div className="mt-5 space-y-4">
            {pending.map((document) => (
              <div key={document.id} className="rounded-2xl border border-[#e8ebf3] p-5">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-semibold text-[#111827]">{document.file_name}</div>
                    <div className="mt-1 text-sm text-[#6b7280]">
                      {DOCUMENT_TYPE_LABELS[document.document_type] ?? document.document_type} · Användare{' '}
                      <span className="font-mono text-xs">{document.user_id.slice(0, 8)}…</span> · Uppladdat{' '}
                      {formatDateTime(document.created_at)}
                      {document.document_expires_at ? ` · Giltigt till ${document.document_expires_at}` : ''}
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <form action={reviewProfileDocumentAction}>
                    <input type="hidden" name="documentId" value={document.id} />
                    <input type="hidden" name="decision" value="approved" />
                    <Button type="submit" className="h-11 w-full">
                      Godkänn
                    </Button>
                  </form>
                  <form action={reviewProfileDocumentAction} className="flex gap-2">
                    <input type="hidden" name="documentId" value={document.id} />
                    <input type="hidden" name="decision" value="rejected" />
                    <Input name="reason" placeholder="Skäl för nekande (krävs)" required className="h-11 flex-1 rounded-2xl border-[#d7dbe7]" />
                    <Button type="submit" variant="ghost" className="h-11 border border-[#fecaca] !text-[#b91c1c]">
                      Neka
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Senast granskade</h2>
        {!recentlyReviewed || recentlyReviewed.length === 0 ? (
          <p className="mt-5 rounded-2xl bg-[#f7f8fc] p-4 text-sm text-[#6b7280]">Inga granskade dokument ännu.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-[#eef0f6] text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                  <th className="py-3 pr-4">Dokument</th>
                  <th className="py-3 pr-4">Typ</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Skäl</th>
                  <th className="py-3">Granskad</th>
                </tr>
              </thead>
              <tbody>
                {recentlyReviewed.map((document) => (
                  <tr key={document.id} className="border-b border-[#f4f5fa]">
                    <td className="py-3 pr-4 font-semibold text-[#111827]">{document.file_name}</td>
                    <td className="py-3 pr-4">{DOCUMENT_TYPE_LABELS[document.document_type] ?? document.document_type}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          document.document_status === 'active'
                            ? 'bg-[#dcfce7] text-[#166534]'
                            : 'bg-[#fee2e2] text-[#b91c1c]'
                        }`}
                      >
                        {STATUS_LABELS[document.document_status] ?? document.document_status}
                      </span>
                    </td>
                    <td className="max-w-[240px] py-3 pr-4 text-[#6b7280]">{document.rejection_reason ?? '—'}</td>
                    <td className="py-3">{formatDateTime(document.reviewed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AdminShell>
  )
}
