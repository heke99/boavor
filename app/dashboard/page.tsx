import { Card } from '@/components/ui/Card'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Button } from '@/components/ui/Button'

export default function DashboardPage() {
  return (
    <DashboardShell activePath="/dashboard" title="Din dashboard" description="Här samlar Bovaro översikt, profil, favoriter och sparade sökningar.">
      <div className="grid gap-5 md:grid-cols-3">
        <Card className="p-6">
          <div className="text-sm text-[var(--muted)]">Favoriter</div>
          <div className="mt-2 text-3xl font-semibold">0</div>
          <p className="mt-3 text-sm text-[var(--muted)]">Spara objekt för att jämföra och följa marknaden enklare.</p>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-[var(--muted)]">Sparade sökningar</div>
          <div className="mt-2 text-3xl font-semibold">2</div>
          <p className="mt-3 text-sm text-[var(--muted)]">Byggt för notiser och bevakningar i nästa steg.</p>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-[var(--muted)]">Profilstatus</div>
          <div className="mt-2 text-3xl font-semibold">78%</div>
          <p className="mt-3 text-sm text-[var(--muted)]">Mer komplett profil ger snabbare ansökningar i kommande fas.</p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-2xl font-semibold">Nästa naturliga byggsteg</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
          Med denna struktur är projektet redo att koppla verklig auth, verklig profilhantering och riktiga favoriter/sökningar mot Supabase-tabellerna.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href="/dashboard/profile">Fyll i profil</Button>
          <Button href="/dashboard/favorites" variant="ghost" className="border border-black/8">
            Gå till favoriter
          </Button>
        </div>
      </Card>
    </DashboardShell>
  )
}
