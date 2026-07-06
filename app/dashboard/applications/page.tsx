import Link from 'next/link'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getUserApplications, requireSignedInUser } from '@/lib/data/rental-applications'
import { getApplicationLimitCheck } from '@/lib/data/queue'
import { isActiveApplicationStatus } from '@/lib/queue/limits'
import { normalizeStatus, statusLabel } from '@/lib/applications/status-machine'
import {
  acceptOfferAction,
  applicantMockSignAction,
  confirmViewingAction,
  declineOfferAction,
  withdrawApplicationAction,
} from './actions'
import { formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function competitionLabel(count: number) {
  if (count >= 80) return 'Hög konkurrens'
  if (count >= 25) return 'Medel konkurrens'
  return 'Låg konkurrens'
}

export default async function DashboardApplicationsPage() {
  const [applications, { supabase, user }] = await Promise.all([getUserApplications(), requireSignedInUser()])
  const limitCheck = await getApplicationLimitCheck(supabase, user.id)

  // Open offers and contracts awaiting the user's signature.
  const applicationIds = applications.map((application) => application.id)
  const [{ data: offers }, { data: pendingContracts }] = applicationIds.length
    ? await Promise.all([
        supabase
          .from('rental_offers')
          .select('application_id, message, expires_at, status')
          .in('application_id', applicationIds)
          .eq('user_id', user.id)
          .eq('status', 'sent'),
        supabase
          .from('contracts')
          .select('id, application_id, status, provider, contract_signers(user_id, status)')
          .in('application_id', applicationIds)
          .eq('status', 'sent_for_signing'),
      ])
    : [{ data: [] }, { data: [] }]

  const offerMap = new Map((offers ?? []).map((offer) => [offer.application_id, offer]))
  const contractMap = new Map(
    (pendingContracts ?? [])
      .filter((contract) =>
        (contract.contract_signers ?? []).some((signer) => signer.user_id === user.id && signer.status === 'pending'),
      )
      .map((contract) => [contract.application_id, contract]),
  )
  const totalApplicants = applications.reduce((sum, item) => sum + (item.applicantsCountForListing ?? 1), 0)
  const averageCompetition = applications.length ? Math.round(totalApplicants / applications.length) : 0

  return (
    <DashboardShell
      activePath="/dashboard/applications"
      title="Mina ansökningar"
      description="Se vilka lägenheter och villor du har sökt, status, köpoäng, dokument och ungefärlig konkurrens per objekt."
    >
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <div className="text-sm text-[#6b7280]">Totalt sökta objekt</div>
          <div className="mt-2 text-3xl font-semibold text-[#111827]">{applications.length}</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-[#6b7280]">Aktiva ansökningar</div>
          <div className="mt-2 text-3xl font-semibold text-[#111827]">
            {limitCheck.activeCount}
            <span className="text-lg font-medium text-[#6b7280]"> / {limitCheck.limit}</span>
          </div>
          <p className="mt-2 text-xs text-[#6b7280]">
            {limitCheck.canApply
              ? `${limitCheck.remaining} plats${limitCheck.remaining === 1 ? '' : 'er'} kvar.`
              : 'Gränsen är nådd — återkalla en ansökan för att frigöra en plats.'}
          </p>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-[#6b7280]">Snitt sökande</div>
          <div className="mt-2 text-3xl font-semibold text-[#111827]">{averageCompetition}</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-[#6b7280]">Högsta köpoäng</div>
          <div className="mt-2 text-3xl font-semibold text-[#111827]">{Math.max(0, ...applications.map((item) => item.queuePointsSnapshot))}</div>
        </Card>
      </div>

      {applications.length ? (
        <div className="space-y-5">
          {applications.map((application) => {
            const applicantsCount = application.applicantsCountForListing ?? 1
            return (
              <Card key={application.id} className="p-6">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b7280]">{application.listing.city}</div>
                    <h2 className="mt-2 text-2xl font-semibold text-[#111827]">{application.listing.title}</h2>
                    <div className="mt-3 text-sm text-[#6b7280]">
                      Skickad {new Date(application.createdAt).toLocaleDateString('sv-SE')} · Köpoäng {application.queuePointsSnapshot}
                    </div>
                    <div className="mt-4 text-lg font-semibold text-[#5b3df5]">{formatCurrency(application.listing.price, 'rent')}</div>
                  </div>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <div className="rounded-full bg-[#eef2ff] px-4 py-2 text-sm font-semibold text-[#243b8f]">
                      {statusLabel(application.status)}
                    </div>
                    <div className="rounded-full bg-[#f7f8fc] px-4 py-2 text-sm font-semibold text-[#111827]">
                      {applicantsCount} sökande
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-4">
                  <div className="rounded-2xl bg-[#f7f8fc] p-4">
                    <div className="text-sm text-[#6b7280]">Konkurrens</div>
                    <div className="mt-2 text-lg font-semibold text-[#111827]">{competitionLabel(applicantsCount)}</div>
                  </div>
                  <div className="rounded-2xl bg-[#f7f8fc] p-4">
                    <div className="text-sm text-[#6b7280]">Medsökande</div>
                    <div className="mt-2 text-2xl font-semibold text-[#111827]">{application.coApplicants.length}</div>
                  </div>
                  <div className="rounded-2xl bg-[#f7f8fc] p-4">
                    <div className="text-sm text-[#6b7280]">Dokument</div>
                    <div className="mt-2 text-2xl font-semibold text-[#111827]">{application.documents.length}</div>
                  </div>
                  <div className="rounded-2xl bg-[#f7f8fc] p-4">
                    <div className="text-sm text-[#6b7280]">Ansökningsprofil</div>
                    <div className="mt-2 text-sm font-semibold text-[#111827]">{application.applicant.fullName}</div>
                    <div className="mt-1 text-sm text-[#6b7280]">{application.applicant.monthlyIncome ? `${application.applicant.monthlyIncome} kr/mån` : 'Inkomst saknas'}</div>
                  </div>
                </div>

                {application.coverLetter ? (
                  <div className="mt-6 rounded-2xl border border-[#e8ebf3] p-4 text-sm leading-7 text-[#6b7280]">{application.coverLetter}</div>
                ) : null}

                {normalizeStatus(application.status) === 'offered' ? (
                  <div className="mt-6 rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] p-4">
                    <div className="text-sm font-semibold text-[#166534]">
                      Du har fått ett erbjudande om bostaden. Svara så snart du kan.
                    </div>
                    {offerMap.get(application.id)?.message ? (
                      <p className="mt-2 text-sm leading-6 text-[#166534]">{offerMap.get(application.id)?.message}</p>
                    ) : null}
                    {offerMap.get(application.id)?.expires_at ? (
                      <p className="mt-1 text-xs font-semibold text-[#92400e]">
                        Svara senast {new Date(offerMap.get(application.id)!.expires_at as string).toLocaleString('sv-SE')}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-3">
                      <form action={acceptOfferAction}>
                        <input type="hidden" name="applicationId" value={application.id} />
                        <Button type="submit" className="h-10">Acceptera erbjudandet</Button>
                      </form>
                      <form action={declineOfferAction}>
                        <input type="hidden" name="applicationId" value={application.id} />
                        <Button type="submit" variant="ghost" className="h-10 border border-black/10">Tacka nej</Button>
                      </form>
                    </div>
                  </div>
                ) : null}

                {contractMap.has(application.id) ? (
                  <div className="mt-6 rounded-2xl border border-[#c7d2fe] bg-[#eef2ff] p-4">
                    <div className="text-sm font-semibold text-[#3730a3]">
                      Kontraktet väntar på din signatur
                      {contractMap.get(application.id)?.provider === 'mock' ? ' (testsignering — gäller ej som riktig e-signatur)' : ''}
                    </div>
                    <form action={applicantMockSignAction} className="mt-3">
                      <input type="hidden" name="contractId" value={contractMap.get(application.id)!.id} />
                      <Button type="submit" className="h-10">
                        {contractMap.get(application.id)?.provider === 'mock' ? 'Signera (test)' : 'Öppna signering'}
                      </Button>
                    </form>
                  </div>
                ) : null}

                {normalizeStatus(application.status) === 'viewing_invited' ? (
                  <div className="mt-6 rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] p-4">
                    <div className="text-sm font-semibold text-[#1d4ed8]">
                      Du är inbjuden till visning. Bekräfta att du kommer.
                    </div>
                    <form action={confirmViewingAction} className="mt-3">
                      <input type="hidden" name="applicationId" value={application.id} />
                      <Button type="submit" className="h-10">Bekräfta visning</Button>
                    </form>
                  </div>
                ) : null}

                {application.history && application.history.length > 0 ? (
                  <details className="mt-6 rounded-2xl border border-[#e8ebf3] p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-[#5b3df5]">
                      Historik ({application.history.length} händelser)
                    </summary>
                    <ol className="mt-3 space-y-2 border-l-2 border-[#e8ebf3] pl-4">
                      {application.history.map((event, index) => (
                        <li key={`${application.id}-history-${index}`} className="text-sm">
                          <span className="font-semibold text-[#111827]">{statusLabel(event.toStatus)}</span>
                          <span className="ml-2 text-xs text-[#6b7280]">
                            {new Date(event.createdAt).toLocaleString('sv-SE')}
                          </span>
                          {event.note ? <div className="text-xs text-[#6b7280]">{event.note}</div> : null}
                        </li>
                      ))}
                    </ol>
                  </details>
                ) : null}

                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <Link href={`/listing/${application.listing.slug}`} className="text-sm font-semibold text-[#5b3df5]">
                    Visa objekt igen
                  </Link>
                  {isActiveApplicationStatus(application.status) ? (
                    <form action={withdrawApplicationAction}>
                      <input type="hidden" name="applicationId" value={application.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        className="h-9 border border-[#fecaca] px-4 text-xs !text-[#b91c1c]"
                      >
                        Återkalla ansökan
                      </Button>
                    </form>
                  ) : null}
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-semibold text-[#111827]">Inga ansökningar ännu</h2>
          <p className="mt-3 text-sm text-[#6b7280]">När du ansöker om ett hyresobjekt kommer status, köpoäng, konkurrens och skickade dokument att synas här.</p>
        </Card>
      )}
    </DashboardShell>
  )
}
