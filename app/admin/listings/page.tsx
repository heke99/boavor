import { AdminShell } from '@/components/admin/AdminShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { updateAdminListingStatusAction } from '@/app/admin/actions'
import { getAdminListings } from '@/lib/data/admin'
import { formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

function getString(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key]
  return typeof value === 'string' ? value : undefined
}

const segments = ['residential', 'commercial', 'parking', 'storage', 'land', 'investment']
const statuses = ['draft', 'published', 'paused', 'rented', 'sold', 'archived']

export default async function AdminListingsPage({ searchParams }: Props) {
  const params = await searchParams
  const q = getString(params, 'q')
  const segment = getString(params, 'segment') ?? 'all'
  const status = getString(params, 'status') ?? 'all'
  const ownerType = getString(params, 'ownerType') ?? 'all'
  const listings = await getAdminListings({ q, segment, status, ownerType })

  return (
    <AdminShell activePath="/admin/listings" title="Alla listings" description="Granska, filtrera, pausa eller arkivera objekt i hela systemet.">
      <Card className="p-6">
        <form className="grid gap-4 md:grid-cols-[1fr_170px_170px_170px_auto]">
          <Input name="q" defaultValue={q ?? ''} placeholder="Sök titel eller stad" className="h-12 rounded-2xl border-[#d7dbe7]" />
          <Select name="segment" defaultValue={segment} className="h-12 rounded-2xl border-[#d7dbe7]"><option value="all">Alla kategorier</option>{segments.map((item) => <option key={item} value={item}>{item}</option>)}</Select>
          <Select name="status" defaultValue={status} className="h-12 rounded-2xl border-[#d7dbe7]"><option value="all">Alla statusar</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</Select>
          <Select name="ownerType" defaultValue={ownerType} className="h-12 rounded-2xl border-[#d7dbe7]"><option value="all">Alla ägare</option><option value="private">Privat</option><option value="company">Företag</option></Select>
          <Button className="h-12">Filtrera</Button>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-[#e8ebf3] p-6"><h2 className="text-xl font-semibold text-[#111827]">{listings.length} objekt</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-[#f7f8fc] text-xs uppercase tracking-[0.12em] text-[#6b7280]">
              <tr><th className="px-5 py-3">Objekt</th><th className="px-5 py-3">Kategori</th><th className="px-5 py-3">Ägare</th><th className="px-5 py-3">Leads/ans.</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Åtgärd</th></tr>
            </thead>
            <tbody className="divide-y divide-[#e8ebf3]">
              {listings.map((listing) => (
                <tr key={listing.id}>
                  <td className="px-5 py-4"><div className="font-semibold text-[#111827]">{listing.title}</div><div className="text-xs text-[#6b7280]">{listing.city} · {formatCurrency(listing.price, listing.listingType)}</div></td>
                  <td className="px-5 py-4 text-[#6b7280]">{listing.listingSegment} · {listing.listingType}</td>
                  <td className="px-5 py-4 text-[#6b7280]">{listing.ownerType === 'company' ? listing.companyName ?? 'Företag' : 'Privatperson'}</td>
                  <td className="px-5 py-4"><span className="rounded-full bg-[#f3f4f6] px-3 py-1 text-xs font-semibold text-[#4b5563]">{listing.applicationsCount} ans. · {listing.inquiriesCount} leads</span></td>
                  <td className="px-5 py-4"><span className="rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#243b8f]">{listing.status}</span></td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Button href={`/listing/${listing.slug}`} variant="ghost" className="h-10 rounded-xl px-3 text-xs !text-[#111827]">Publik</Button>
                      <form action={updateAdminListingStatusAction} className="flex gap-2">
                        <input type="hidden" name="listingId" value={listing.id} />
                        <Select name="status" defaultValue={listing.status} className="h-10 rounded-xl border-[#d7dbe7] text-xs">{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</Select>
                        <Button className="h-10 rounded-xl px-3 text-xs">Spara</Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminShell>
  )
}
