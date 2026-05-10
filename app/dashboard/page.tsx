import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Button } from '@/components/ui/Button'
import { getDashboardProfile } from '@/lib/data/profile'
import { getUserApplications, getOwnerDashboardData } from '@/lib/data/rental-applications'

export default async function DashboardPage() {
  const [{ isSignedIn, profile }, userApplications] = await Promise.all([getDashboardProfile(), getUserApplications().catch(() => [])])

  const ownerData = isSignedIn && profile && ['landlord', 'broker', 'company_admin', 'admin', 'super_admin'].includes(profile.role)
    ? await getOwnerDashboardData().catch(() => ({ listings: [], incomingApplications: [], incomingInquiries: [], profile }))
    : { listings: [], incomingApplications: [], incomingInquiries: [], profile }

  return (
    <DashboardShell activePath="/dashboard" title="Din dashboard" description="Här samlar Bovaro översikt, profil, ansökningar och objekt i ett arbetsflöde som känns som en riktig plattform.">
      <div className="grid gap-5 md:grid-cols-4">
        <Card className="p-6">
          <div className="text-sm text-[var(--muted)]">Ansökningar</div>
          <div className="mt-2 text-3xl font-semibold">{userApplications.length}</div>
          <p className="mt-3 text-sm text-[var(--muted)]">Alla skickade hyresansökningar samlas på ett ställe.</p>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-[var(--muted)]">Köpoäng</div>
          <div className="mt-2 text-3xl font-semibold">{profile?.queueMembership?.currentPoints ?? 0}</div>
          <p className="mt-3 text-sm text-[var(--muted)]">Syns som extra merit för hyresvärdar, men avgör inte valet automatiskt.</p>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-[var(--muted)]">Mina objekt</div>
          <div className="mt-2 text-3xl font-semibold">{ownerData.listings.length}</div>
          <p className="mt-3 text-sm text-[var(--muted)]">Skapa, publicera och följ objekt från samma dashboard.</p>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-[var(--muted)]">Nya leads</div>
          <div className="mt-2 text-3xl font-semibold">{ownerData.incomingInquiries.length}</div>
          <p className="mt-3 text-sm text-[var(--muted)]">Intresseanmälningar, visningar och offertförfrågningar.</p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-2xl font-semibold">Nästa steg i ditt flöde</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Link href="/dashboard/profile" className="rounded-2xl border border-black/8 p-5 transition hover:bg-black/5">
            <div className="text-lg font-semibold">Fyll i profil</div>
            <p className="mt-2 text-sm text-[var(--muted)]">Gör ansökningar snabbare och mer kompletta.</p>
          </Link>
          <Link href="/dashboard/applications" className="rounded-2xl border border-black/8 p-5 transition hover:bg-black/5">
            <div className="text-lg font-semibold">Se mina ansökningar</div>
            <p className="mt-2 text-sm text-[var(--muted)]">Följ status, köpoäng och skickade dokument.</p>
          </Link>
          <Link href="/dashboard/listings" className="rounded-2xl border border-black/8 p-5 transition hover:bg-black/5">
            <div className="text-lg font-semibold">Hantera objekt</div>
            <p className="mt-2 text-sm text-[var(--muted)]">Skapa annonser och följ inkomna ansökningar.</p>
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href="/dashboard/applications">Gå till ansökningar</Button>
          <Button href="/dashboard/listings" variant="ghost" className="border border-black/8">
            Öppna annonsörsportal
          </Button>
          <Button href="/dashboard/inquiries" variant="secondary">
            Hantera leads
          </Button>
        </div>
      </Card>
    </DashboardShell>
  )
}
