import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { ProfileForm } from '@/components/dashboard/ProfileForm'
import { Card } from '@/components/ui/Card'
import { getDashboardProfile } from '@/lib/data/profile'

export default async function DashboardProfilePage() {
  const result = await getDashboardProfile()

  if (!result.isSignedIn || !result.profile) {
    redirect('/login')
  }

  return (
    <DashboardShell
      activePath="/dashboard/profile"
      title="Min profil"
      description="Nu kopplad till riktig Supabase-data, medsökande, dokumentstruktur och Bovaro Kö+."
    >
      <ProfileForm profile={result.profile} />
      <Card className="p-6">
        <h2 className="text-xl font-semibold">Vad som nu är riktigt byggt</h2>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)]">
          <li>• Profilen läses från och sparas till Supabase</li>
          <li>• Medsökande kan sparas och tas bort</li>
          <li>• Profildokument kan sparas som metadata och länkar</li>
          <li>• Köpoäng och köstatus är redo att användas i framtida ansökningsflöden</li>
        </ul>
      </Card>
    </DashboardShell>
  )
}
