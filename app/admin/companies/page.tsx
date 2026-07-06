import { AdminShell } from '@/components/admin/AdminShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { updateCompanyVerificationAction } from '@/app/admin/actions'
import { getAdminCompanies } from '@/lib/data/admin'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

function getString(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key]
  return typeof value === 'string' ? value : undefined
}

export default async function AdminCompaniesPage({ searchParams }: Props) {
  const params = await searchParams
  const q = getString(params, 'q')
  const verificationStatus = getString(params, 'verificationStatus') ?? 'all'
  const companies = await getAdminCompanies({ q, verificationStatus })

  return (
    <AdminShell activePath="/admin/companies" title="Företag" description="Verifiera företag, granska organisationsnummer och följ deras aktivitet.">
      <Card className="p-6">
        <form className="grid gap-4 md:grid-cols-[1fr_220px_auto]">
          <Input name="q" defaultValue={q ?? ''} placeholder="Sök företag, org.nr eller e-post" className="h-12 rounded-2xl border-[#d7dbe7]" />
          <Select name="verificationStatus" defaultValue={verificationStatus} className="h-12 rounded-2xl border-[#d7dbe7]">
            <option value="all">Alla statusar</option>
            <option value="pending">Väntar</option>
            <option value="verified">Verifierad</option>
            <option value="rejected">Avvisad</option>
          </Select>
          <Button className="h-12">Filtrera</Button>
        </form>
      </Card>

      <div className="grid gap-5">
        {companies.map((company) => (
          <Card key={company.id} className="p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-[#111827]">{company.name}</h2>
                  <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#243b8f]">{company.verificationStatus}</span>
                </div>
                <div className="mt-2 text-sm leading-6 text-[#6b7280]">
                  Org.nr: {company.organizationNumber ?? 'saknas'} · {company.email ?? 'e-post saknas'} · {company.phone ?? 'telefon saknas'}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[#4b5563]">
                  <span className="rounded-full bg-[#f3f4f6] px-3 py-1">{company.legalForm ?? 'bolagsform saknas'}</span>
                  <span className="rounded-full bg-[#f3f4f6] px-3 py-1">{company.businessPurpose ?? 'syfte saknas'}</span>
                  <span className="rounded-full bg-[#f3f4f6] px-3 py-1">{company.listingsCount} objekt</span>
                  <span className="rounded-full bg-[#f3f4f6] px-3 py-1">{company.membersCount} medlemmar</span>
                  {company.verifiedAt ? <span className="rounded-full bg-[#ecfdf3] px-3 py-1 text-[#166534]">Verifierad {new Date(company.verifiedAt).toLocaleDateString('sv-SE')}</span> : null}
                </div>
                {company.verificationNote ? <p className="mt-3 rounded-2xl bg-[#f7f8fc] p-3 text-sm text-[#5b6475]">Adminnotering: {company.verificationNote}</p> : null}
              </div>

              <form action={updateCompanyVerificationAction} className="grid min-w-[320px] gap-2">
                <input type="hidden" name="companyId" value={company.id} />
                <Select name="verificationStatus" defaultValue={company.verificationStatus} className="h-12 rounded-2xl border-[#d7dbe7]">
                  <option value="pending">Väntar</option>
                  <option value="verified">Verifierad</option>
                  <option value="rejected">Avvisad</option>
                </Select>
                <Input name="verificationNote" defaultValue={company.verificationNote ?? ''} placeholder="Verifieringsnotering" className="h-12 rounded-2xl border-[#d7dbe7]" />
                <Button className="h-12">Spara verifiering</Button>
              </form>
            </div>
          </Card>
        ))}
      </div>
    </AdminShell>
  )
}
