import Link from 'next/link'
import { Mail, Phone, Building2, CalendarClock } from 'lucide-react'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { getOwnerDashboardData } from '@/lib/data/rental-applications'
import { formatCurrency } from '@/lib/utils'
import { listingSegmentLabels, listingTypeLabels } from '@/lib/listing-options'
import { updateInquiryStatusAction } from '../listings/actions'
import type { InquiryStatus, InquiryType, ListingInquiryItem } from '@/lib/types'

export const dynamic = 'force-dynamic'

const inquiryStatusOptions: Array<{ value: InquiryStatus; label: string }> = [
  { value: 'new', label: 'Ny' },
  { value: 'contacted', label: 'Kontaktad' },
  { value: 'viewing_booked', label: 'Visning bokad' },
  { value: 'negotiating', label: 'Förhandlar' },
  { value: 'closed', label: 'Avslutad' },
  { value: 'rejected', label: 'Avvisad' },
]

const statusLabels: Record<InquiryStatus, string> = {
  new: 'Ny',
  contacted: 'Kontaktad',
  viewing_booked: 'Visning bokad',
  negotiating: 'Förhandlar',
  closed: 'Avslutad',
  rejected: 'Avvisad',
}

const typeLabels: Record<InquiryType, string> = {
  interest: 'Intresseanmälan',
  viewing: 'Visningsförfrågan',
  offer_request: 'Offertförfrågan',
  contact: 'Kontaktförfrågan',
}

function countByStatus(inquiries: ListingInquiryItem[], status: InquiryStatus) {
  return inquiries.filter((inquiry) => inquiry.status === status).length
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export default async function DashboardInquiriesPage() {
  const { incomingInquiries } = await getOwnerDashboardData()
  const newCount = countByStatus(incomingInquiries, 'new')
  const activeCount = incomingInquiries.filter((inquiry) => ['new', 'contacted', 'viewing_booked', 'negotiating'].includes(inquiry.status)).length
  const viewingCount = countByStatus(incomingInquiries, 'viewing_booked')
  const closedCount = countByStatus(incomingInquiries, 'closed')

  return (
    <DashboardShell
      activePath="/dashboard/inquiries"
      title="Leads och intresseanmälningar"
      description="Hantera kommersiella leads, visningsförfrågningar, offertförfrågningar och köpintressen från lokaler, kontor, parkering, förråd, mark och fastigheter."
    >
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <div className="text-sm text-[var(--muted)]">Totalt</div>
          <div className="mt-2 text-3xl font-semibold">{incomingInquiries.length}</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-[var(--muted)]">Nya</div>
          <div className="mt-2 text-3xl font-semibold">{newCount}</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-[var(--muted)]">Aktiva</div>
          <div className="mt-2 text-3xl font-semibold">{activeCount}</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-[var(--muted)]">Visningar / avslutade</div>
          <div className="mt-2 text-3xl font-semibold">{viewingCount} / {closedCount}</div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Inkomna leads</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Detta är inte hyresansökningar. Här hamnar kommersiella förfrågningar, bostäder till salu och andra objekt där kunden vill bli kontaktad.
            </p>
          </div>
          <Button href="/dashboard/listings" variant="ghost" className="border border-black/8">
            Hantera objekt
          </Button>
        </div>

        <div className="mt-6 space-y-4">
          {incomingInquiries.length ? (
            incomingInquiries.map((inquiry) => (
              <div key={inquiry.id} className="rounded-[26px] border border-black/8 bg-white p-5 shadow-[0_10px_30px_rgba(13,17,32,0.04)]">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#2c3e94]">
                        {statusLabels[inquiry.status]}
                      </span>
                      <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                        {typeLabels[inquiry.inquiryType]}
                      </span>
                      <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                        {listingSegmentLabels[inquiry.listing.listingSegment]} · {listingTypeLabels[inquiry.listing.listingType]}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                      <div>
                        <Link href={`/listing/${inquiry.listing.slug}`} className="text-lg font-semibold text-[#111827] hover:text-[#5b3df5]">
                          {inquiry.listing.title}
                        </Link>
                        <div className="mt-2 text-sm text-[var(--muted)]">
                          {inquiry.listing.city} · {formatCurrency(inquiry.listing.price, inquiry.listing.listingType)}
                        </div>
                      </div>

                      <div>
                        <div className="text-lg font-semibold text-[#111827]">{inquiry.requester.fullName}</div>
                        <div className="mt-2 grid gap-2 text-sm text-[var(--muted)]">
                          <div className="flex items-center gap-2">
                            <Mail size={15} />
                            <a href={`mailto:${inquiry.requester.email}`} className="hover:text-[#5b3df5]">{inquiry.requester.email}</a>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone size={15} />
                            {inquiry.requester.phone ? <a href={`tel:${inquiry.requester.phone}`} className="hover:text-[#5b3df5]">{inquiry.requester.phone}</a> : 'Ingen telefon'}
                          </div>
                          {inquiry.requester.companyName ? (
                            <div className="flex items-center gap-2">
                              <Building2 size={15} />
                              {inquiry.requester.companyName}
                            </div>
                          ) : null}
                          <div className="flex items-center gap-2">
                            <CalendarClock size={15} />
                            {formatDate(inquiry.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {inquiry.message ? (
                      <div className="mt-5 rounded-2xl bg-black/5 p-4 text-sm leading-7 text-[#4b5563]">
                        {inquiry.message}
                      </div>
                    ) : null}

                    {inquiry.internalNote ? (
                      <div className="mt-3 rounded-2xl bg-[#fff7ed] p-4 text-sm leading-7 text-[#9a3412]">
                        Intern anteckning: {inquiry.internalNote}
                      </div>
                    ) : null}
                  </div>

                  <form action={updateInquiryStatusAction} className="w-full space-y-3 rounded-2xl bg-black/[0.03] p-4 xl:w-[280px]">
                    <input type="hidden" name="inquiryId" value={inquiry.id} />
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Status</label>
                      <Select name="status" defaultValue={inquiry.status} className="mt-2">
                        {inquiryStatusOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Intern anteckning</label>
                      <textarea
                        name="internalNote"
                        defaultValue={inquiry.internalNote ?? ''}
                        rows={4}
                        placeholder="T.ex. ring tillbaka, visning bokad, fel målgrupp..."
                        className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#5b3df5] focus:ring-2 focus:ring-[#5b3df5]/15"
                      />
                    </div>
                    <Button type="submit" variant="secondary" className="w-full">
                      Uppdatera lead
                    </Button>
                  </form>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[26px] border border-dashed border-black/12 bg-black/[0.02] p-8 text-center">
              <h3 className="text-xl font-semibold">Inga leads ännu</h3>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                När någon skickar intresseanmälan, bokar visning, begär offert eller kontaktar annonsören från ett kommersiellt objekt visas det här.
              </p>
            </div>
          )}
        </div>
      </Card>
    </DashboardShell>
  )
}
