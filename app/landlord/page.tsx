import Link from 'next/link'
import { BadgeCheck, Building2, FileText, TrendingUp, TriangleAlert } from 'lucide-react'
import { LandlordShell } from '@/components/landlord/LandlordShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getLandlordOverview, requireLandlordAccess } from '@/lib/data/landlord'

export const dynamic = 'force-dynamic'

const UNIT_STATUS_LABELS: Record<string, string> = {
  vacant: 'Vakanta',
  listed: 'Annonserade',
  rented: 'Uthyrda',
  renovation: 'Renovering',
  blocked: 'Blockerade',
}

export default async function LandlordDashboardPage() {
  const context = await requireLandlordAccess()
  const overview = await getLandlordOverview(context)

  return (
    <LandlordShell
      activePath="/landlord"
      title="Översikt"
      description="Nuläge för era annonser, ansökningar och bestånd."
    >
      {overview.companyVerification && overview.companyVerification.status !== 'verified' ? (
        <Card className="border border-[#fde68a] bg-[#fffbeb] p-6">
          <div className="flex items-start gap-3">
            <TriangleAlert size={20} className="mt-1 text-[#b45309]" />
            <div>
              <h2 className="text-lg font-semibold text-[#111827]">
                {overview.companyVerification.name} är inte verifierat ännu
              </h2>
              <p className="mt-1 text-sm text-[#6b7280]">
                Annonser kan inte publiceras förrän Bovaro har verifierat företaget. Kontrollera att uppgifterna i
                onboarding är kompletta.
              </p>
              <div className="mt-4">
                <Button href="/landlord/onboarding" variant="secondary">Slutför onboarding</Button>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-5 md:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-[#6b7280]">Aktiva annonser</div>
            <Building2 size={18} className="text-[#1d4ed8]" />
          </div>
          <div className="mt-2 text-3xl font-semibold text-[#111827]">{overview.activeListings}</div>
          <p className="mt-2 text-xs text-[#6b7280]">av {overview.totalListings} totalt</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-[#6b7280]">Ansökningar idag</div>
            <FileText size={18} className="text-[#1d4ed8]" />
          </div>
          <div className="mt-2 text-3xl font-semibold text-[#111827]">{overview.applicationsToday}</div>
          <p className="mt-2 text-xs text-[#6b7280]">{overview.totalApplications} totalt</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-[#6b7280]">Kvalificerade sökande</div>
            <BadgeCheck size={18} className="text-[#16a34a]" />
          </div>
          <div className="mt-2 text-3xl font-semibold text-[#111827]">{overview.qualifiedApplicants}</div>
          <p className="mt-2 text-xs text-[#6b7280]">enligt Matchkoll</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-[#6b7280]">Tid till uthyrning</div>
            <TrendingUp size={18} className="text-[#1d4ed8]" />
          </div>
          <div className="mt-2 text-3xl font-semibold text-[#111827]">
            {overview.averageDaysToRent !== null ? `${overview.averageDaysToRent} d` : '—'}
          </div>
          <p className="mt-2 text-xs text-[#6b7280]">snitt för uthyrda annonser</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-[#111827]">Beståndet</h2>
          {Object.keys(overview.unitCounts).length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-[#d7dbe7] p-6 text-center text-sm text-[#6b7280]">
              Inga lägenheter registrerade ännu.
              <div className="mt-4">
                <Button href="/landlord/properties" variant="secondary">Lägg upp fastigheter och lägenheter</Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {Object.entries(overview.unitCounts).map(([status, count]) => (
                <div key={status} className="rounded-2xl bg-[#f7f8fc] p-4">
                  <div className="text-sm text-[#6b7280]">{UNIT_STATUS_LABELS[status] ?? status}</div>
                  <div className="mt-2 text-2xl font-semibold text-[#111827]">{count}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold text-[#111827]">Snabbåtgärder</h2>
          <div className="mt-4 grid gap-3">
            <Button href="/landlord/applications" variant="secondary">Granska ansökningar</Button>
            <Button href="/dashboard/listings" variant="secondary">Skapa eller hantera annonser</Button>
            <Button href="/dashboard/policies" variant="secondary">Hantera uthyrningspolicyer</Button>
            <Link href="/landlord/settings" className="text-center text-sm font-semibold text-[#1d4ed8]">
              Team och inställningar
            </Link>
          </div>
        </Card>
      </div>
    </LandlordShell>
  )
}
