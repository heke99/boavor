import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { getDashboardProfile } from '@/lib/data/profile'
import { createPrivacyRequestAction, updateNotificationSettingsAction, updatePasswordAction } from '@/app/dashboard/profile/actions'
import { updateNotificationPreferencesAction } from '@/app/dashboard/notifications/actions'
import { getAuthContext } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

export default async function DashboardSettingsPage() {
  const result = await getDashboardProfile()
  if (!result.isSignedIn || !result.profile) redirect('/login')

  const { profile } = result

  const { supabase, user } = await getAuthContext({ loginRedirect: '/login?next=/dashboard/settings' })
  const { data: emailPreferences } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

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
          <h2 className="text-2xl font-semibold text-[#111827]">E-postnotiser</h2>
          <p className="mt-2 text-sm leading-6 text-[#6b7280]">
            Välj vilka händelser som ska skickas till din e-post. Notiser i plattformen påverkas inte.
          </p>
          <form action={updateNotificationPreferencesAction} className="mt-6 space-y-3">
            {[
              ['emailApplications', 'Ansökningar och statusändringar', emailPreferences?.email_applications ?? true],
              ['emailMessages', 'Olästa meddelanden', emailPreferences?.email_messages ?? true],
              ['emailQueue', 'Köpåminnelser (även externa köer)', emailPreferences?.email_queue ?? true],
              ['emailSavedSearches', 'Bevakningsträffar', emailPreferences?.email_saved_searches ?? true],
              ['emailByta', 'Bytesmatchningar', emailPreferences?.email_byta ?? true],
              ['weeklyDigest', 'Veckosammanfattning', emailPreferences?.weekly_digest ?? true],
              ['emailMarketing', 'Bostadstips och produktnyheter', emailPreferences?.email_marketing ?? false],
            ].map(([name, label, checked]) => (
              <label key={String(name)} className="flex items-center gap-3 rounded-2xl border border-[#e8ebf3] px-4 py-3 text-sm font-medium text-[#111827]">
                <input type="checkbox" name={String(name)} defaultChecked={Boolean(checked)} />
                {String(label)}
              </label>
            ))}
            <Button variant="secondary">Spara e-postnotiser</Button>
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
            <p>
              Du kan ladda ner en kopia av dina uppgifter direkt, eller skicka en begäran om rättelse, begränsning
              eller radering.
            </p>
          </div>
          <a
            href="/dashboard/settings/export"
            className="mt-4 inline-flex items-center rounded-2xl border border-[#d7dbe7] bg-white px-5 py-3 text-sm font-semibold text-[#111827] transition hover:bg-[#f7f8fc]"
          >
            Ladda ner mina uppgifter (JSON)
          </a>
          <form action={createPrivacyRequestAction} className="mt-5 space-y-4">
            <Select name="requestType" defaultValue="export">
              <option value="export">Registerutdrag</option>
              <option value="rectification">Rättelse av uppgifter</option>
              <option value="restriction">Begränsning av behandling</option>
              <option value="erasure">Radering av konto/data</option>
            </Select>
            <textarea
              name="message"
              rows={4}
              placeholder="Beskriv kort vad du vill att supporten hanterar."
              className="w-full rounded-2xl border border-[#d7dbe7] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#5b3df5] focus:ring-4 focus:ring-[rgba(91,61,245,0.12)]"
            />
            <Button variant="ghost" className="border border-[#d7dbe7] !text-[#111827]">Skicka integritetsbegäran</Button>
          </form>
        </Card>
      </div>
    </DashboardShell>
  )
}
