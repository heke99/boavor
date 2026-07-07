import { AdminShell } from '@/components/admin/AdminShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { getAdminApplications } from '@/lib/data/admin'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

function getString(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key]
  return typeof value === 'string' ? value : undefined
}

const statuses = ['submitted', 'reviewing', 'shortlisted', 'offered', 'rejected', 'withdrawn']

export default async function AdminApplicationsPage({ searchParams }: Props) {
  const params = await searchParams
  const q = getString(params, 'q')
  const status = getString(params, 'status') ?? 'all'
  const applications = await getAdminApplications({ q, status })

  return (
    <AdminShell activePath="/admin/applications" title="Alla ansökningar" description="Överblick över hyresansökningar i systemet. Visa bara det admin behöver för kontroll och support.">
      <Card className="p-6">
        <form className="grid gap-4 md:grid-cols-[1fr_220px_auto]">
          <Input name="q" defaultValue={q ?? ''} placeholder="Sök objekt, sökande eller e-post" className="h-12 rounded-2xl border-[#d7dbe7]" />
          <Select name="status" defaultValue={status} className="h-12 rounded-2xl border-[#d7dbe7]">
            <option value="all">Alla statusar</option>
            {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </Select>
          <Button className="h-12">Filtrera</Button>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-[#e8ebf3] p-6"><h2 className="text-xl font-semibold text-[#111827]">{applications.length} ansökningar</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-[#f7f8fc] text-xs uppercase tracking-[0.12em] text-[#6b7280]">
              <tr><th className="px-5 py-3">Objekt</th><th className="px-5 py-3">Sökande</th><th className="px-5 py-3">Köpoäng</th><th className="px-5 py-3">Företag</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Datum</th></tr>
            </thead>
            <tbody className="divide-y divide-[#e8ebf3]">
              {applications.map((application) => (
                <tr key={application.id}>
                  <td className="px-5 py-4"><div className="font-semibold text-[#111827]">{application.listingTitle}</div><div className="text-xs text-[#6b7280]">{application.listingCity}</div></td>
                  <td className="px-5 py-4"><div className="font-semibold text-[#111827]">{application.applicantName}</div><div className="text-xs text-[#6b7280]">{application.applicantEmail}</div></td>
                  <td className="px-5 py-4"><span className="rounded-full bg-[#f3f4f6] px-3 py-1 text-xs font-semibold text-[#4b5563]">{application.queuePoints} poäng</span></td>
                  <td className="px-5 py-4 text-[#6b7280]">{application.landlordCompanyName ?? 'Privat/okänt'}</td>
                  <td className="px-5 py-4"><span className="rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#243b8f]">{application.status}</span></td>
                  <td className="px-5 py-4 text-[#6b7280]">{new Date(application.createdAt).toLocaleDateString('sv-SE')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminShell>
  )
}
