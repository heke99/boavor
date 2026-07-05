import { redirect } from 'next/navigation'
import { Building2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { acceptCompanyInviteAction } from './actions'

export const dynamic = 'force-dynamic'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const TEAM_ROLE_LABELS: Record<string, string> = {
  owner: 'Ägare',
  admin: 'Administratör',
  leasing_agent: 'Uthyrare',
  viewer: 'Läsbehörighet',
  billing: 'Fakturering',
}

type Props = {
  params: Promise<{ token: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CompanyInvitePage({ params, searchParams }: Props) {
  const [{ token }, sp] = await Promise.all([params, searchParams])
  if (!UUID_PATTERN.test(token)) redirect('/')

  const supabase = await createSupabaseServerClient()
  if (!supabase) redirect('/')

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/landlord/invite/${token}`)}`)
  }

  const { data: invites } = await supabase.rpc('get_company_invite', { p_token: token })
  const invite = invites?.[0] ?? null
  const done = typeof sp.done === 'string'

  return (
    <section className="container-shell py-16">
      <div className="mx-auto max-w-xl">
        <Card className="p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eff6ff] text-[#1d4ed8]">
            <Building2 size={24} />
          </div>

          {done ? (
            <>
              <h1 className="mt-5 text-2xl font-semibold text-[#111827]">Välkommen till teamet!</h1>
              <p className="mt-3 text-sm leading-7 text-[#6b7280]">Du har nu tillgång till hyresvärdsarbetsytan.</p>
              <div className="mt-6">
                <Button href="/landlord">Till arbetsytan</Button>
              </div>
            </>
          ) : !invite ? (
            <>
              <h1 className="mt-5 text-2xl font-semibold text-[#111827]">Inbjudan hittades inte</h1>
              <p className="mt-3 text-sm leading-7 text-[#6b7280]">
                Länken är ogiltig, redan använd eller återkallad. Be den som bjöd in dig att skapa en ny inbjudan.
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-5 text-2xl font-semibold text-[#111827]">Inbjudan till {invite.company_name}</h1>
              <p className="mt-3 text-sm leading-7 text-[#6b7280]">
                Du har bjudits in som{' '}
                <span className="font-semibold text-[#111827]">{TEAM_ROLE_LABELS[invite.team_role] ?? invite.team_role}</span>{' '}
                i {invite.company_name} på Bovaro.
              </p>
              <form action={acceptCompanyInviteAction} className="mt-6">
                <input type="hidden" name="token" value={token} />
                <Button type="submit">Acceptera inbjudan</Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </section>
  )
}
