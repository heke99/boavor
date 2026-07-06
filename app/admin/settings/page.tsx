import { AdminShell } from '@/components/admin/AdminShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { requireAdminUser } from '@/lib/data/admin'
import { updatePlatformSettingAction } from './actions'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const errorMessages: Record<string, string> = {
  super_admin_required: 'Endast superadmin kan ändra plattformsinställningar.',
  invalid_json: 'Värdet måste vara giltig JSON, t.ex. {"enabled": false}.',
  failed: 'Inställningen kunde inte sparas. Försök igen.',
}

export default async function AdminSettingsPage({ searchParams }: Props) {
  const params = await searchParams
  const errorKey = typeof params.error === 'string' ? params.error : null
  const saved = params.saved === '1'
  const { supabase, role } = await requireAdminUser()
  const isSuperAdmin = role === 'super_admin'

  const { data: settings } = await supabase
    .from('platform_settings')
    .select('key, value, description, is_public, updated_at')
    .order('key', { ascending: true })

  return (
    <AdminShell
      activePath="/admin/settings"
      title="Plattformsinställningar"
      description="Nyckel/värde-konfiguration för plattformen. Endast superadmin kan ändra värden; alla ändringar granskningsloggas."
    >
      {errorKey && errorMessages[errorKey] ? (
        <Card className="border border-[#fecaca] bg-[#fef2f2] p-5 text-sm font-semibold text-[#b91c1c]">
          {errorMessages[errorKey]}
        </Card>
      ) : null}
      {saved ? (
        <Card className="border border-[#a7f3d0] bg-[#ecfdf5] p-5 text-sm font-semibold text-[#047857]">
          Inställningen har sparats.
        </Card>
      ) : null}

      <div className="space-y-4">
        {(settings ?? []).map((setting) => (
          <Card key={setting.key} className="p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-mono text-base font-semibold text-[#111827]">{setting.key}</h2>
              <span
                className={
                  setting.is_public
                    ? 'rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-semibold text-[#1d4ed8]'
                    : 'rounded-full bg-[#f3f4f6] px-3 py-1 text-xs font-semibold text-[#4b5563]'
                }
              >
                {setting.is_public ? 'Publik' : 'Intern'}
              </span>
              <span className="text-xs text-[#6b7280]">
                Uppdaterad {new Date(setting.updated_at).toLocaleString('sv-SE')}
              </span>
            </div>
            {setting.description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6b7280]">{setting.description}</p> : null}

            {isSuperAdmin ? (
              <form action={updatePlatformSettingAction} className="mt-4 flex flex-wrap items-end gap-3">
                <input type="hidden" name="key" value={setting.key} />
                <label className="block min-w-[320px] flex-1">
                  <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Värde (JSON)</span>
                  <textarea
                    name="value"
                    rows={2}
                    defaultValue={JSON.stringify(setting.value)}
                    className="w-full rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 font-mono text-sm text-[#111827] outline-none transition focus:border-[#5b3df5]"
                  />
                </label>
                <Button type="submit" className="h-12">Spara</Button>
              </form>
            ) : (
              <pre className="mt-4 overflow-x-auto rounded-2xl bg-[#f7f8fc] p-4 font-mono text-sm text-[#374151]">
                {JSON.stringify(setting.value, null, 2)}
              </pre>
            )}
          </Card>
        ))}
        {!settings?.length ? (
          <Card className="p-6">
            <p className="text-sm text-[#6b7280]">Inga inställningar hittades.</p>
          </Card>
        ) : null}
      </div>
    </AdminShell>
  )
}
