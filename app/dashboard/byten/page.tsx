import Link from 'next/link'
import { ArrowLeftRight, MessageSquare } from 'lucide-react'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { getAuthContext } from '@/lib/auth/permissions'
import { requireVerifiedAdult } from '@/lib/data/identity'
import {
  EXCHANGE_MATCH_NEXT_STATUS,
  EXCHANGE_MATCH_STATUS_LABELS,
  getExchangeCandidates,
  getOwnExchangeProfile,
} from '@/lib/data/byta'
import { registerExchangeInterestAction, removeExchangeProfileAction, updateExchangeMatchStatusAction } from '@/app/byta/actions'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function DashboardBytenPage({ searchParams }: Props) {
  const params = await searchParams
  const { supabase, user } = await getAuthContext({ loginRedirect: '/login?next=/dashboard/byten' })
  const identity = await requireVerifiedAdult(user.id)

  const ownProfile = identity.verified ? await getOwnExchangeProfile(supabase, user.id) : null
  const candidates = ownProfile && ownProfile.status === 'active' ? await getExchangeCandidates(supabase, ownProfile) : []

  const { data: matches } = ownProfile
    ? await supabase
        .from('exchange_matches')
        .select('id, profile_a, profile_b, thread_id, status, created_at')
        .or(`profile_a.eq.${ownProfile.id},profile_b.eq.${ownProfile.id}`)
        .order('created_at', { ascending: false })
    : { data: [] }

  const { data: incomingInterests } = ownProfile
    ? await supabase
        .from('exchange_interests')
        .select('id, from_profile_id, status, created_at')
        .eq('to_profile_id', ownProfile.id)
        .eq('status', 'interested')
    : { data: [] }

  const statusMessage =
    typeof params.byta === 'string'
      ? params.byta === 'match'
        ? 'Ömsesidigt intresse! En meddelandetråd har öppnats — ni hittar den under Meddelanden.'
        : params.byta === 'registered'
          ? 'Ditt intresse är registrerat. Om motparten också anmäler intresse öppnas kontakten.'
          : params.byta === 'rate_limited'
            ? 'Du har anmält många intressen på kort tid. Vänta en stund.'
            : null
      : typeof params.saved === 'string'
        ? 'Din bytesannons är sparad.'
        : null

  return (
    <DashboardShell
      activePath="/dashboard/byten"
      title="Mina byten"
      description="Din bytesannons, dina matchningar och intresseanmälningar."
    >
      {statusMessage ? (
        <div className="rounded-2xl bg-[#ecfdf3] p-4 text-sm font-semibold text-[#166534]">{statusMessage}</div>
      ) : null}

      {!identity.verified ? (
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-semibold text-[#111827]">Verifiera din identitet</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#6b7280]">
            Bovaro Byta kräver verifierade användare för allas trygghet.
          </p>
          <div className="mt-5">
            <Button href="/dashboard/identity">Verifiera identitet</Button>
          </div>
        </Card>
      ) : !ownProfile || ownProfile.status === 'removed' ? (
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-semibold text-[#111827]">Ingen bytesannons ännu</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#6b7280]">
            Skapa en bytesannons för din nuvarande förstahandsbostad så matchar vi den mot andras önskemål.
          </p>
          <div className="mt-5">
            <Button href="/byta/skapa">Skapa bytesannons</Button>
          </div>
        </Card>
      ) : (
        <>
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-[#111827]">
                  {ownProfile.current_rooms} rum i {ownProfile.current_city}
                </h2>
                <p className="mt-1 text-sm text-[#6b7280]">
                  {ownProfile.current_rent.toLocaleString('sv-SE')} kr/mån · Status:{' '}
                  {ownProfile.status === 'active' ? 'Aktiv' : ownProfile.status === 'paused' ? 'Pausad' : ownProfile.status}
                  {' · '}{incomingInterests?.length ?? 0} inkommande intressen
                </p>
              </div>
              <div className="flex gap-2">
                <Button href="/byta/skapa" variant="secondary">Redigera</Button>
                <form action={removeExchangeProfileAction}>
                  <Button type="submit" variant="ghost" className="border border-[#fecaca] !text-[#b91c1c]">Ta bort annons</Button>
                </form>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-[#111827]">Matchningar ({(matches ?? []).length})</h2>
            {(matches ?? []).length === 0 ? (
              <p className="mt-4 rounded-2xl bg-[#f7f8fc] p-4 text-sm text-[#6b7280]">
                Inga ömsesidiga matchningar ännu. Anmäl intresse på kandidater nedan.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {(matches ?? []).map((match) => {
                  const nextStatuses = EXCHANGE_MATCH_NEXT_STATUS[match.status] ?? []
                  return (
                    <div key={match.id} className="rounded-2xl border border-[#e8ebf3] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <span className="rounded-full bg-[#dcfce7] px-3 py-1 text-xs font-semibold text-[#166534]">
                            {EXCHANGE_MATCH_STATUS_LABELS[match.status] ?? match.status}
                          </span>
                          <span className="ml-3 text-xs text-[#6b7280]">
                            Matchade {new Date(match.created_at).toLocaleDateString('sv-SE')}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {match.thread_id ? (
                            <Link
                              href={`/dashboard/messages?thread=${match.thread_id}`}
                              className="inline-flex items-center gap-1 text-sm font-semibold text-[#5b3df5]"
                            >
                              <MessageSquare size={15} />
                              Öppna konversation
                            </Link>
                          ) : null}
                          {nextStatuses.length > 0 ? (
                            <form action={updateExchangeMatchStatusAction} className="flex gap-2">
                              <input type="hidden" name="matchId" value={match.id} />
                              <Select name="status" defaultValue={nextStatuses[0]} className="h-9 text-xs">
                                {nextStatuses.map((status) => (
                                  <option key={status} value={status}>{EXCHANGE_MATCH_STATUS_LABELS[status] ?? status}</option>
                                ))}
                              </Select>
                              <Button type="submit" variant="secondary" className="h-9 px-3 text-xs">Uppdatera</Button>
                            </form>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-[#111827]">Möjliga byten ({candidates.length})</h2>
            <p className="mt-1 text-sm text-[#6b7280]">
              Annonser där bostäderna matchar varandras önskemål åt båda hållen.
            </p>
            {candidates.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-[#f7f8fc] p-4 text-sm text-[#6b7280]">
                Inga matchande annonser just nu. Vi visar nya kandidater här så fort de dyker upp.
              </p>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {candidates.map((candidate) => (
                  <div key={candidate.id} className="rounded-2xl border border-[#e8ebf3] p-4">
                    <div className="font-semibold text-[#111827]">
                      {candidate.current_rooms} rum i {candidate.current_area ? `${candidate.current_area}, ` : ''}{candidate.current_city}
                    </div>
                    <div className="mt-1 text-sm text-[#6b7280]">
                      {candidate.current_rent.toLocaleString('sv-SE')} kr/mån
                      {candidate.current_area_sqm ? ` · ${candidate.current_area_sqm} m²` : ''}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Link href={`/byta/${candidate.id}`} className="text-sm font-semibold text-[#5b3df5]">Visa annons</Link>
                      <form action={registerExchangeInterestAction}>
                        <input type="hidden" name="profileId" value={candidate.id} />
                        <input type="hidden" name="interested" value="true" />
                        <input type="hidden" name="backTo" value="/dashboard/byten" />
                        <button type="submit" className="inline-flex items-center gap-1 text-sm font-semibold text-[#166534]">
                          <ArrowLeftRight size={14} />
                          Anmäl intresse
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </DashboardShell>
  )
}
