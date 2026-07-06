import { notFound } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { getManagedListingDetail } from '@/lib/data/rental-applications'
import { formatCurrency } from '@/lib/utils'
import { getListingPrimaryMeta } from '@/lib/listing-options'
import { nextStatuses, statusLabel } from '@/lib/applications/status-machine'
import { rankApplications, SELECTION_METHOD_LABELS } from '@/lib/applications/ranking'
import { REJECTION_TEMPLATES } from '@/lib/applications/templates'
import {
  addListingInternalNoteAction,
  bulkRejectApplicationsAction,
  generateRandomOrderAction,
  requestApplicationInfoAction,
  updateApplicationStatusAction,
  updateInquiryStatusAction,
  updateListingStatusAction,
} from '@/app/dashboard/listings/actions'
import { startApplicationThreadAction } from '@/app/dashboard/messages/actions'

export const dynamic = 'force-dynamic'

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

export default async function DashboardListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const listing = await getManagedListingDetail(id)
  if (!listing) notFound()

  const meta = getListingPrimaryMeta(listing.listingSegment, listing.commercialType)
  const selectionMethod = listing.selectionMethod ?? 'manual_with_policy'
  const rankedApplications = rankApplications(
    selectionMethod,
    listing.applications.map((application) => ({
      ...application,
      policyResult: application.policyResult ?? null,
      randomRank: application.randomRank ?? null,
    })),
  )
  const renderedAt = new Date()
  const deadlinePassed = listing.applicationDeadlineAt
    ? new Date(listing.applicationDeadlineAt) < renderedAt
    : false
  const needsRandomOrder =
    selectionMethod === 'random' && rankedApplications.some((item) => item.application.randomRank === null)

  return (
    <DashboardShell
      activePath="/dashboard/listings"
      title={listing.title}
      description="Objektdetalj för annonsör: status, ansökningar, leads och snabb hantering per objekt."
    >
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b7280]">
                  {meta} · {listing.listingType === 'rent' ? 'Hyra' : 'Till salu'} · {listing.city}
                </div>
                <h2 className="mt-2 text-2xl font-semibold text-[#111827]">{listing.title}</h2>
                <p className="mt-3 text-sm leading-7 text-[#6b7280]">{listing.description || 'Ingen beskrivning angiven ännu.'}</p>
              </div>
              <div className="rounded-2xl bg-[#eef2ff] px-4 py-3 text-sm font-semibold text-[#243b8f]">
                {listing.status}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#f7f8fc] p-4">
                <div className="text-sm text-[#6b7280]">Pris/hyra</div>
                <div className="mt-2 text-xl font-semibold text-[#5b3df5]">{formatCurrency(listing.price, listing.listingType)}</div>
              </div>
              <div className="rounded-2xl bg-[#f7f8fc] p-4">
                <div className="text-sm text-[#6b7280]">Yta</div>
                <div className="mt-2 text-xl font-semibold text-[#111827]">{listing.areaSqm} m²</div>
              </div>
              <div className="rounded-2xl bg-[#f7f8fc] p-4">
                <div className="text-sm text-[#6b7280]">Ansökningar</div>
                <div className="mt-2 text-xl font-semibold text-[#111827]">{listing.applications.length}</div>
              </div>
              <div className="rounded-2xl bg-[#f7f8fc] p-4">
                <div className="text-sm text-[#6b7280]">Leads</div>
                <div className="mt-2 text-xl font-semibold text-[#111827]">{listing.inquiries.length}</div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button href={`/dashboard/listings/${listing.id}/edit`} variant="secondary">Redigera objekt</Button>
              <Button href={`/listing/${listing.slug}`} variant="ghost" className="border border-[#d7dbe7] !text-[#111827]">Förhandsvisa</Button>
              <form action={updateListingStatusAction} className="flex flex-wrap gap-2">
                <input type="hidden" name="listingId" value={listing.id} />
                <Select name="status" defaultValue={listing.status} className="min-w-[150px]">
                  {listingStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </Select>
                <Button type="submit" variant="secondary">Spara status</Button>
              </form>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-2xl font-semibold text-[#111827]">Bilder</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {listing.images.length ? listing.images.map((image) => (
                <a key={image.id} href={image.imageUrl} target="_blank" rel="noreferrer" className="rounded-2xl border border-[#e8ebf3] p-4 text-sm font-semibold text-[#5b3df5]">
                  Bild {image.position + 1} {image.isCover ? '· omslagsbild' : ''}
                </a>
              )) : <p className="text-sm text-[#6b7280]">Inga bilder kopplade till objektet ännu.</p>}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-2xl font-semibold text-[#111827]">Interna anteckningar</h2>
            <form action={addListingInternalNoteAction} className="mt-5 space-y-3">
              <input type="hidden" name="listingId" value={listing.id} />
              <textarea
                name="note"
                rows={4}
                placeholder="Skriv en intern anteckning om objektet. Syns bara för dig/annonsören."
                className="w-full rounded-2xl border border-[#d7dbe7] px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#5b3df5] focus:ring-4 focus:ring-[rgba(91,61,245,0.12)]"
              />
              <Button type="submit" variant="secondary">Lägg till anteckning</Button>
            </form>
            <div className="mt-5 space-y-3">
              {listing.internalNotes?.length ? listing.internalNotes.map((note) => (
                <div key={note.id} className="rounded-2xl border border-[#e8ebf3] bg-[#f8fafc] p-4">
                  <p className="text-sm leading-7 text-[#111827]">{note.note}</p>
                  <div className="mt-2 text-xs text-[#6b7280]">{new Date(note.createdAt).toLocaleString('sv-SE')}</div>
                </div>
              )) : <p className="text-sm text-[#6b7280]">Inga interna anteckningar ännu.</p>}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-2xl font-semibold text-[#111827]">Aktivitetslogg</h2>
            <div className="mt-5 space-y-3">
              {listing.activityEvents?.length ? listing.activityEvents.map((event) => (
                <div key={event.id} className="rounded-2xl border border-[#e8ebf3] p-4">
                  <div className="text-sm font-semibold text-[#111827]">{event.message ?? event.eventType}</div>
                  <div className="mt-2 text-xs text-[#6b7280]">{event.eventType} · {new Date(event.createdAt).toLocaleString('sv-SE')}</div>
                </div>
              )) : <p className="text-sm text-[#6b7280]">Ingen aktivitet loggad ännu.</p>}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold text-[#111827]">Ansökningar</h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#4338ca]">
                  Urval: {SELECTION_METHOD_LABELS[selectionMethod]}
                </span>
                <span className="rounded-full bg-[#f7f8fc] px-3 py-1 text-xs font-semibold text-[#6b7280]">{listing.applications.length} st</span>
              </div>
            </div>

            {listing.applicationDeadlineAt ? (
              <p className="mt-2 text-sm text-[#6b7280]">
                Sista ansökningsdag: {new Date(listing.applicationDeadlineAt).toLocaleDateString('sv-SE')}
                {deadlinePassed ? ' (passerad — nya ansökningar blockeras)' : ''}
              </p>
            ) : null}

            {needsRandomOrder ? (
              <form action={generateRandomOrderAction} className="mt-4 rounded-2xl border border-dashed border-[#c7d2fe] bg-[#eef2ff] p-4">
                <input type="hidden" name="listingId" value={listing.id} />
                <p className="text-sm text-[#3730a3]">
                  Urvalsmetoden är slumpad ordning. Ordningen genereras en gång efter sista ansökningsdag och loggas i
                  aktivitetsloggen.
                </p>
                <Button type="submit" variant="secondary" className="mt-3" disabled={!deadlinePassed && Boolean(listing.applicationDeadlineAt)}>
                  {deadlinePassed || !listing.applicationDeadlineAt ? 'Generera slumpordning' : 'Väntar på deadline'}
                </Button>
              </form>
            ) : null}

            <div className="mt-5 space-y-4">
              {rankedApplications.length ? rankedApplications.map(({ application, rankLabel }) => {
                const allowedStatuses = nextStatuses(application.status, 'landlord')
                return (
                  <div key={application.id} className="rounded-2xl border border-[#e8ebf3] p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          {rankLabel ? (
                            <span className="rounded-full bg-[#111827] px-3 py-1 text-xs font-semibold text-white">{rankLabel}</span>
                          ) : null}
                          <div className="text-lg font-semibold text-[#111827]">{application.applicant.fullName}</div>
                        </div>
                        <div className="mt-1 text-sm text-[#6b7280]">{application.applicant.email} · {application.applicant.phone || 'Ingen telefon'}</div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#6b7280]">
                          <span className="rounded-full bg-[#eef2ff] px-3 py-1 font-semibold text-[#243b8f]">{statusLabel(application.status)}</span>
                          {application.policyResult ? (
                            <span
                              className={`rounded-full px-3 py-1 font-semibold ${
                                application.policyResult === 'eligible'
                                  ? 'bg-[#dcfce7] text-[#166534]'
                                  : application.policyResult === 'likely_eligible'
                                    ? 'bg-[#dbeafe] text-[#1d4ed8]'
                                    : application.policyResult === 'missing_info'
                                      ? 'bg-[#fef3c7] text-[#92400e]'
                                      : 'bg-[#fee2e2] text-[#b91c1c]'
                              }`}
                            >
                              Matchkoll:{' '}
                              {application.policyResult === 'eligible'
                                ? 'Uppfyller krav'
                                : application.policyResult === 'likely_eligible'
                                  ? 'Uppfyller troligen krav'
                                  : application.policyResult === 'missing_info'
                                    ? 'Uppgifter saknas'
                                    : 'Uppfyller ej krav'}
                            </span>
                          ) : null}
                          <span className="rounded-full bg-[#f7f8fc] px-3 py-1">Köpoäng: {application.queuePointsSnapshot}</span>
                          <span className="rounded-full bg-[#f7f8fc] px-3 py-1">Dokument: {application.documents.length}</span>
                          <span className="rounded-full bg-[#f7f8fc] px-3 py-1">Inkomst: {application.applicant.monthlyIncome ? `${application.applicant.monthlyIncome} kr/mån` : 'Ej angiven'}</span>
                        </div>
                        {application.coverLetter ? <p className="mt-4 text-sm leading-7 text-[#6b7280]">{application.coverLetter}</p> : null}
                        {application.rejectionReason ? (
                          <p className="mt-3 rounded-2xl bg-[#fef2f2] p-3 text-xs text-[#b91c1c]">Avslagsskäl: {application.rejectionReason}</p>
                        ) : null}
                      </div>

                      <div className="flex min-w-[220px] flex-col gap-3">
                        {allowedStatuses.length > 0 ? (
                          <form action={updateApplicationStatusAction} className="flex flex-col gap-2">
                            <input type="hidden" name="applicationId" value={application.id} />
                            <Select name="status" defaultValue={allowedStatuses[0]}>
                              {allowedStatuses.map((status) => (
                                <option key={status} value={status}>{statusLabel(status)}</option>
                              ))}
                            </Select>
                            <Select name="rejectionReason" defaultValue="">
                              <option value="">Avslagsskäl (krävs vid avslag)…</option>
                              {REJECTION_TEMPLATES.map((template) => (
                                <option key={template.id} value={template.text}>{template.label}</option>
                              ))}
                            </Select>
                            <Button type="submit" variant="secondary">Uppdatera status</Button>
                          </form>
                        ) : (
                          <div className="rounded-2xl bg-[#f7f8fc] px-4 py-3 text-center text-xs font-semibold text-[#6b7280]">
                            Slutstatus
                          </div>
                        )}

                        <form action={requestApplicationInfoAction} className="flex flex-col gap-2">
                          <input type="hidden" name="applicationId" value={application.id} />
                          <Input name="message" placeholder="Begär komplettering…" className="h-10 rounded-2xl text-xs" />
                          <Button type="submit" variant="ghost" className="h-9 border border-black/10 text-xs">
                            Skicka begäran
                          </Button>
                        </form>

                        <form action={startApplicationThreadAction} className="flex flex-col gap-2">
                          <input type="hidden" name="applicationId" value={application.id} />
                          <input type="hidden" name="subject" value="" />
                          <Input name="body" placeholder="Starta meddelandetråd…" className="h-10 rounded-2xl text-xs" />
                          <Button type="submit" variant="ghost" className="h-9 border border-black/10 text-xs">
                            Skicka meddelande
                          </Button>
                        </form>
                      </div>
                    </div>
                  </div>
                )
              }) : <p className="text-sm text-[#6b7280]">Inga ansökningar för detta objekt ännu.</p>}
            </div>

            {rankedApplications.filter(({ application }) => nextStatuses(application.status, 'landlord').includes('rejected')).length > 1 ? (
              <details className="mt-6 rounded-2xl border border-[#fecaca] bg-[#fff7f7] p-4">
                <summary className="cursor-pointer text-sm font-semibold text-[#b91c1c]">Massavslag (välj flera)</summary>
                <form action={bulkRejectApplicationsAction} className="mt-4 space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {rankedApplications
                      .filter(({ application }) => nextStatuses(application.status, 'landlord').includes('rejected'))
                      .map(({ application }) => (
                        <label key={application.id} className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm">
                          <input type="checkbox" name="applicationIds" value={application.id} />
                          {application.applicant.fullName} ({statusLabel(application.status)})
                        </label>
                      ))}
                  </div>
                  <Select name="rejectionReason" defaultValue={REJECTION_TEMPLATES[4].text}>
                    {REJECTION_TEMPLATES.map((template) => (
                      <option key={template.id} value={template.text}>{template.label}</option>
                    ))}
                  </Select>
                  <label className="flex items-center gap-2 text-sm font-semibold text-[#b91c1c]">
                    <input type="checkbox" name="confirmBulk" required />
                    Jag bekräftar att valda ansökningar ska avslås. Sökande notifieras.
                  </label>
                  <Button type="submit" variant="ghost" className="border border-[#fecaca] !text-[#b91c1c]">
                    Avslå valda
                  </Button>
                </form>
              </details>
            ) : null}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold text-[#111827]">Leads</h2>
              <div className="rounded-full bg-[#f7f8fc] px-3 py-1 text-xs font-semibold text-[#6b7280]">{listing.inquiries.length} st</div>
            </div>
            <div className="mt-5 space-y-4">
              {listing.inquiries.length ? listing.inquiries.map((inquiry) => (
                <div key={inquiry.id} className="rounded-2xl border border-[#e8ebf3] p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-lg font-semibold text-[#111827]">{inquiry.requester.fullName}</div>
                      <div className="mt-1 text-sm text-[#6b7280]">{inquiry.requester.email} · {inquiry.requester.phone || 'Ingen telefon'}</div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#6b7280]">
                        <span className="rounded-full bg-[#f7f8fc] px-3 py-1">Typ: {inquiry.inquiryType}</span>
                        <span className="rounded-full bg-[#f7f8fc] px-3 py-1">Status: {inquiry.status}</span>
                      </div>
                      {inquiry.message ? <p className="mt-4 text-sm leading-7 text-[#6b7280]">{inquiry.message}</p> : null}
                    </div>
                    <form action={updateInquiryStatusAction} className="flex min-w-[180px] flex-col gap-3">
                      <input type="hidden" name="inquiryId" value={inquiry.id} />
                      <Select name="status" defaultValue={inquiry.status}>
                        {inquiryStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </Select>
                      <textarea name="internalNote" defaultValue={inquiry.internalNote ?? ''} rows={3} placeholder="Intern anteckning" className="rounded-2xl border border-[#d7dbe7] px-4 py-3 text-sm" />
                      <Button type="submit" variant="secondary">Uppdatera lead</Button>
                    </form>
                  </div>
                </div>
              )) : <p className="text-sm text-[#6b7280]">Inga leads för detta objekt ännu.</p>}
            </div>
          </Card>
        </div>
      </div>
    </DashboardShell>
  )
}
