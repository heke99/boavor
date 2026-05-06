import { Card } from '@/components/ui/Card'

export default function AdminPage() {
  return (
    <section className="container-shell py-12">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold">Admin</h1>
        <p className="mt-3 text-base leading-7 text-[var(--muted)]">
          Enkel grund för adminyta. Nästa steg kan koppla statistik, moderation och användaröversikt mot Supabase.
        </p>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <Card className="p-6">
          <div className="text-sm text-[var(--muted)]">Användare</div>
          <div className="mt-2 text-3xl font-semibold">0</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-[var(--muted)]">Listings</div>
          <div className="mt-2 text-3xl font-semibold">6</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-[var(--muted)]">Flaggningar</div>
          <div className="mt-2 text-3xl font-semibold">0</div>
        </Card>
      </div>
    </section>
  )
}
