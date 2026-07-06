import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { getDashboardProfile } from '@/lib/data/profile'
import { addProfileDocumentAction, removeProfileDocumentAction } from '@/app/dashboard/profile/actions'

export const dynamic = 'force-dynamic'

function formatDate(value?: string | null) {
  if (!value) return 'Ej angivet'
  return new Date(value).toLocaleDateString('sv-SE')
}

const documentTypes = [
  { value: 'income_proof', label: 'Inkomstintyg' },
  { value: 'salary_slip', label: 'Lönespecifikation' },
  { value: 'employment_certificate', label: 'Anställningsintyg' },
  { value: 'register_extract', label: 'Registerutdrag' },
  { value: 'student_certificate', label: 'Studieintyg' },
  { value: 'reference', label: 'Referens' },
  { value: 'other', label: 'Annat' },
]

const statusLabels: Record<string, { label: string; className: string }> = {
  active: { label: 'Godkänt', className: 'bg-[#dcfce7] text-[#166534]' },
  pending_review: { label: 'Väntar på granskning', className: 'bg-[#fef3c7] text-[#92400e]' },
  rejected: { label: 'Nekat', className: 'bg-[#fee2e2] text-[#b91c1c]' },
  expired: { label: 'Utgånget', className: 'bg-[#f3f4f6] text-[#6b7280]' },
  replaced: { label: 'Ersatt', className: 'bg-[#f3f4f6] text-[#6b7280]' },
}

export default async function DashboardDocumentsPage() {
  const result = await getDashboardProfile()
  if (!result.isSignedIn || !result.profile) redirect('/login')

  const { profile } = result

  return (
    <DashboardShell
      activePath="/dashboard/documents"
      title="Dokument"
      description="Ladda upp dokument som återanvänds i dina ansökningar. Filerna lagras privat och delas endast med hyresvärdar du ansöker hos."
    >
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-[#111827]">Lägg till dokument</h2>
          <p className="mt-2 text-sm leading-6 text-[#6b7280]">
            Dokument stärker ansökningar och hjälper hyresvärdar att snabbt förstå om profilen är komplett.
          </p>
          <form action={addProfileDocumentAction} encType="multipart/form-data" className="mt-6 grid gap-4">
            <Input name="fileName" placeholder="Filnamn, t.ex. Lönespecifikation april" required />
            <Input name="file" type="file" accept=".pdf,image/*,.doc,.docx" />
            <Input name="fileUrl" placeholder="Alternativt: säker extern fil-URL" />
            <Select name="documentType" defaultValue="income_proof">
              {documentTypes.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </Select>
            <Input name="documentExpiresAt" type="date" placeholder="Giltigt till" />
            {profile.documents.some((item) => item.documentStatus === 'rejected') ? (
              <Select name="replacesDocumentId" defaultValue="">
                <option value="">Ersätter inget tidigare dokument</option>
                {profile.documents
                  .filter((item) => item.documentStatus === 'rejected')
                  .map((item) => (
                    <option key={item.id} value={item.id}>Ersätter: {item.fileName}</option>
                  ))}
              </Select>
            ) : null}
            <label className="flex items-center gap-3 rounded-2xl border border-[#e8ebf3] px-4 py-3 text-sm font-medium text-[#111827]">
              <input type="checkbox" name="isDefaultForApplications" />
              Använd som standard i framtida ansökningar
            </label>
            <Button>Ladda upp dokument</Button>
          </form>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold text-[#111827]">Mina dokument</h2>
            <div className="rounded-full bg-[#f7f8fc] px-3 py-1 text-xs font-semibold text-[#6b7280]">{profile.documents.length} st</div>
          </div>
          <div className="mt-6 space-y-3">
            {profile.documents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d7dbe7] px-4 py-8 text-center text-sm text-[#6b7280]">
                Inga dokument sparade ännu.
              </div>
            ) : (
              profile.documents.map((document) => {
                const status = statusLabels[document.documentStatus ?? 'active'] ?? statusLabels.active
                return (
                  <div key={document.id} className="rounded-2xl border border-[#e8ebf3] p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="font-semibold text-[#111827]">{document.fileName}</div>
                        <div className="mt-1 text-sm text-[#6b7280]">
                          {documentTypes.find((item) => item.value === document.documentType)?.label ?? document.documentType}
                          {' · '}Sparad {formatDate(document.createdAt)} · Giltig till {formatDate(document.documentExpiresAt)}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className={`rounded-full px-3 py-1 font-semibold ${status.className}`}>{status.label}</span>
                          {document.isDefaultForApplications ? <span className="rounded-full bg-[#eef2ff] px-3 py-1 font-semibold text-[#243b8f]">Standard för ansökningar</span> : null}
                        </div>
                        {document.documentStatus === 'rejected' && document.rejectionReason ? (
                          <div className="mt-3 rounded-2xl bg-[#fef2f2] p-3 text-sm text-[#b91c1c]">
                            Skäl: {document.rejectionReason}. Ladda upp en ny version nedan och ange detta dokument som ersatt.
                          </div>
                        ) : null}
                        <a href={document.fileUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-[#5b3df5]">
                          Öppna dokument
                        </a>
                      </div>
                      <form action={removeProfileDocumentAction}>
                        <input type="hidden" name="id" value={document.id} />
                        <Button variant="ghost" className="border border-[#d7dbe7] !text-[#111827]">Ta bort</Button>
                      </form>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Card>
      </div>
    </DashboardShell>
  )
}
