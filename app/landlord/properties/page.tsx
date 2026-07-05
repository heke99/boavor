import { LandlordShell } from '@/components/landlord/LandlordShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { requireLandlordAccess } from '@/lib/data/landlord'
import {
  createListingFromUnitAction,
  createPropertyAction,
  createUnitAction,
  deleteUnitAction,
  importUnitsAction,
} from './actions'

export const dynamic = 'force-dynamic'

const UNIT_STATUS_LABELS: Record<string, string> = {
  vacant: 'Vakant',
  listed: 'Annonserad',
  rented: 'Uthyrd',
  renovation: 'Renovering',
  blocked: 'Blockerad',
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function LandlordPropertiesPage({ searchParams }: Props) {
  const params = await searchParams
  const context = await requireLandlordAccess()
  const { supabase, user, companyIds } = context

  const propertyFilter = companyIds.length
    ? `owner_user_id.eq.${user.id},company_id.in.(${companyIds.join(',')})`
    : `owner_user_id.eq.${user.id}`

  const { data: properties } = await supabase
    .from('properties')
    .select('id, name, street, city, area_name, company_id, units(id, unit_number, floor, rooms, area_sqm, base_rent, status)')
    .or(propertyFilter)
    .order('created_at', { ascending: false })

  const { data: companies } = companyIds.length
    ? await supabase.from('companies').select('id, name').in('id', companyIds)
    : { data: [] }

  const importStatus = typeof params.import === 'string' ? params.import : null
  const importMessage =
    importStatus === 'done'
      ? `Import klar: ${params.imported ?? 0} lägenheter importerade, ${params.skipped ?? 0} rader hoppades över.`
      : importStatus === 'failed'
        ? 'Importen misslyckades. Kontrollera filen och försök igen.'
        : importStatus === 'empty'
          ? 'Ingen CSV-data hittades.'
          : importStatus === 'too_large'
            ? 'Filen är för stor (max 1 MB).'
            : null

  return (
    <LandlordShell
      activePath="/landlord/properties"
      title="Fastigheter och lägenheter"
      description="Bygg upp beståndet: fastigheter, lägenheter och annonser skapade direkt från en lägenhet."
    >
      {importMessage ? (
        <div className={`rounded-2xl p-4 text-sm font-semibold ${importStatus === 'done' ? 'bg-[#ecfdf3] text-[#166534]' : 'bg-[#fef2f2] text-[#b91c1c]'}`}>
          {importMessage}
        </div>
      ) : null}

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Ny fastighet</h2>
        <form action={createPropertyAction} className="mt-5 grid gap-4 md:grid-cols-3">
          <Input name="name" placeholder="Fastighetsnamn, t.ex. Kv. Eken" required />
          <Input name="city" placeholder="Stad" required />
          <Input name="street" placeholder="Gatuadress" />
          <Input name="zipCode" placeholder="Postnummer" />
          <Input name="areaName" placeholder="Område" />
          {(companies ?? []).length > 0 ? (
            <Select name="companyId" defaultValue={companies?.[0]?.id ?? ''}>
              {(companies ?? []).map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
              <option value="">Privat ägande</option>
            </Select>
          ) : null}
          <div className="md:col-span-3 flex justify-end">
            <Button type="submit">Skapa fastighet</Button>
          </div>
        </form>
      </Card>

      {(properties ?? []).length === 0 ? (
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-semibold text-[#111827]">Inga fastigheter ännu</h2>
          <p className="mt-3 text-sm text-[#6b7280]">
            Skapa er första fastighet ovan. Ni kan även skapa fristående annonser under Annonser.
          </p>
        </Card>
      ) : (
        (properties ?? []).map((property) => (
          <Card key={property.id} className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-[#111827]">{property.name}</h2>
                <p className="mt-1 text-sm text-[#6b7280]">
                  {[property.street, property.area_name, property.city].filter(Boolean).join(', ')}
                </p>
              </div>
              <span className="rounded-full bg-[#f7f8fc] px-3 py-1 text-xs font-semibold text-[#6b7280]">
                {(property.units ?? []).length} lägenheter
              </span>
            </div>

            <div className="mt-5 overflow-x-auto">
              {(property.units ?? []).length > 0 ? (
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-[#eef0f6] text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                      <th className="py-2 pr-4">Lgh nr</th>
                      <th className="py-2 pr-4">Våning</th>
                      <th className="py-2 pr-4">Rum</th>
                      <th className="py-2 pr-4">Kvm</th>
                      <th className="py-2 pr-4">Hyra</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2">Åtgärd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(property.units ?? []).map((unit) => (
                      <tr key={unit.id} className="border-b border-[#f4f5fa]">
                        <td className="py-2 pr-4 font-semibold text-[#111827]">{unit.unit_number}</td>
                        <td className="py-2 pr-4">{unit.floor ?? '—'}</td>
                        <td className="py-2 pr-4">{unit.rooms ?? '—'}</td>
                        <td className="py-2 pr-4">{unit.area_sqm ?? '—'}</td>
                        <td className="py-2 pr-4">{unit.base_rent ? `${unit.base_rent} kr` : '—'}</td>
                        <td className="py-2 pr-4">
                          <span className="rounded-full bg-[#f7f8fc] px-3 py-1 text-xs font-semibold">
                            {UNIT_STATUS_LABELS[unit.status] ?? unit.status}
                          </span>
                        </td>
                        <td className="py-2">
                          <div className="flex gap-2">
                            {unit.status === 'vacant' ? (
                              <form action={createListingFromUnitAction}>
                                <input type="hidden" name="unitId" value={unit.id} />
                                <Button type="submit" variant="ghost" className="h-8 border border-black/10 px-3 text-xs">
                                  Skapa annons
                                </Button>
                              </form>
                            ) : null}
                            <form action={deleteUnitAction}>
                              <input type="hidden" name="unitId" value={unit.id} />
                              <Button type="submit" variant="ghost" className="h-8 border border-[#fecaca] px-3 text-xs !text-[#b91c1c]">
                                Ta bort
                              </Button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="rounded-2xl bg-[#f7f8fc] p-4 text-sm text-[#6b7280]">Inga lägenheter i fastigheten ännu.</p>
              )}
            </div>

            <details className="mt-5 rounded-2xl border border-[#e8ebf3] p-4">
              <summary className="cursor-pointer text-sm font-semibold text-[#1d4ed8]">Lägg till lägenhet</summary>
              <form action={createUnitAction} className="mt-4 grid gap-3 md:grid-cols-3">
                <input type="hidden" name="propertyId" value={property.id} />
                <Input name="unitNumber" placeholder="Lgh nr, t.ex. 1101" required />
                <Input name="floor" placeholder="Våning" />
                <Input name="rooms" type="number" step="0.5" min={0} placeholder="Rum" />
                <Input name="areaSqm" type="number" step="0.5" min={0} placeholder="Kvm" />
                <Input name="baseRent" type="number" min={0} placeholder="Hyra kr/mån" />
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="hasBalcony" /> Balkong</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="hasAccessibility" /> Tillgänglig</label>
                </div>
                <div className="md:col-span-3 flex justify-end">
                  <Button type="submit" variant="secondary">Lägg till</Button>
                </div>
              </form>
            </details>

            <details className="mt-3 rounded-2xl border border-[#e8ebf3] p-4">
              <summary className="cursor-pointer text-sm font-semibold text-[#1d4ed8]">Importera lägenheter (CSV)</summary>
              <form action={importUnitsAction} className="mt-4 space-y-3" encType="multipart/form-data">
                <input type="hidden" name="propertyId" value={property.id} />
                <p className="text-xs text-[#6b7280]">
                  Format: <code>lagenhetsnummer,rum,kvm,hyra,vaning</code> (rubrikrad krävs, även engelska rubriker
                  fungerar). Rader med fel hoppas över och rapporteras.
                </p>
                <Input name="file" type="file" accept=".csv,text/csv" />
                <textarea
                  name="csvContent"
                  rows={4}
                  placeholder={'Eller klistra in CSV här:\nlagenhetsnummer,rum,kvm,hyra\n1101,2,55,9500'}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 font-mono text-xs outline-none"
                />
                <Button type="submit" variant="secondary">Importera</Button>
              </form>
            </details>
          </Card>
        ))
      )}
    </LandlordShell>
  )
}
