import { AdminShell } from '@/components/admin/AdminShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { createAdminInviteAction, updateUserRoleAction } from '@/app/admin/actions'
import { getAdminUsers, requireAdminUser } from '@/lib/data/admin'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

function getString(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key]
  return typeof value === 'string' ? value : undefined
}

const roleOptions = ['seeker', 'buyer', 'landlord', 'broker', 'company_admin', 'admin', 'super_admin']

export default async function AdminUsersPage({ searchParams }: Props) {
  const params = await searchParams
  const { role: adminRole } = await requireAdminUser()
  const q = getString(params, 'q')
  const accountType = getString(params, 'accountType') ?? 'all'
  const role = getString(params, 'role') ?? 'all'
  const users = await getAdminUsers({ q, accountType, role })

  return (
    <AdminShell activePath="/admin/users" title="Användare" description="Sök, filtrera och hantera användare. Endast superadmin kan ändra roller.">
      <Card className="p-6">
        <form className="grid gap-4 md:grid-cols-[1fr_190px_190px_auto]">
          <Input name="q" defaultValue={q ?? ''} placeholder="Sök namn, e-post, telefon eller stad" className="h-12 rounded-2xl border-[#d7dbe7]" />
          <Select name="accountType" defaultValue={accountType} className="h-12 rounded-2xl border-[#d7dbe7]">
            <option value="all">Alla kontotyper</option>
            <option value="private">Privatperson</option>
            <option value="company">Företag</option>
          </Select>
          <Select name="role" defaultValue={role} className="h-12 rounded-2xl border-[#d7dbe7]">
            <option value="all">Alla roller</option>
            {roleOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </Select>
          <Button className="h-12">Filtrera</Button>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Bjud in användare</h2>
        <p className="mt-2 text-sm leading-6 text-[#6b7280]">
          Detta skapar en admin-invite i systemet. Själva auth-kontot skapas via registreringsflödet eller senare via Supabase service-role/invite.
        </p>
        <form action={createAdminInviteAction} className="mt-5 grid gap-4 md:grid-cols-[1fr_170px_180px_1fr_auto]">
          <Input name="email" type="email" placeholder="email@bolag.se" className="h-12 rounded-2xl border-[#d7dbe7]" />
          <Select name="accountType" defaultValue="private" className="h-12 rounded-2xl border-[#d7dbe7]">
            <option value="private">Privat</option>
            <option value="company">Företag</option>
          </Select>
          <Select name="role" defaultValue="seeker" className="h-12 rounded-2xl border-[#d7dbe7]">
            {roleOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </Select>
          <Input name="note" placeholder="Intern notering" className="h-12 rounded-2xl border-[#d7dbe7]" />
          <Button className="h-12">Skapa invite</Button>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-[#e8ebf3] p-6">
          <h2 className="text-xl font-semibold text-[#111827]">{users.length} användare</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-[#f7f8fc] text-xs uppercase tracking-[0.12em] text-[#6b7280]">
              <tr><th className="px-5 py-3">Användare</th><th className="px-5 py-3">Kontotyp</th><th className="px-5 py-3">Roll</th><th className="px-5 py-3">Telefon/stad</th><th className="px-5 py-3">Skapad</th><th className="px-5 py-3">Rollhantering</th></tr>
            </thead>
            <tbody className="divide-y divide-[#e8ebf3]">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-5 py-4"><div className="font-semibold text-[#111827]">{[user.firstName, user.lastName].filter(Boolean).join(' ') || 'Namnlös'}</div><div className="text-xs text-[#6b7280]">{user.email ?? 'E-post dold'} · {user.id.slice(0, 8)}</div></td>
                  <td className="px-5 py-4"><span className="rounded-full bg-[#f3f4f6] px-3 py-1 text-xs font-semibold text-[#4b5563]">{user.accountType}</span></td>
                  <td className="px-5 py-4"><span className="rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#243b8f]">{user.role}</span></td>
                  <td className="px-5 py-4 text-[#6b7280]">{user.phone ?? 'Telefon saknas'}<div className="text-xs">{user.city ?? 'Stad saknas'}</div></td>
                  <td className="px-5 py-4 text-[#6b7280]">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('sv-SE') : '-'}</td>
                  <td className="px-5 py-4">
                    {adminRole === 'super_admin' ? (
                      <form action={updateUserRoleAction} className="flex gap-2">
                        <input type="hidden" name="userId" value={user.id} />
                        <Select name="role" defaultValue={user.role} className="h-10 rounded-xl border-[#d7dbe7] text-xs">
                          {roleOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                        </Select>
                        <Button className="h-10 rounded-xl px-3 text-xs">Spara</Button>
                      </form>
                    ) : (
                      <span className="text-xs text-[#6b7280]">Endast superadmin</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminShell>
  )
}
