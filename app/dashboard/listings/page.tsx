import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { ListingCreateForm } from '@/components/dashboard/ListingCreateForm'
import { createListingAction, updateApplicationStatusAction, updateInquiryStatusAction, updateListingStatusAction } from './actions'
import { getOwnerDashboardData } from '@/lib/data/rental-applications'
import { formatCurrency } from '@/lib/utils'
import { getListingPrimaryMeta } from '@/lib/listing-options'

export const dynamic = 'force-dynamic'

const applicationStatusOptions = [
  { value: 'reviewing', label: 'Granskas' },
  { value: 'shortlisted', label: 'Shortlistad' },
  { value: 'offered', label: 'Erbjuden' },
  { value: 'rejected', label: 'Avslagen' },
]

const inquiryStatusOptions = [
  { value: 'new', label: 'Ny' },
  { value: 'contacted', label: 'Kontaktad' },
  { value: 'viewing_booked', label: 'Visning bokad' },
  { value: 'negotiating', label: 'Förhandlar' },
  { value: 'closed', label: 'Avslutad' },
  { value: 'rejected', label: 'Avvisad' },
]

const listingStatusOptions = [
  { value: 'published', label: 'Publicerad' },
  { value: 'draft', label: 'Utkast' },
  { value: 'paused', label: 'Pausad' },
  { value: 'rented', label: 'Uthyrd' },
  { value: 'sold', label: 'Såld' },
  { value: 'archived', label: 'Arkiverad' },
]

