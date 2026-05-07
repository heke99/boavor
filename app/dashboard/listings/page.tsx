import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { createListingAction, updateApplicationStatusAction } from './actions'
import { getOwnerDashboardData } from '@/lib/data/rental-applications'
import { formatCurrency } from '@/lib/utils'

const statusOptions = [
  { value: 'reviewing', label: 'Granskas' },
  { value: 'shortlisted', label: 'Shortlistad' },
  { value: 'offered', label: 'Erbjuden' },
  { value: 'rejected', label: 'Avslagen' },
]

export default async function DashboardListingsPage() {
  const { profile, listings, incomingApplications } = await getOwnerDashboardData()
  const canManage = ['landlord', 'broker', 'company_admin', 'admin', 'super_admin'].includes(profile.role)

  return (
    <DashboardShell activePath="/dashboard/listings" title="Mina objekt" description="Skapa och hantera annonser samt följ inkomna ansökningar i ett och samma arbetsflöde.">
      {!canManage ? (
        <Card className="p-8">
          <h2 className="text-2xl font-semibold">Annonsörsportal låst</h2>
          <p className="mt-3 text-sm text-[var(--muted)]">Din nuvarande roll är {profile.role}. Byt roll till hyresvärd, mäklare eller bolagsadmin i profilen för att skapa och hantera objekt.</p>
        </Card>
      ) : (
        <>
          <Card className="p-6">
            <h2 className="text-2xl font-semibold">Skapa nytt objekt</h2>
            <form action={createListingAction} className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Input name="title" placeholder="Titel" required />
              <Select name="listingType" defaultValue="rent">
                <option value="rent">Hyra</option>
                <option value="sale">Till salu</option>
              </Select>
              <Select name="propertyType" defaultValue="apartment">
                <option value="apartment">Lägenhet</option>
                <option value="house">Hus</option>
                <option value="property">Fastighet</option>
              </Select>
              <Input name="city" placeholder="Stad" required />
              <Input name="areaName" placeholder="Område" />
              <Input name="street" placeholder="Adress" />
              <Input name="zipCode" placeholder="Postnummer" />
              <Input name="price" placeholder="Hyra eller pris" type="number" required />
              <Input name="monthlyFee" placeholder="Månadsavgift (valfritt)" type="number" />
              <Input name="rooms" placeholder="Rum" type="number" step="0.5" />
              <Input name="areaSqm" placeholder="Boyta m²" type="number" step="0.1" />
              <Input name="availableFrom" placeholder="Tillgänglig från (YYYY-MM-DD)" />
              <Input name="imageUrl" placeholder="Bild-URL" />
              <Input name="features" placeholder="Features, separera med kommatecken" className="md:col-span-2 xl:col-span-3" />
              <textarea
                name="description"
                rows={5}
                placeholder="Beskriv objektet"
                className="md:col-span-2 xl:col-span-3 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[rgba(91,61,245,0.12)]"
              />
              <Select name="status" defaultValue="draft">
                <option value="draft">Utkast</option>
                <option value="published">Publicera direkt</option>
              </Select>
              <Input name="minIncome" type="number" placeholder="Minsta inkomst för hyra" />
              <Select name="petsAllowed" defaultValue="true">
                <option value="true">Husdjur tillåtna</option>
                <option value="false">Husdjur ej tillåtna</option>
              </Select>
              <Select name="employmentRequired" defaultValue="false">
                <option value="false">Anställning ej krav</option>
                <option value="true">Anställning krävs</option>
              </Select>
              <Select name="referencesRequired" defaultValue="false">
                <option value="false">Referenser ej krav</option>
                <option value="true">Referenser krävs</option>
              </Select>
              <div className="md:col-span-2 xl:col-span-3 flex justify-end">
                <Button type="submit">Spara objekt</Button>
              </div>
            </form>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <Card className="p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold">Mina annonser</h2>
                <div className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold">{listings.length} objekt</div>
              </div>
              <div className="mt-5 space-y-4">
                {listings.length ? (
                  listings.map((listing) => (
                    <div key={listing.id} className="rounded-2xl border border-black/8 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{listing.listingType === 'rent' ? 'Hyra' : 'Till salu'} · {listing.status}</div>
                          <div className="mt-2 text-lg font-semibold">{listing.title}</div>
                          <div className="mt-2 text-sm text-[var(--muted)]">{listing.city} · {listing.rooms} rum · {listing.areaSqm} m²</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-[var(--primary)]">{formatCurrency(listing.price, listing.listingType)}</div>
                          <div className="mt-2 text-sm text-[var(--muted)]">{listing.applicationsCount} ansökningar</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--muted)]">Du har inte skapat några annonser ännu.</p>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold">Inkomna ansökningar</h2>
                <div className="rounded-full bg-[var(--secondary-soft)] px-3 py-1 text-xs font-semibold text-[var(--secondary)]">
                  Köpoäng är en extra signal, inte ett tvång
                </div>
              </div>
              <div className="mt-5 space-y-4">
                {incomingApplications.length ? (
                  incomingApplications.map((application) => (
                    <div key={application.id} className="rounded-2xl border border-black/8 p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{application.listing.title}</div>
                          <div className="mt-2 text-lg font-semibold">{application.applicant.fullName}</div>
                          <div className="mt-2 text-sm text-[var(--muted)]">{application.applicant.email} · {application.applicant.phone || 'Ingen telefon'}</div>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                            <span className="rounded-full bg-black/5 px-3 py-1">Köpoäng: {application.queuePointsSnapshot}</span>
                            <span className="rounded-full bg-black/5 px-3 py-1">Medsökande: {application.coApplicants.length}</span>
                            <span className="rounded-full bg-black/5 px-3 py-1">Dokument: {application.documents.length}</span>
                            <span className="rounded-full bg-black/5 px-3 py-1">Inkomst: {application.applicant.monthlyIncome ? `${application.applicant.monthlyIncome} kr/mån` : 'Ej angiven'}</span>
                          </div>
                          {application.coverLetter ? <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{application.coverLetter}</p> : null}
                        </div>
                        <form action={updateApplicationStatusAction} className="flex min-w-[180px] flex-col gap-3">
                          <input type="hidden" name="applicationId" value={application.id} />
                          <Select name="status" defaultValue={application.status}>
                            {statusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Select>
                          <Button type="submit" variant="secondary">Uppdatera status</Button>
                        </form>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--muted)]">När sökande börjar ansöka om dina objekt visas de här med profilöversikt, köpoäng och statusflöde.</p>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </DashboardShell>
  )
}
