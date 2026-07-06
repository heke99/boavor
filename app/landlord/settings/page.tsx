import { LandlordShell } from '@/components/landlord/LandlordShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { requireLandlordAccess } from '@/lib/data/landlord'
import { LANDLORD_MESSAGE_TEMPLATES } from '@/lib/landlord/message-templates'
import {
  inviteTeamMemberAction,
  removeTeamMemberAction,
  revokeTeamInviteAction,
  updateTeamRoleAction,
} from './actions'

export const dynamic = 'force-dynamic'

const TEAM_ROLE_LABELS: Record<string, string> = {
  owner: 'Ägare',
  admin: 'Administratör',
  leasing_agent: 'Uthyrare',
  viewer: 'Läsbehörighet',
  billing: 'Fakturering',
}

export default async function LandlordSettingsPage() {
  const context = await requireLandlordAccess()
  const { supabase, user, companyIds } = context

  const { data: companies } = companyIds.length
    ? await supabase.from('companies').select('id, name').in('id', companyIds)
    : { data: [] }

  const { data: members } = companyIds.length
    ? await supabase
        .from('company_members')
        .select('id, company_id, user_id, team_role, title, created_at')
        .in('company_id', companyIds)
        .order('created_at', { ascending: true })
    : { data: [] }

  const { data: invites } = companyIds.length
    ? await supabase
        .from('company_member_invites')
        .select('id, company_id, email, team_role, status, invite_token, created_at')
        .in('company_id', companyIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
    : { data: [] }

  const companyName = (companyId: string) => (companies ?? []).find((company) => company.id === companyId)?.name ?? companyId

  return (
    <LandlordShell
      activePath="/landlord/settings"
      title="Inställningar"
      description="Team, roller och standardmallar. Företagsprofil och verifiering hanteras under Onboarding."
    >
      <div className="flex flex-wrap gap-3">
        <Button href="/landlord/onboarding" variant="secondary">Företagsprofil och verifiering</Button>
        <Button href="/dashboard/policies" variant="secondary">Uthyrningspolicyer</Button>
      </div>

      {companyIds.length === 0 ? (
        <Card className="p-8">
          <h2 className="text-2xl font-semibold text-[#111827]">Team kräver företagskonto</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6b7280]">
            Du använder Bovaro som privat hyresvärd. Teamfunktioner (flera användare, roller och inbjudningar) är
            tillgängliga för företagskonton.
          </p>
        </Card>
      ) : (
        <>
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-[#111827]">Bjud in teammedlem</h2>
            <p className="mt-1 text-sm text-[#6b7280]">
              En inbjudningslänk skapas som du delar med kollegan. Länken kräver ett Bovaro-konto.
            </p>
            <form action={inviteTeamMemberAction} className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_180px_auto]">
              <Select name="companyId" defaultValue={companyIds[0]}>
                {(companies ?? []).map((company) => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </Select>
              <Input name="email" type="email" placeholder="kollega@bolag.se" required />
              <Select name="teamRole" defaultValue="leasing_agent">
                {Object.entries(TEAM_ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
              <Button type="submit">Skapa inbjudan</Button>
            </form>

            {(invites ?? []).length > 0 ? (
              <div className="mt-5 space-y-3">
                {(invites ?? []).map((invite) => (
                  <div key={invite.id} className="rounded-2xl border border-[#e8ebf3] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-[#111827]">{invite.email}</div>
                        <div className="mt-1 text-xs text-[#6b7280]">
                          {companyName(invite.company_id)} · {TEAM_ROLE_LABELS[invite.team_role] ?? invite.team_role}
                        </div>
                      </div>
                      <form action={revokeTeamInviteAction}>
                        <input type="hidden" name="inviteId" value={invite.id} />
                        <Button type="submit" variant="ghost" className="h-9 border border-[#fecaca] px-3 text-xs !text-[#b91c1c]">
                          Återkalla
                        </Button>
                      </form>
                    </div>
                    <div className="mt-3 rounded-2xl bg-[#f7f8fc] p-3 text-xs text-[#6b7280]">
                      Dela länken:
                      <span className="ml-2 select-all break-all font-mono text-[11px] text-[#111827]">
                        {`/landlord/invite/${invite.invite_token}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-[#111827]">Team</h2>
            <div className="mt-5 space-y-3">
              {(members ?? []).map((member) => (
                <div key={member.id} className="flex flex-col gap-3 rounded-2xl border border-[#e8ebf3] p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-mono text-xs text-[#6b7280]">{member.user_id === user.id ? 'Du' : `${member.user_id.slice(0, 8)}…`}</div>
                    <div className="mt-1 text-sm font-semibold text-[#111827]">
                      {companyName(member.company_id)} · {TEAM_ROLE_LABELS[member.team_role] ?? member.team_role}
                    </div>
                  </div>
                  {member.user_id !== user.id ? (
                    <div className="flex flex-wrap gap-2">
                      <form action={updateTeamRoleAction} className="flex gap-2">
                        <input type="hidden" name="memberId" value={member.id} />
                        <Select name="teamRole" defaultValue={member.team_role} className="h-10 text-sm">
                          {Object.entries(TEAM_ROLE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </Select>
                        <Button type="submit" variant="secondary" className="h-10 px-3 text-xs">Byt roll</Button>
                      </form>
                      <form action={removeTeamMemberAction}>
                        <input type="hidden" name="memberId" value={member.id} />
                        <Button type="submit" variant="ghost" className="h-10 border border-[#fecaca] px-3 text-xs !text-[#b91c1c]">
                          Ta bort
                        </Button>
                      </form>
                    </div>
                  ) : (
                    <span className="rounded-full bg-[#f7f8fc] px-3 py-1 text-xs font-semibold text-[#6b7280]">Din egen roll ändras av en annan ägare</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Standardmallar</h2>
        <p className="mt-1 text-sm text-[#6b7280]">
          Mallar för vanliga meddelanden. Kopiera och anpassa vid behov — meddelandefunktionen i plattformen använder
          dem som förslag.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {LANDLORD_MESSAGE_TEMPLATES.map((template) => (
            <div key={template.id} className="rounded-2xl border border-[#e8ebf3] p-4">
              <div className="text-sm font-semibold text-[#111827]">{template.label}</div>
              <div className="mt-1 text-xs font-semibold text-[#6b7280]">Ämne: {template.subject}</div>
              <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-[#f7f8fc] p-3 font-sans text-xs leading-6 text-[#374151]">{template.body}</pre>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-[#111827]">API och webhooks</h2>
          <p className="mt-1 text-sm text-[#6b7280]">
            Integrera Bovaro med era egna system: API-nycklar med behörigheter och signerade webhooks vid nya ansökningar.
          </p>
          <Button href="/landlord/settings/api" variant="ghost" className="mt-4 border border-[#d7dbe7] !text-[#111827]">
            Hantera API-nycklar och webhooks
          </Button>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold text-[#111827]">Hyresgästportal (white label)</h2>
          <p className="mt-1 text-sm text-[#6b7280]">
            En publik portal med er logotyp, färg och era publicerade objekt — på /p/ert-namn eller egen domän.
          </p>
          <Button href="/landlord/settings/portal" variant="ghost" className="mt-4 border border-[#d7dbe7] !text-[#111827]">
            Hantera portalen
          </Button>
        </Card>
      </div>
    </LandlordShell>
  )
}
