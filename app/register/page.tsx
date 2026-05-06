import { UserPlus } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'

export default function RegisterPage() {
  return (
    <section className="container-shell py-16">
      <div className="mx-auto max-w-lg">
        <Card className="p-8">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[#b47000]">
              <UserPlus size={24} />
            </div>
            <h1 className="mt-5 text-3xl font-semibold">Skapa konto</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Redo för profiler, favoriter, sparade sökningar och senare auth-koppling via Supabase.
            </p>
          </div>

          <form className="mt-8 grid gap-4 md:grid-cols-2">
            <Input placeholder="Förnamn" />
            <Input placeholder="Efternamn" />
            <Input className="md:col-span-2" type="email" placeholder="E-post" />
            <Select className="md:col-span-2">
              <option>Bostadssökande</option>
              <option>Köpare</option>
              <option>Hyresvärd</option>
              <option>Säljare / mäklare</option>
            </Select>
            <Input type="password" placeholder="Lösenord" />
            <Input type="password" placeholder="Bekräfta lösenord" />
            <div className="md:col-span-2">
              <Button className="w-full">Skapa konto</Button>
            </div>
          </form>
        </Card>
      </div>
    </section>
  )
}
