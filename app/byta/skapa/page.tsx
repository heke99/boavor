import { redirect } from 'next/navigation'
import { Fingerprint } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireVerifiedAdult } from '@/lib/data/identity'
import { getOwnExchangeProfile } from '@/lib/data/byta'
import { saveExchangeProfileAction } from '../actions'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function CreateExchangeProfilePage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createSupabaseServerClient()
  if (!supabase) redirect('/byta')

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=${encodeURIComponent('/byta/skapa')}`)

  const identity = await requireVerifiedAdult(user.id)
  const profile = await getOwnExchangeProfile(supabase, user.id)

  const errorCode = typeof params.error === 'string' ? params.error : null
  const errorMessage =
    errorCode === 'validation'
      ? 'Fyll i stad, antal rum och hyra för din nuvarande bostad.'
      : errorCode === 'failed'
        ? 'Bytesannonsen kunde inte sparas. Försök igen.'
        : null

  if (!identity.verified) {
    return (
      <section className="container-shell py-16">
        <div className="mx-auto max-w-xl">
          <Card className="p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#5b3df5]">
              <Fingerprint size={24} />
            </div>
            <h1 className="mt-4 text-2xl font-semibold text-[#111827]">Verifiera din identitet först</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#6b7280]">
              Bovaro Byta kräver verifierade användare för allas trygghet. Verifieringen tar bara en minut.
            </p>
            <div className="mt-6">
              <Button href="/dashboard/identity">Verifiera identitet</Button>
            </div>
          </Card>
        </div>
      </section>
    )
  }

  return (
    <section className="container-shell py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#111827] md:text-4xl">
          {profile ? 'Redigera din bytesannons' : 'Skapa bytesannons'}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6b7280]">
          Beskriv din nuvarande bostad och vad du söker. Ditt namn och din exakta adress döljs tills ni har ett
          ömsesidigt intresse — om du inte aktivt väljer annat.
        </p>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl bg-[#fef2f2] p-4 text-sm font-semibold text-[#b91c1c]">{errorMessage}</div>
        ) : null}

        <form action={saveExchangeProfileAction} className="mt-8 space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-[#111827]">Din nuvarande bostad</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Input name="currentCity" placeholder="Stad *" required defaultValue={profile?.current_city ?? ''} />
              <Input name="currentArea" placeholder="Område" defaultValue={profile?.current_area ?? ''} />
              <Input name="currentStreet" placeholder="Gatuadress (döljs publikt som standard)" defaultValue={profile?.current_street ?? ''} />
              <Input name="currentRooms" type="number" step="0.5" min={1} placeholder="Antal rum *" required defaultValue={profile?.current_rooms ?? undefined} />
              <Input name="currentAreaSqm" type="number" step="0.5" min={0} placeholder="Kvm" defaultValue={profile?.current_area_sqm ?? undefined} />
              <Input name="currentRent" type="number" min={1} placeholder="Hyra kr/mån *" required defaultValue={profile?.current_rent ?? undefined} />
              <Input name="currentLandlordName" placeholder="Hyresvärd" defaultValue={profile?.current_landlord_name ?? ''} />
              <Select name="currentContractType" defaultValue={profile?.current_contract_type ?? 'first_hand'}>
                <option value="first_hand">Förstahandskontrakt</option>
                <option value="student">Studentbostad</option>
                <option value="senior">Seniorbostad</option>
              </Select>
              <Input name="currentFloor" placeholder="Våning" defaultValue={profile?.current_floor ?? ''} />
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="currentHasElevator" defaultChecked={profile?.current_has_elevator} /> Hiss</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="currentHasBalcony" defaultChecked={profile?.current_has_balcony} /> Balkong</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="currentHasAccessibility" defaultChecked={profile?.current_has_accessibility} /> Tillgänglig</label>
              </div>
            </div>
            <textarea
              name="description"
              rows={4}
              defaultValue={profile?.description ?? ''}
              placeholder="Beskriv bostaden — skick, läge, förening/hyresvärd, varför du vill byta."
              className="mt-4 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
            />
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-[#111827]">Vad du söker</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Input name="wantedCities" placeholder="Städer, kommaseparerade (tomt = alla)" defaultValue={(profile?.wanted_cities ?? []).join(', ')} />
              <Input name="wantedAreas" placeholder="Områden, kommaseparerade" defaultValue={(profile?.wanted_areas ?? []).join(', ')} />
              <Input name="wantedMinRooms" type="number" step="0.5" min={0} placeholder="Minst antal rum" defaultValue={profile?.wanted_min_rooms ?? undefined} />
              <Input name="wantedMaxRent" type="number" min={0} placeholder="Max hyra kr/mån" defaultValue={profile?.wanted_max_rent ?? undefined} />
              <Input name="wantedMinAreaSqm" type="number" step="0.5" min={0} placeholder="Minst kvm" defaultValue={profile?.wanted_min_area_sqm ?? undefined} />
              <label className="flex items-center gap-2 rounded-2xl border border-black/10 px-4 py-3 text-sm">
                <input type="checkbox" name="wantedNeedsAccessibility" defaultChecked={profile?.wanted_needs_accessibility} />
                Kräver tillgänglighetsanpassning
              </label>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-[#111827]">Sekretess</h2>
            <div className="mt-4 space-y-3 text-sm">
              <label className="flex items-center gap-3 rounded-2xl border border-black/10 px-4 py-3">
                <input type="checkbox" name="showNameBeforeMatch" defaultChecked={profile?.show_name_before_match} />
                Visa mitt namn redan innan ömsesidigt intresse (standard: dolt)
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-black/10 px-4 py-3">
                <input type="checkbox" name="showExactAddress" defaultChecked={profile?.show_exact_address} />
                Visa exakt adress publikt (standard: endast stad och område)
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-black/10 px-4 py-3">
                <input type="checkbox" name="status" value="paused" defaultChecked={profile?.status === 'paused'} />
                Pausa annonsen (syns inte för andra)
              </label>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button type="submit">{profile ? 'Spara ändringar' : 'Publicera bytesannons'}</Button>
          </div>
        </form>
      </div>
    </section>
  )
}