export default async function DashboardListingsPage() {
  const { profile, listings, incomingApplications, incomingInquiries } = await getOwnerDashboardData()
  const canManage = ['seeker', 'landlord', 'broker', 'company_admin', 'admin', 'super_admin'].includes(profile.role)
  const totalLeads = incomingApplications.length + incomingInquiries.length
  const activeListings = listings.filter((listing) => listing.status === 'published').length

  return (
    <DashboardShell activePath="/dashboard/listings" title="Mina objekt" description="Skapa och hantera bostäder, lokaler, kontor, parkeringar, förråd, mark och fastighetsobjekt i ett kommersiellt arbetsflöde.">
      {!canManage ? (
        <Card className="p-8">
          <h2 className="text-2xl font-semibold">Annonsörsportal låst</h2>
          <p className="mt-3 text-sm text-[var(--muted)]">Din nuvarande roll är {profile.role}. Uppdatera profil/behörighet för att skapa och hantera objekt.</p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="p-5">
              <div className="text-sm text-[var(--muted)]">Objekt</div>
              <div className="mt-2 text-3xl font-semibold">{listings.length}</div>
            </Card>
            <Card className="p-5">
              <div className="text-sm text-[var(--muted)]">Publicerade</div>
              <div className="mt-2 text-3xl font-semibold">{activeListings}</div>
            </Card>
            <Card className="p-5">
              <div className="text-sm text-[var(--muted)]">Ansökningar</div>
              <div className="mt-2 text-3xl font-semibold">{incomingApplications.length}</div>
            </Card>
            <Card className="p-5">
              <div className="text-sm text-[var(--muted)]">Leads</div>
              <div className="mt-2 text-3xl font-semibold">{totalLeads}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h2 className="text-2xl font-semibold">Skapa nytt objekt</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Välj först objekttyp och om det ska hyras ut eller säljas. Systemet visar därefter relevanta fält.
            </p>
            <ListingCreateForm action={createListingAction} />
          </Card>

          <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <Card className="p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold">Mina annonser</h2>
                <div className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold">{listings.length} objekt</div>
              </div>
              <div className="mt-5 space-y-4">
                {listings.length ? (
                  listings.map((listing) => {
                    const meta = getListingPrimaryMeta(listing.listingSegment, listing.commercialType)
                    return (
                      <div key={listing.id} className="rounded-2xl border border-black/8 p-4">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                              {meta} · {listing.listingType === 'rent' ? 'Hyra' : 'Till salu'} · {listing.status}
                            </div>
                            <div className="mt-2 text-lg font-semibold">{listing.title}</div>
                            <div className="mt-2 text-sm text-[var(--muted)]">
                              {listing.city} · {listing.areaSqm} m² {listing.listingSegment === 'residential' ? `· ${listing.rooms} rum` : ''}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                              <span className="rounded-full bg-black/5 px-3 py-1">{listing.applicationsCount} ansökningar</span>
                              <span className="rounded-full bg-black/5 px-3 py-1">{listing.inquiriesCount ?? 0} leads</span>
                              <span className="rounded-full bg-black/5 px-3 py-1">Skapad {new Date(listing.createdAt).toLocaleDateString('sv-SE')}</span>
                            </div>
                          </div>
                          <div className="min-w-[210px] space-y-3 xl:text-right">
                            <div className="text-lg font-semibold text-[var(--primary)]">{formatCurrency(listing.price, listing.listingType)}</div>
                            <div className="flex flex-wrap gap-2 xl:justify-end">
                              <Button href={`/listing/${listing.slug}`} variant="ghost" className="border border-black/8 px-3 py-2 text-xs">
                                Förhandsvisa
                              </Button>
                              <form action={updateListingStatusAction} className="flex gap-2">
                                <input type="hidden" name="listingId" value={listing.id} />
                                <Select name="status" defaultValue={listing.status} className="h-10 min-w-[120px] text-xs">
                                  {listingStatusOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                  ))}
                                </Select>
                                <Button type="submit" variant="secondary" className="px-3 py-2 text-xs">
                                  Spara
                                </Button>
                              </form>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-sm text-[var(--muted)]">Du har inte skapat några annonser ännu.</p>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold">Inkomna ansökningar</h2>
                <div className="rounded-full bg-[var(--secondary-soft)] px-3 py-1 text-xs font-semibold text-[var(--secondary)]">
                  Bostadshyra
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
                            {applicationStatusOptions.map((option) => (
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
                  <p className="text-sm text-[var(--muted)]">När sökande ansöker om bostadshyra visas de här.</p>
                )}
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold">Leads och intresseanmälningar</h2>
              <div className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold">Lokaler, kontor, parkering, förråd, mark, köp och investering</div>
            </div>
            <div className="mt-5 space-y-4">
              {incomingInquiries.length ? (
                incomingInquiries.map((inquiry) => (
                  <div key={inquiry.id} className="rounded-2xl border border-black/8 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                          {inquiry.listing.title} · {inquiry.listing.city}
                        </div>
                        <div className="mt-2 text-lg font-semibold">{inquiry.requester.fullName}</div>
                        <div className="mt-2 text-sm text-[var(--muted)]">
                          {inquiry.requester.email} · {inquiry.requester.phone || 'Ingen telefon'} {inquiry.requester.companyName ? `· ${inquiry.requester.companyName}` : ''}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                          <span className="rounded-full bg-black/5 px-3 py-1">Typ: {inquiry.inquiryType}</span>
                          <span className="rounded-full bg-black/5 px-3 py-1">Kontakt: {inquiry.preferredContactMethod || 'Ej angivet'}</span>
                          <span className="rounded-full bg-black/5 px-3 py-1">Status: {inquiry.status}</span>
                        </div>
                        {inquiry.message ? <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{inquiry.message}</p> : null}
                      </div>
                      <form action={updateInquiryStatusAction} className="flex min-w-[180px] flex-col gap-3">
                        <input type="hidden" name="inquiryId" value={inquiry.id} />
                        <Select name="status" defaultValue={inquiry.status}>
                          {inquiryStatusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                        <textarea
                          name="internalNote"
                          defaultValue={inquiry.internalNote ?? ''}
                          rows={3}
                          placeholder="Intern anteckning"
                          className="rounded-2xl border border-black/10 px-4 py-3 text-sm"
                        />
                        <Button type="submit" variant="secondary">Uppdatera lead</Button>
                      </form>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--muted)]">När någon skickar intresseanmälan, bokar visning eller begär offert visas leaden här.</p>
              )}
            </div>
          </Card>
        </>
      )}
    </DashboardShell>
  )
}
