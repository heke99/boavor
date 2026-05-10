import Link from 'next/link'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card } from '@/components/ui/Card'
import { getUserApplications } from '@/lib/data/rental-applications'
import { formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const statusLabels = {
  submitted: 'Skickad',
  reviewing: 'Granskas',
  shortlisted: 'Shortlistad',
  offered: 'Erbjuden',
  rejected: 'Avslagen',
  withdrawn: 'Återtagen',
}

function competitionLabel(count: number) {
  if (count >= 80) return 'Hög konkurrens'
  if (count >= 25) return 'Medel konkurrens'
  return 'Låg konkurrens'
}

export default async function DashboardApplicationsPage() {
  const applications = await getUserApplications()
  const active = applications.filter((item) => ['submitted', 'reviewing', 'shortlisted', 'offered'].includes(item.status)).length
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
          <div className="mt-2 text-3xl font-semibold text-[#111827]">{active}</div>
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
                      {statusLabels[application.status]}
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

                <div className="mt-6">
                  <Link href={`/listing/${application.listing.slug}`} className="text-sm font-semibold text-[#5b3df5]">
                    Visa objekt igen
                  </Link>
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
