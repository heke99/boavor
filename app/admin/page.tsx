import Link from 'next/link'
import { AdminShell } from '@/components/admin/AdminShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getAdminOverview } from '@/lib/data/admin'
import { formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <Card className="p-5">
      <div className="text-sm font-medium text-[#6b7280]">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-[#111827]">{value}</div>
      {hint ? <div className="mt-2 text-xs text-[#6b7280]">{hint}</div> : null}
    </Card>
  )
}

export default async function AdminPage() {
  const data = await getAdminOverview()

  return (
    <AdminShell activePath="/admin" title="Adminöversikt" description="Supervisa hela Bovaro: användare, företag, listings, ansökningar och leads.">
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Användare" value={data.stats.users} hint={`${data.stats.privateUsers} privata · ${data.stats.companyUsers} företag`} />
        <StatCard label="Företag" value={data.stats.companies} hint={`${data.stats.pendingCompanies} väntar verifiering`} />
        <StatCard label="Listings" value={data.stats.listings} hint={`${data.stats.publishedListings} publicerade`} />
        <StatCard label="Ansökningar" value={data.stats.applications} />
        <StatCard label="Leads" value={data.stats.inquiries} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="p-6 xl:col-span-1">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-[#111827]">Företag väntar</h2>
            <Button href="/admin/companies?verificationStatus=pending" variant="ghost" className="px-3 py-2 text-xs !text-[#111827]">Visa alla</Button>
          </div>
          <div className="mt-5 space-y-3">
            {data.pendingCompanies.length ? data.pendingCompanies.map((company) => (
              <div key={company.id} className="rounded-2xl border border-[#e8ebf3] p-4">
                <div className="font-semibold text-[#111827]">{company.name}</div>
                <div className="mt-1 text-sm text-[#6b7280]">Org.nr {company.organizationNumber ?? 'saknas'}</div>
                <div className="mt-3 text-xs font-semibold text-[#9a5b00]">Väntar verifiering</div>
              </div>
            )) : <p className="text-sm text-[#6b7280]">Inga företag väntar på verifiering.</p>}
          </div>
        </Card>

        <Card className="p-6 xl:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-[#111827]">Senaste objekt</h2>
            <Button href="/admin/listings" variant="ghost" className="px-3 py-2 text-xs !text-[#111827]">Hantera listings</Button>
          </div>
          <div className="mt-5 overflow-hidden rounded-2xl border border-[#e8ebf3]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f7f8fc] text-xs uppercase tracking-[0.12em] text-[#6b7280]">
                <tr><th className="px-4 py-3">Objekt</th><th className="px-4 py-3">Typ</th><th className="px-4 py-3">Pris</th><th className="px-4 py-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-[#e8ebf3]">
                {data.latestListings.map((listing) => (
                  <tr key={listing.id}>
                    <td className="px-4 py-3"><Link href={`/admin/listings?q=${encodeURIComponent(listing.title)}`} className="font-semibold !text-[#111827] hover:underline">{listing.title}</Link><div className="text-xs text-[#6b7280]">{listing.city}</div></td>
                    <td className="px-4 py-3 text-[#6b7280]">{listing.listingSegment} · {listing.listingType}</td>
                    <td className="px-4 py-3 font-semibold text-[#5b3df5]">{formatCurrency(listing.price, listing.listingType)}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#243b8f]">{listing.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[#111827]">Senaste användare</h2>
          <Button href="/admin/users" variant="ghost" className="px-3 py-2 text-xs !text-[#111827]">Hantera användare</Button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.latestUsers.map((user) => (
            <div key={user.id} className="rounded-2xl border border-[#e8ebf3] p-4">
              <div className="font-semibold text-[#111827]">{[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Namnlös användare'}</div>
              <div className="mt-1 text-sm text-[#6b7280]">{user.email ?? 'E-post dold'} · {user.accountType}</div>
              <div className="mt-3 rounded-full bg-[#f3f4f6] px-3 py-1 text-xs font-semibold text-[#4b5563] w-fit">{user.role}</div>
            </div>
          ))}
        </div>
      </Card>
    </AdminShell>
  )
}
