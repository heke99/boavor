import { AdminShell } from '@/components/admin/AdminShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { getAdminInquiries } from '@/lib/data/admin'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

function getString(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key]
  return typeof value === 'string' ? value : undefined
}

const statuses = ['new', 'contacted', 'viewing_booked', 'negotiating', 'closed', 'rejected']
const segments = ['residential', 'commercial', 'parking', 'storage', 'land', 'investment']

export default async function AdminInquiriesPage({ searchParams }: Props) {
  const params = await searchParams
  const q = getString(params, 'q')
  const status = getString(params, 'status') ?? 'all'
  const segment = getString(params, 'segment') ?? 'all'
  const inquiries = await getAdminInquiries({ q, status, segment })

  return (
    <AdminShell activePath="/admin/inquiries" title="Alla leads" description="Överblick över intresseanmälningar och kommersiella förfrågningar.">
      <Card className="p-6">
        <form className="grid gap-4 md:grid-cols-[1fr_190px_190px_auto]">
          <Input name="q" defaultValue={q ?? ''} placeholder="Sök objekt, kund eller e-post" className="h-12 rounded-2xl border-[#d7dbe7]" />
          <Select name="status" defaultValue={status} className="h-12 rounded-2xl border-[#d7dbe7]"><option value="all">Alla statusar</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</Select>
          <Select name="segment" defaultValue={segment} className="h-12 rounded-2xl border-[#d7dbe7]"><option value="all">Alla kategorier</option>{segments.map((item) => <option key={item} value={item}>{item}</option>)}</Select>
          <Button className="h-12">Filtrera</Button>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-[#e8ebf3] p-6"><h2 className="text-xl font-semibold text-[#111827]">{inquiries.length} leads</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-[#f7f8fc] text-xs uppercase tracking-[0.12em] text-[#6b7280]">
              <tr><th className="px-5 py-3">Objekt</th><th className="px-5 py-3">Lead</th><th className="px-5 py-3">Typ</th><th className="px-5 py-3">Företag</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Datum</th></tr>
            </thead>
            <tbody className="divide-y divide-[#e8ebf3]">
              {inquiries.map((inquiry) => (
                <tr key={inquiry.id}>
                  <td className="px-5 py-4"><div className="font-semibold text-[#111827]">{inquiry.listingTitle}</div><div className="text-xs text-[#6b7280]">{inquiry.listingCity} · {inquiry.listingSegment}</div></td>
                  <td className="px-5 py-4"><div className="font-semibold text-[#111827]">{inquiry.requesterName}</div><div className="text-xs text-[#6b7280]">{inquiry.requesterEmail} · {inquiry.requesterPhone ?? 'telefon saknas'}</div></td>
                  <td className="px-5 py-4 text-[#6b7280]">{inquiry.inquiryType}</td>
                  <td className="px-5 py-4 text-[#6b7280]">{inquiry.landlordCompanyName ?? inquiry.requesterCompanyName ?? 'Privat/okänt'}</td>
                  <td className="px-5 py-4"><span className="rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#243b8f]">{inquiry.status}</span></td>
                  <td className="px-5 py-4 text-[#6b7280]">{new Date(inquiry.createdAt).toLocaleDateString('sv-SE')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminShell>
  )
}
