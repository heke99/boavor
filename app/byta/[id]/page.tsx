import { notFound, redirect } from 'next/navigation'
import { ArrowLeftRight, Flag, MapPin, ShieldCheck } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireVerifiedAdult } from '@/lib/data/identity'
import { getOwnExchangeProfile, type ExchangeProfileRow } from '@/lib/data/byta'
import { registerExchangeInterestAction, reportExchangeProfileAction } from '../actions'

export const dynamic = 'force-dynamic'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ExchangeProfilePage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  if (!UUID_PATTERN.test(id)) notFound()

  const supabase = await createSupabaseServerClient()
  if (!supabase) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(`/byta/${id}`)}`)

  const identity = await requireVerifiedAdult(user.id)
  if (!identity.verified) {
    redirect('/dashboard/identity?reason=byta')
  }

  // RLS: only active profiles are visible to verified users (or own profile).
  const { data } = await supabase.from('exchange_profiles').select('*').eq('id', id).maybeSingle()
  const profile = data as ExchangeProfileRow | null
  if (!profile) notFound()

  const ownProfile = await getOwnExchangeProfile(supabase, user.id)
  const isOwn = profile.user_id === user.id
  const reported = typeof sp.reported === 'string'

  return (
    <section className="container-shell py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        {reported ? (
          <div className="rounded-2xl bg-[#ecfdf3] p-4 text-sm font-semibold text-[#166534]">
            Tack — din anmälan har skickats till Bovaros moderering.
          </div>
        ) : null}

        <Card className="p-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#5b3df5]">
            <ArrowLeftRight size={16} />
            Bytesannons
          </div>
          <h1 className="mt-3 text-3xl font-semibold text-[#111827]">
            {profile.current_rooms} rum i {profile.current_area ? `${profile.current_area}, ` : ''}{profile.current_city}
          </h1>
          <div className="mt-2 flex items-center gap-2 text-sm text-[#6b7280]">
            <MapPin size={14} />
            {profile.show_exact_address && profile.current_street
              ? `${profile.current_street}, ${profile.current_city}`
              : `${profile.current_area ? `${profile.current_area}, ` : ''}${profile.current_city} · Exakt adress visas vid ömsesidigt intresse`}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#f7f8fc] p-4">
              <div className="text-sm text-[#6b7280]">Hyra</div>
              <div className="mt-1 text-xl font-semibold text-[#111827]">{profile.current_rent.toLocaleString('sv-SE')} kr/mån</div>
            </div>
            <div className="rounded-2xl bg-[#f7f8fc] p-4">
              <div className="text-sm text-[#6b7280]">Yta</div>
              <div className="mt-1 text-xl font-semibold text-[#111827]">{profile.current_area_sqm ? `${profile.current_area_sqm} m²` : '—'}</div>
            </div>
            <div className="rounded-2xl bg-[#f7f8fc] p-4">
              <div className="text-sm text-[#6b7280]">Kontrakt</div>
              <div className="mt-1 text-xl font-semibold text-[#111827]">
                {profile.current_contract_type === 'first_hand' ? 'Förstahand' : profile.current_contract_type === 'student' ? 'Student' : 'Senior'}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            {profile.current_has_balcony ? <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-[#4338ca]">Balkong</span> : null}
            {profile.current_has_elevator ? <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-[#4338ca]">Hiss</span> : null}
            {profile.current_has_accessibility ? <span className="rounded-full bg-[#ecfdf5] px-3 py-1 text-[#047857]">Tillgänglig</span> : null}
            <span className="inline-flex items-center gap-1 rounded-full bg-[#f0fdf4] px-3 py-1 text-[#166534]">
              <ShieldCheck size={12} /> Verifierad användare
            </span>
          </div>

          {profile.description ? (
            <p className="mt-6 text-sm leading-8 text-[#5b6475]">{profile.description}</p>
          ) : null}

          <div className="mt-6 rounded-2xl border border-[#e8ebf3] p-5">
            <h2 className="text-lg font-semibold text-[#111827]">Söker i utbyte</h2>
            <ul className="mt-3 space-y-1 text-sm text-[#5b6475]">
              <li>Städer: {profile.wanted_cities.length ? profile.wanted_cities.join(', ') : 'Alla'}</li>
              {profile.wanted_areas.length ? <li>Områden: {profile.wanted_areas.join(', ')}</li> : null}
              {profile.wanted_min_rooms ? <li>Minst {profile.wanted_min_rooms} rum</li> : null}
              {profile.wanted_max_rent ? <li>Max {profile.wanted_max_rent.toLocaleString('sv-SE')} kr/mån</li> : null}
              {profile.wanted_min_area_sqm ? <li>Minst {profile.wanted_min_area_sqm} m²</li> : null}
              {profile.wanted_needs_accessibility ? <li>Kräver tillgänglighetsanpassning</li> : null}
            </ul>
          </div>

          {!isOwn ? (
            <div className="mt-6 flex flex-wrap gap-3">
              {ownProfile && ownProfile.status === 'active' ? (
                <form action={registerExchangeInterestAction}>
                  <input type="hidden" name="profileId" value={profile.id} />
                  <input type="hidden" name="interested" value="true" />
                  <input type="hidden" name="backTo" value={`/byta/${profile.id}`} />
                  <Button type="submit">
                    <ArrowLeftRight size={16} className="mr-2" />
                    Anmäl bytesintresse
                  </Button>
                </form>
              ) : (
                <Button href="/byta/skapa" variant="secondary">Skapa din bytesannons först</Button>
              )}
            </div>
          ) : (
            <div className="mt-6">
              <Button href="/byta/skapa" variant="secondary">Redigera din annons</Button>
            </div>
          )}
        </Card>

        {!isOwn ? (
          <Card className="p-6">
            <details>
              <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#b91c1c]">
                <Flag size={15} />
                Anmäl annonsen
              </summary>
              <form action={reportExchangeProfileAction} className="mt-4 grid gap-3 md:grid-cols-[220px_1fr_auto]">
                <input type="hidden" name="profileId" value={profile.id} />
                <Select name="reasonType" defaultValue="fake_ad">
                  <option value="fake_ad">Falsk annons</option>
                  <option value="inappropriate">Olämpligt innehåll</option>
                  <option value="fraud">Misstänkt bedrägeri</option>
                  <option value="other">Annat</option>
                </Select>
                <Input name="detail" placeholder="Beskriv kort vad som är fel" />
                <Button type="submit" variant="ghost" className="border border-[#fecaca] !text-[#b91c1c]">Anmäl</Button>
              </form>
            </details>
          </Card>
        ) : null}
      </div>
    </section>
  )
}
