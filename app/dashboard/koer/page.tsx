import { CalendarClock, ExternalLink, ListChecks, ShieldCheck } from 'lucide-react'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { getAuthContext } from '@/lib/auth/permissions'
import { addExternalQueueAction, removeExternalQueueAction, updateExternalQueueAction } from './actions'

export const dynamic = 'force-dynamic'

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('sv-SE')
}

export default async function ExternalQueuesPage() {
  const { supabase, user } = await getAuthContext({ loginRedirect: '/login?next=/dashboard/koer' })

  const [{ data: providers }, { data: memberships }, { data: bovaroQueue }] = await Promise.all([
    supabase
      .from('external_queue_providers')
      .select('id, name, city, website_url, signup_url, annual_fee_sek, renewal_rule')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('external_queue_memberships')
      .select('id, provider_id, custom_provider_name, city, login_url, joined_date, current_points, current_days, renewal_date, last_updated_date, note')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('queue_memberships')
      .select('current_points, joined_queue_at, membership_status')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const providerName = (providerId: string | null, customName: string | null) => {
    if (customName) return customName
    return (providers ?? []).find((provider) => provider.id === providerId)?.name ?? 'Okänd kö'
  }

  return (
    <DashboardShell
      activePath="/dashboard/koer"
      title="Alla mina köer"
      description="Samla dina bostadsköer på ett ställe. Du uppdaterar uppgifterna själv — Bovaro loggar aldrig in åt dig och sparar inga inloggningsuppgifter."
    >
      <div className="rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] p-4 text-sm leading-6 text-[#1e40af]">
        <ShieldCheck size={15} className="mr-1 inline" />
        Integritet: endast uppgifter du själv skriver in sparas (poäng, datum, länkar). Inga lösenord, ingen
        automatisk inloggning, ingen skrapning.
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 text-lg font-semibold text-[#111827]">
          <ListChecks size={18} className="text-[#5b3df5]" />
          Översikt
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-[#f7f8fc] p-4">
            <div className="text-sm text-[#6b7280]">Bovaros kö</div>
            <div className="mt-1 text-2xl font-semibold text-[#111827]">
              {bovaroQueue?.membership_status === 'active' ? `${bovaroQueue.current_points} poäng` : 'Ej aktiv'}
            </div>
            {bovaroQueue?.joined_queue_at ? (
              <div className="mt-1 text-xs text-[#6b7280]">Sedan {formatDate(bovaroQueue.joined_queue_at)}</div>
            ) : null}
          </div>
          <div className="rounded-2xl bg-[#f7f8fc] p-4">
            <div className="text-sm text-[#6b7280]">Externa köer</div>
            <div className="mt-1 text-2xl font-semibold text-[#111827]">{(memberships ?? []).length}</div>
          </div>
          <div className="rounded-2xl bg-[#f7f8fc] p-4">
            <div className="text-sm text-[#6b7280]">Kommande förnyelser</div>
            <div className="mt-1 text-2xl font-semibold text-[#111827]">
              {(memberships ?? []).filter((membership) => membership.renewal_date).length}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Lägg till kö</h2>
        <form action={addExternalQueueAction} className="mt-5 grid gap-3 md:grid-cols-2">
          <Select name="providerId" defaultValue="">
            <option value="">Egen kö (ange namn nedan)…</option>
            {(providers ?? []).map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}{provider.annual_fee_sek ? ` (${provider.annual_fee_sek} kr/år)` : ''}
              </option>
            ))}
          </Select>
          <Input name="customName" placeholder="Eget könamn (om inte i listan)" />
          <Input name="city" placeholder="Stad" />
          <Input name="loginUrl" placeholder="Länk till min sida (valfritt)" />
          <Input name="joinedDate" type="date" placeholder="Registrerad sedan" />
          <Input name="renewalDate" type="date" placeholder="Nästa förnyelse" />
          <Input name="currentPoints" type="number" min={0} placeholder="Köpoäng (om kön använder poäng)" />
          <Input name="currentDays" type="number" min={0} placeholder="Ködagar (om kön räknar dagar)" />
          <Input name="note" placeholder="Anteckning" className="md:col-span-2" />
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit">Lägg till</Button>
          </div>
        </form>
      </Card>

      {(memberships ?? []).length === 0 ? (
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-semibold text-[#111827]">Inga externa köer ännu</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#6b7280]">
            Lägg till dina köer ovan så påminner vi dig två veckor innan förnyelser och avgifter.
          </p>
        </Card>
      ) : (
        (memberships ?? []).map((membership) => (
          <Card key={membership.id} className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-[#111827]">
                  {providerName(membership.provider_id, membership.custom_provider_name)}
                </h2>
                <p className="mt-1 text-sm text-[#6b7280]">
                  {membership.city ?? ''}
                  {membership.joined_date ? ` · Medlem sedan ${formatDate(membership.joined_date)}` : ''}
                  {membership.last_updated_date ? ` · Uppdaterad ${formatDate(membership.last_updated_date)}` : ''}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                  {membership.current_points !== null ? (
                    <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-[#4338ca]">{membership.current_points} poäng</span>
                  ) : null}
                  {membership.current_days !== null ? (
                    <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-[#4338ca]">{membership.current_days} ködagar</span>
                  ) : null}
                  {membership.renewal_date ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#fef3c7] px-3 py-1 text-[#92400e]">
                      <CalendarClock size={12} />
                      Förnyas {formatDate(membership.renewal_date)}
                    </span>
                  ) : null}
                </div>
                {membership.note ? <p className="mt-3 text-sm text-[#6b7280]">{membership.note}</p> : null}
                {membership.login_url ? (
                  <a
                    href={membership.login_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#5b3df5]"
                  >
                    <ExternalLink size={14} />
                    Öppna köns webbplats
                  </a>
                ) : null}
              </div>
              <form action={removeExternalQueueAction}>
                <input type="hidden" name="membershipId" value={membership.id} />
                <Button type="submit" variant="ghost" className="h-9 border border-[#fecaca] px-3 text-xs !text-[#b91c1c]">
                  Ta bort
                </Button>
              </form>
            </div>

            <details className="mt-4 rounded-2xl border border-[#e8ebf3] p-4">
              <summary className="cursor-pointer text-sm font-semibold text-[#5b3df5]">Uppdatera uppgifter</summary>
              <form action={updateExternalQueueAction} className="mt-3 grid gap-3 md:grid-cols-4">
                <input type="hidden" name="membershipId" value={membership.id} />
                <Input name="currentPoints" type="number" min={0} defaultValue={membership.current_points ?? undefined} placeholder="Poäng" />
                <Input name="currentDays" type="number" min={0} defaultValue={membership.current_days ?? undefined} placeholder="Ködagar" />
                <Input name="renewalDate" type="date" defaultValue={membership.renewal_date ?? ''} />
                <Input name="note" defaultValue={membership.note ?? ''} placeholder="Anteckning" />
                <div className="md:col-span-4 flex justify-end">
                  <Button type="submit" variant="secondary">Spara</Button>
                </div>
              </form>
            </details>
          </Card>
        ))
      )}

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[#111827]">Kökatalog</h2>
        <p className="mt-1 text-sm text-[#6b7280]">Vanliga svenska bostadsköer med registreringslänkar och avgifter.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(providers ?? []).map((provider) => (
            <div key={provider.id} className="rounded-2xl border border-[#e8ebf3] p-4">
              <div className="font-semibold text-[#111827]">{provider.name}</div>
              <div className="mt-1 text-xs text-[#6b7280]">
                {provider.city}
                {provider.annual_fee_sek ? ` · ${provider.annual_fee_sek} kr/år` : ' · Gratis'}
              </div>
              {provider.renewal_rule ? <p className="mt-2 text-xs text-[#6b7280]">{provider.renewal_rule}</p> : null}
              {provider.signup_url ? (
                <a href={provider.signup_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#5b3df5]">
                  <ExternalLink size={12} />
                  Till kön
                </a>
              ) : null}
            </div>
          ))}
        </div>
      </Card>
    </DashboardShell>
  )
}
