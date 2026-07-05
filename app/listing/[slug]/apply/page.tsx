import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Fingerprint } from 'lucide-react'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { submitRentalApplication } from './actions'
import { getApplyPageData, requireSignedInUser } from '@/lib/data/rental-applications'
import { getIdentityState } from '@/lib/data/identity'
import { getApplicationLimitCheck } from '@/lib/data/queue'
import { formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ApplyPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams])
  const [{ listing, profile }, identity, { supabase, user }] = await Promise.all([
    getApplyPageData(slug),
    getIdentityState(),
    requireSignedInUser(),
  ])
  const limitCheck = await getApplicationLimitCheck(supabase, user.id)

  if (listing.listingType !== 'rent') redirect(`/listing/${slug}`)

  const errorCode = typeof sp.error === 'string' ? sp.error : null
  const errorMessage = errorCode === 'rate_limited'
    ? 'Du har skickat flera ansökningar nyligen. Vänta en stund och försök igen.'
    : errorCode === 'failed'
      ? 'Ansökan kunde inte skickas just nu.'
      : errorCode === 'identity_required'
        ? 'Du behöver verifiera din identitet innan du kan ansöka.'
        : errorCode === 'underage'
          ? 'Du måste vara minst 18 år för att kunna ansöka om bostad.'
          : errorCode === 'consent_required'
            ? 'Du måste godkänna att dina uppgifter delas med hyresvärden.'
            : errorCode === 'limit_reached'
              ? `Du har nått gränsen för aktiva ansökningar (${limitCheck.limit} st). Återkalla en ansökan eller vänta tills en avslutas.`
              : errorCode === 'deadline_passed'
                ? 'Ansökningstiden för den här bostaden har gått ut.'
                : null

  if (!identity.isVerified || !identity.isAdult) {
    return (
      <DashboardShell
        activePath="/dashboard/applications"
        title="Ansök om bostad"
        description="Innan du kan skicka en ansökan behöver din identitet vara verifierad."
      >
        <Card className="p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#5b3df5]">
              <Fingerprint size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-[#111827]">
                {identity.isVerified ? 'Du måste vara minst 18 år' : 'Verifiera din identitet först'}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[#6b7280]">
                {identity.isVerified
                  ? 'Enligt vår ålderskontroll är du under 18 år. Bostadsansökningar kräver att du är myndig.'
                  : 'För att skydda både dig och hyresvärden kräver Bovaro att alla sökande verifierar sin identitet innan de skickar ansökningar. Verifieringen tar bara en minut.'}
              </p>
              {!identity.isVerified ? (
                <div className="mt-6">
                  <Button href="/dashboard/identity">
                    <Fingerprint size={16} className="mr-2" />
                    Verifiera identitet
                  </Button>
                </div>
              ) : null}
              <p className="mt-4 text-sm text-[#6b7280]">
                <Link href={`/listing/${slug}`} className="font-semibold text-[#5b3df5] hover:underline">
                  Tillbaka till annonsen
                </Link>
              </p>
            </div>
          </div>
        </Card>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell
      activePath="/dashboard/applications"
      title="Ansök om bostad"
      description="Skicka en komplett ansökan med profil, dokument, medsökande och personligt meddelande."
    >
      {errorMessage ? (
        <div className="rounded-2xl bg-[#fef2f2] p-4 text-sm font-semibold text-[#b91c1c]">{errorMessage}</div>
      ) : null}
      {!limitCheck.canApply ? (
        <div className="rounded-2xl bg-[#fef2f2] p-4 text-sm font-semibold text-[#b91c1c]">
          Du har {limitCheck.activeCount} aktiva ansökningar av max {limitCheck.limit}. Du kan inte skicka fler just
          nu — återkalla en ansökan under Ansökningar för att frigöra en plats.
        </div>
      ) : limitCheck.remaining <= 2 ? (
        <div className="rounded-2xl bg-[#fffbeb] p-4 text-sm font-semibold text-[#92400e]">
          Du har {limitCheck.activeCount} av max {limitCheck.limit} aktiva ansökningar. {limitCheck.remaining} plats
          {limitCheck.remaining === 1 ? '' : 'er'} kvar.
        </div>
      ) : null}
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
            <h3 className="text-xl font-semibold">Ansökningsuppgifter</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Input name="moveInDate" type="date" />
              <Input name="monthlyIncome" type="number" min={0} placeholder="Månadsinkomst" defaultValue={profile.monthlyIncome ?? undefined} />
              <Input name="employmentType" placeholder="Anställningsform" defaultValue={profile.employmentStatus || undefined} />
              <Input name="householdSize" type="number" min={1} placeholder="Hushållsstorlek" defaultValue={profile.householdSize ?? undefined} />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-black/8 px-4 py-3 text-sm">
                <input type="checkbox" name="pets" />
                Jag har husdjur
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-black/8 px-4 py-3 text-sm">
                <input type="checkbox" name="smoking" />
                Rökning förekommer i hushållet
              </label>
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
            <label className="mt-6 flex gap-3 rounded-2xl border border-black/8 bg-[#f8fafc] p-4 text-sm leading-6">
              <input type="checkbox" name="dataSharingConsent" className="mt-1 h-4 w-4 accent-[#5b3df5]" />
              <span>
                Jag godkänner att mina ansökningsuppgifter och valda dokument delas med hyresvärden för den här
                bostaden.
              </span>
            </label>
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
