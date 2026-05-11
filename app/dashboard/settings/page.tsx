import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { getDashboardProfile } from '@/lib/data/profile'
import { updateNotificationSettingsAction, updatePasswordAction } from '@/app/dashboard/profile/actions'

export const dynamic = 'force-dynamic'

export default async function DashboardSettingsPage() {
  const result = await getDashboardProfile()
  if (!result.isSignedIn || !result.profile) redirect('/login')

  const { profile } = result

  return (
    <DashboardShell
      activePath="/dashboard/settings"
      title="Inställningar"
      description="Hantera konto, notiser, bostadsintresse, lösenord och grundläggande integritetsinställningar."
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-[#111827]">Konto</h2>
          <div className="mt-5 space-y-4 text-sm">
            <div className="rounded-2xl bg-[#f7f8fc] p-4">
              <div className="text-[#6b7280]">E-post</div>
              <div className="mt-1 font-semibold text-[#111827]">{profile.email}</div>
            </div>
            <div className="rounded-2xl bg-[#f7f8fc] p-4">
              <div className="text-[#6b7280]">Kontotyp</div>
              <div className="mt-1 font-semibold text-[#111827]">{profile.accountType === 'company' ? 'Företag' : 'Privatperson'}</div>
            </div>
            <div className="rounded-2xl bg-[#f7f8fc] p-4">
              <div className="text-[#6b7280]">Roll</div>
              <div className="mt-1 font-semibold text-[#111827]">{profile.role}</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-[#111827]">Notiser och intresse</h2>
          <p className="mt-2 text-sm leading-6 text-[#6b7280]">
            Styr vad Bovaro ska prioritera för dig i bevakningar och rekommendationer.
          </p>
          <form action={updateNotificationSettingsAction} className="mt-6 space-y-4">
            <Select name="preferredListingIntent" defaultValue={profile.preferredListingIntent ?? 'both'}>
              <option value="rent">Hyra</option>
              <option value="buy">Köpa</option>
              <option value="both">Både hyra och köpa</option>
            </Select>
            <label className="flex items-center gap-3 rounded-2xl border border-[#e8ebf3] px-4 py-3 text-sm font-medium text-[#111827]">
              <input type="checkbox" name="marketingConsent" defaultChecked={profile.marketingConsent ?? false} />
              Jag vill få relevanta bostadstips och nyheter via e-post
            </label>
            <Button>Spara inställningar</Button>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-[#111827]">Ändra lösenord</h2>
          <p className="mt-2 text-sm leading-6 text-[#6b7280]">Ange nytt lösenord. Det måste vara minst 8 tecken.</p>
          <form action={updatePasswordAction} className="mt-6 space-y-4">
            <Input name="password" type="password" placeholder="Nytt lösenord" required />
            <Input name="confirmPassword" type="password" placeholder="Bekräfta nytt lösenord" required />
            <Button variant="secondary">Uppdatera lösenord</Button>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-[#111827]">Integritet och data</h2>
          <div className="mt-4 space-y-3 text-sm leading-6 text-[#6b7280]">
            <p>Personnummer och dokument ska endast visas där det behövs för bostadsflödet.</p>
            <p>Kontakta supporten om du vill begära registerutdrag, rättelse eller radering av konto.</p>
          </div>
          <div className="mt-5 rounded-2xl bg-[#fffbeb] p-4 text-sm text-[#92400e]">
            Av säkerhetsskäl hanteras kontoavslut och registerutdrag via verifierad supportbegäran.
          </div>
        </Card>
      </div>
    </DashboardShell>
  )
}
