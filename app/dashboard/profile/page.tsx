import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { ProfileForm } from '@/components/dashboard/ProfileForm'
import { Card } from '@/components/ui/Card'

export default function DashboardProfilePage() {
  return (
    <DashboardShell activePath="/dashboard/profile" title="Min profil" description="Byggd för återanvändbar profil så nästa ansökan går snabbare.">
      <ProfileForm />
      <Card className="p-6">
        <h2 className="text-xl font-semibold">Vad som är förberett här</h2>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)]">
          <li>• Profilfälten är utlagda för riktig Supabase-lagring</li>
          <li>• Redo för documents, medsökande och preferenser</li>
          <li>• Strukturen passar framtida förifyllning i ansökningsflödet</li>
        </ul>
      </Card>
    </DashboardShell>
  )
}
