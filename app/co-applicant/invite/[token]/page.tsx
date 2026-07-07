import { notFound, redirect } from 'next/navigation'
import { UsersRound } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { respondToCoApplicantInviteAction } from './actions'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ token: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function CoApplicantInvitePage({ params, searchParams }: Props) {
  const [{ token }, sp] = await Promise.all([params, searchParams])

  if (!UUID_PATTERN.test(token)) notFound()

  const supabase = await createSupabaseServerClient()
  if (!supabase) redirect('/')

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/co-applicant/invite/${token}`)}`)
  }

  const { data: invites, error } = await supabase.rpc('get_co_applicant_invite', { p_token: token })
  const invite = invites?.[0] ?? null
  const responded = typeof sp.done === 'string'

  return (
    <section className="container-shell py-16">
      <div className="mx-auto max-w-xl">
        <Card className="p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#5b3df5]">
            <UsersRound size={24} />
          </div>

          {responded ? (
            <>
              <h1 className="mt-5 text-2xl font-semibold text-[#111827]">Tack för ditt svar</h1>
              <p className="mt-3 text-sm leading-7 text-[#6b7280]">
                Ditt svar har registrerats. Du kan stänga den här sidan eller gå till din översikt.
              </p>
              <div className="mt-6">
                <Button href="/dashboard">Till min översikt</Button>
              </div>
            </>
          ) : !invite || error ? (
            <>
              <h1 className="mt-5 text-2xl font-semibold text-[#111827]">Inbjudan hittades inte</h1>
              <p className="mt-3 text-sm leading-7 text-[#6b7280]">
                Länken är ogiltig, redan besvarad eller har återkallats. Be personen som bjöd in dig att skicka en ny
                inbjudan.
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-5 text-2xl font-semibold text-[#111827]">Inbjudan som medsökande</h1>
              <p className="mt-3 text-sm leading-7 text-[#6b7280]">
                <span className="font-semibold text-[#111827]">{invite.inviter_name || 'En användare'}</span> har lagt
                till dig ({invite.full_name}) som medsökande i sina bostadsansökningar på Bovaro.
              </p>
              <div className="mt-4 rounded-2xl bg-[#f7f8fc] p-4 text-sm leading-6 text-[#374151]">
                Genom att acceptera samtycker du till att ditt namn och dina kontaktuppgifter inkluderas i personens
                bostadsansökningar och delas med berörda hyresvärdar. Du kan när som helst be huvudsökanden att ta bort
                dig.
              </div>
              <form action={respondToCoApplicantInviteAction} className="mt-6 flex flex-wrap gap-3">
                <input type="hidden" name="token" value={token} />
                <Button type="submit" name="decision" value="accept">
                  Acceptera och samtyck
                </Button>
                <Button
                  type="submit"
                  name="decision"
                  value="decline"
                  variant="ghost"
                  className="border border-black/10"
                >
                  Tacka nej
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </section>
  )
}
