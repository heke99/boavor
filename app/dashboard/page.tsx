import Link from 'next/link'
import { AlertCircle, ArrowRight, Building2, FileText, Inbox, UserCheck } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Button } from '@/components/ui/Button'
import { getDashboardProfile } from '@/lib/data/profile'
import { getOwnerDashboardData, getUserApplications } from '@/lib/data/rental-applications'
import { calculateProfileScore } from '@/lib/dashboard/profile-score'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const [{ isSignedIn, profile }, userApplications] = await Promise.all([
    getDashboardProfile(),
    getUserApplications().catch(() => []),
  ])

  const ownerData = isSignedIn && profile
    ? await getOwnerDashboardData().catch(() => ({ listings: [], incomingApplications: [], incomingInquiries: [], profile }))
    : { listings: [], incomingApplications: [], incomingInquiries: [], profile }

  const profileScore = profile ? calculateProfileScore(profile) : null
  const isCompany = profile?.accountType === 'company' || ['company_admin', 'broker', 'landlord'].includes(profile?.role ?? '')
  const activeApplications = userApplications.filter((item) => ['submitted', 'reviewing', 'shortlisted', 'offered'].includes(item.status)).length
  const publishedListings = ownerData.listings.filter((item) => item.status === 'published').length
  const newLeads = ownerData.incomingInquiries.filter((item) => item.status === 'new').length

  return (
    <DashboardShell
      activePath="/dashboard"
      title={isCompany ? 'Företagsöversikt' : 'Min översikt'}
      description="Här får du en rollstyrd överblick över ansökningar, profil, dokument, objekt och inkommande leads."
    >
      <div className="grid gap-5 md:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-[#6b7280]">Profilstyrka</div>
            <UserCheck size={18} className="text-[#5b3df5]" />
          </div>
          <div className="mt-2 text-3xl font-semibold text-[#111827]">{profileScore?.score ?? 0}%</div>
          <p className="mt-3 text-sm leading-6 text-[#6b7280]">Komplettera profil, inkomst och dokument för starkare ansökningar.</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-[#6b7280]">Aktiva ansökningar</div>
            <FileText size={18} className="text-[#5b3df5]" />
          </div>
          <div className="mt-2 text-3xl font-semibold text-[#111827]">{activeApplications}</div>
          <p className="mt-3 text-sm leading-6 text-[#6b7280]">Följ vilka bostäder du har sökt och hur konkurrensen ser ut.</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-[#6b7280]">Mina objekt</div>
            <Building2 size={18} className="text-[#5b3df5]" />
          </div>
          <div className="mt-2 text-3xl font-semibold text-[#111827]">{ownerData.listings.length}</div>
          <p className="mt-3 text-sm leading-6 text-[#6b7280]">Privatpersoner och företag kan publicera och hantera egna objekt.</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-[#6b7280]">Nya leads</div>
            <Inbox size={18} className="text-[#5b3df5]" />
          </div>
          <div className="mt-2 text-3xl font-semibold text-[#111827]">{newLeads}</div>
          <p className="mt-3 text-sm leading-6 text-[#6b7280]">Intresseanmälningar, visningar och offertförfrågningar.</p>
        </Card>
      </div>

      {profileScore && profileScore.missing.length > 0 ? (
        <Card className="border border-[#fde68a] bg-[#fffbeb] p-6">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="mt-1 text-[#b45309]" />
            <div>
              <h2 className="text-lg font-semibold text-[#111827]">Förbättra din profil</h2>
              <p className="mt-2 text-sm leading-6 text-[#6b7280]">
                Saknas just nu: {profileScore.missing.slice(0, 5).join(', ')}{profileScore.missing.length > 5 ? ' med mera' : ''}.
              </p>
              <div className="mt-4">
                <Button href="/dashboard/profile">Komplettera profil</Button>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-[#111827]">Senaste ansökningar</h2>
            <Link href="/dashboard/applications" className="text-sm font-semibold text-[#5b3df5]">Visa alla</Link>
          </div>
          <div className="mt-5 space-y-3">
            {userApplications.slice(0, 5).map((application) => (
              <Link key={application.id} href={`/listing/${application.listing.slug}`} className="flex items-center justify-between gap-4 rounded-2xl border border-[#e8ebf3] p-4 transition hover:bg-[#f7f8fc]">
                <div>
                  <div className="font-semibold text-[#111827]">{application.listing.title}</div>
                  <div className="mt-1 text-sm text-[#6b7280]">{application.listing.city} · {application.applicantsCountForListing ?? 1} sökande</div>
                </div>
                <ArrowRight size={18} className="text-[#6b7280]" />
              </Link>
            ))}
            {userApplications.length === 0 ? <p className="text-sm text-[#6b7280]">Du har inte skickat några ansökningar ännu.</p> : null}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-[#111827]">Annonsörsarbete</h2>
            <Link href="/dashboard/listings" className="text-sm font-semibold text-[#5b3df5]">Hantera objekt</Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#f7f8fc] p-4">
              <div className="text-sm text-[#6b7280]">Publicerade</div>
              <div className="mt-2 text-2xl font-semibold text-[#111827]">{publishedListings}</div>
            </div>
            <div className="rounded-2xl bg-[#f7f8fc] p-4">
              <div className="text-sm text-[#6b7280]">Ansökningar</div>
              <div className="mt-2 text-2xl font-semibold text-[#111827]">{ownerData.incomingApplications.length}</div>
            </div>
            <div className="rounded-2xl bg-[#f7f8fc] p-4">
              <div className="text-sm text-[#6b7280]">Leads</div>
              <div className="mt-2 text-2xl font-semibold text-[#111827]">{ownerData.incomingInquiries.length}</div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button href="/dashboard/listings">Skapa eller hantera objekt</Button>
            <Button href="/dashboard/inquiries" variant="ghost" className="border border-[#d7dbe7] !text-[#111827]">Se leads</Button>
          </div>
        </Card>
      </div>
    </DashboardShell>
  )
}
