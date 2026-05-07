import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { submitRentalApplication } from './actions'
import { getApplyPageData } from '@/lib/data/rental-applications'
import { formatCurrency } from '@/lib/utils'

type Props = {
  params: Promise<{ slug: string }>
}

export default async function ApplyPage({ params }: Props) {
  const { slug } = await params
  const { listing, profile } = await getApplyPageData(slug)

  if (listing.listingType !== 'rent') redirect(`/listing/${slug}`)

  return (
    <DashboardShell
      activePath="/dashboard/applications"
      title="Ansök om bostad"
      description="Din profil är förifylld för att göra ansökan snabb. Köpoäng syns som extra merit för hyresvärden, men avgör inte valet automatiskt."
    >
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-6">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Objekt</div>
          <h2 className="mt-3 text-2xl font-semibold">{listing.title}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">{listing.areaName}, {listing.city}</p>
          <div className="mt-6 text-3xl font-semibold text-[var(--primary)]">{formatCurrency(listing.price, 'rent')}</div>
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm text-[var(--muted)]">
            <div className="rounded-2xl bg-black/5 p-4">
              <div>Rum</div>
              <div className="mt-2 text-xl font-semibold text-[var(--foreground)]">{listing.rooms}</div>
            </div>
            <div className="rounded-2xl bg-black/5 p-4">
              <div>Boyta</div>
              <div className="mt-2 text-xl font-semibold text-[var(--foreground)]">{listing.areaSqm} m²</div>
            </div>
          </div>
          <div className="mt-6 rounded-[24px] border border-black/8 bg-[var(--secondary-soft)] p-5">
            <div className="text-sm font-semibold text-[var(--secondary)]">Köstatus</div>
            <div className="mt-3 text-3xl font-semibold">{profile.queueMembership?.currentPoints ?? 0} poäng</div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Hyresvärden ser poängen som ett extra incitament, men kan fortfarande välja annan sökande utifrån helhetsbedömning.
            </p>
          </div>
        </Card>

        <form action={submitRentalApplication} className="space-y-6">
          <input type="hidden" name="slug" value={listing.slug} />

          <Card className="p-6">
            <h3 className="text-xl font-semibold">Förifylld profil</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Input value={`${profile.firstName} ${profile.lastName}`.trim()} disabled />
              <Input value={profile.email} disabled />
              <Input value={profile.phone || 'Ingen telefon angiven'} disabled />
              <Input value={profile.monthlyIncome ? `${profile.monthlyIncome} kr / mån` : 'Ingen inkomst angiven'} disabled />
              <Input value={profile.householdSize ? `${profile.householdSize} personer` : 'Ej angivet'} disabled />
              <Input value={profile.employmentStatus || 'Ej angivet'} disabled />
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-xl font-semibold">Medsökande</h3>
            <div className="mt-4 space-y-3">
              {profile.coApplicants.length ? (
                profile.coApplicants.map((item) => (
                  <label key={item.id} className="flex items-start gap-3 rounded-2xl border border-black/8 p-4 text-sm">
                    <input type="checkbox" name="coApplicantIds" value={item.id} defaultChecked className="mt-1" />
                    <div>
                      <div className="font-semibold">{item.fullName}</div>
                      <div className="text-[var(--muted)]">{item.relationship || 'Medsökande'} · {item.email || 'Ingen e-post'}</div>
                    </div>
                  </label>
                ))
              ) : (
                <p className="text-sm text-[var(--muted)]">Du har inga medsökande sparade ännu på profilen.</p>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-xl font-semibold">Dokument</h3>
            <div className="mt-4 space-y-3">
              {profile.documents.length ? (
                profile.documents.map((item) => (
                  <label key={item.id} className="flex items-start gap-3 rounded-2xl border border-black/8 p-4 text-sm">
                    <input type="checkbox" name="documentIds" value={item.id} defaultChecked className="mt-1" />
                    <div>
                      <div className="font-semibold">{item.fileName}</div>
                      <div className="text-[var(--muted)]">{item.documentType}</div>
                    </div>
                  </label>
                ))
              ) : (
                <p className="text-sm text-[var(--muted)]">Du har inga dokument sparade ännu på profilen.</p>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-xl font-semibold">Personligt meddelande</h3>
            <textarea
              name="coverLetter"
              rows={7}
              placeholder="Beskriv varför just du passar för bostaden, önskat tillträde och annan relevant information."
              className="mt-4 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[rgba(91,61,245,0.12)]"
            />
            <div className="mt-6 flex items-center justify-between gap-4">
              <p className="max-w-xl text-sm text-[var(--muted)]">När du skickar ansökan sparas en snapshot av din profil, dina valda dokument, medsökande och köpoäng vid ansökningstillfället.</p>
              <Button type="submit">Skicka ansökan</Button>
            </div>
          </Card>
        </form>
      </div>
    </DashboardShell>
  )
}
