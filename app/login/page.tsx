import { LockKeyhole, Mail } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function LoginPage() {
  return (
    <section className="container-shell py-16">
      <div className="mx-auto max-w-md">
        <Card className="p-8">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--secondary-soft)] text-[var(--secondary)]">
              <LockKeyhole size={24} />
            </div>
            <h1 className="mt-5 text-3xl font-semibold">Logga in</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Klar layout för Supabase Auth. Koppla server actions eller client auth i nästa steg.
            </p>
          </div>

          <form className="mt-8 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">E-post</label>
              <Input type="email" placeholder="din@email.se" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Lösenord</label>
              <Input type="password" placeholder="••••••••" />
            </div>
            <Button className="w-full">
              <Mail size={16} className="mr-2" />
              Logga in
            </Button>
          </form>
        </Card>
      </div>
    </section>
  )
}
