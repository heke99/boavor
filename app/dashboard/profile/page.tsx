import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { ProfileForm } from '@/components/dashboard/ProfileForm'
import { Card } from '@/components/ui/Card'
import { getDashboardProfile } from '@/lib/data/profile'

export const dynamic = 'force-dynamic'

export default async function DashboardProfilePage() {
  const result = await getDashboardProfile()

  if (!result.isSignedIn || !result.profile) {
    redirect('/login')
  }

  return (
    <DashboardShell
      activePath="/dashboard/profile"
      title="Min profil"
      description="Hantera dina kontaktuppgifter, bostadsprofil, medsökande och dokument som används i ansökningsflödet."
    >
      <ProfileForm profile={result.profile} />
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Profilstatus</h2>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-[#5b6475]">
          <li>• En komplett profil gör det snabbare att skicka bostadsansökningar.</li>
          <li>• Medsökande och dokument kan väljas när du skickar en ansökan.</li>
          <li>• Hyresvärden ser dina ansökningsuppgifter i ett strukturerat flöde.</li>
          <li>• Uppdaterade kontaktuppgifter minskar risken att missa återkoppling.</li>
        </ul>
      </Card>
    </DashboardShell>
  )
}
