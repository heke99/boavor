import Link from 'next/link'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card } from '@/components/ui/Card'
import { getUserApplications } from '@/lib/data/rental-applications'
import { formatCurrency } from '@/lib/utils'

const statusLabels = {
  submitted: 'Skickad',
  reviewing: 'Granskas',
  shortlisted: 'Shortlistad',
  offered: 'Erbjuden',
  rejected: 'Avslagen',
  withdrawn: 'Återtagen',
}

export default async function DashboardApplicationsPage() {
  const applications = await getUserApplications()

  return (
    <DashboardShell activePath="/dashboard/applications" title="Mina ansökningar" description="Här ser du alla skickade ansökningar, status och vilken köpoäng som följde med varje ansökan.">
      {applications.length ? (
        <div className="space-y-5">
          {applications.map((application) => (
            <Card key={application.id} className="p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{application.listing.city}</div>
                  <h2 className="mt-2 text-2xl font-semibold">{application.listing.title}</h2>
                  <div className="mt-3 text-sm text-[var(--muted)]">
                    Skickad {new Date(application.createdAt).toLocaleDateString('sv-SE')} · Köpoäng {application.queuePointsSnapshot}
                  </div>
                  <div className="mt-4 text-lg font-semibold text-[var(--primary)]">{formatCurrency(application.listing.price, 'rent')}</div>
                </div>
                <div className="rounded-full bg-[var(--secondary-soft)] px-4 py-2 text-sm font-semibold text-[var(--secondary)]">
                  {statusLabels[application.status]}
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-black/5 p-4">
                  <div className="text-sm text-[var(--muted)]">Medsökande</div>
                  <div className="mt-2 text-2xl font-semibold">{application.coApplicants.length}</div>
                </div>
                <div className="rounded-2xl bg-black/5 p-4">
                  <div className="text-sm text-[var(--muted)]">Dokument</div>
                  <div className="mt-2 text-2xl font-semibold">{application.documents.length}</div>
                </div>
                <div className="rounded-2xl bg-black/5 p-4">
                  <div className="text-sm text-[var(--muted)]">Ansökningsprofil</div>
                  <div className="mt-2 text-sm font-medium text-[var(--foreground)]">{application.applicant.fullName}</div>
                  <div className="mt-1 text-sm text-[var(--muted)]">{application.applicant.monthlyIncome ? `${application.applicant.monthlyIncome} kr/mån` : 'Inkomst saknas'}</div>
                </div>
              </div>

              {application.coverLetter ? (
                <div className="mt-6 rounded-2xl border border-black/8 p-4 text-sm leading-7 text-[var(--muted)]">{application.coverLetter}</div>
              ) : null}

              <div className="mt-6">
                <Link href={`/listing/${application.listing.slug}`} className="text-sm font-semibold text-[var(--primary)]">
                  Visa objekt igen
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-semibold">Inga ansökningar ännu</h2>
          <p className="mt-3 text-sm text-[var(--muted)]">När du ansöker om ett hyresobjekt kommer status, köpoäng och skickade dokument att synas här.</p>
        </Card>
      )}
    </DashboardShell>
  )
}
