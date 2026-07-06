import { AdminShell } from '@/components/admin/AdminShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { requireAdminUser } from '@/lib/data/admin'
import { createCampaignAction, deleteCampaignAction, toggleCampaignAction } from './actions'

export const dynamic = 'force-dynamic'

const placementLabels: Record<string, string> = {
  home: 'Startsidan',
  rent: 'Hyressidan',
  dashboard: 'Sökande-dashboard',
}

function formatDateTime(value: string | null) {
  if (!value) return '–'
  try {
    return new Intl.DateTimeFormat('sv-SE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  } catch {
    return value
  }
}

const inputClass =
  'w-full rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#5b3df5]'

export default async function AdminCampaignsPage() {
  const { supabase } = await requireAdminUser()

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, title, body, cta_label, cta_url, placement, is_active, starts_at, ends_at, created_at')
    .order('created_at', { ascending: false })

  // Captured once per request so the render stays idempotent.
  const renderedAt = new Date().getTime()

  return (
    <AdminShell
      activePath="/admin/campaigns"
      title="Kampanjer"
      description="Skapa och hantera kampanjblock som visas på startsidan, hyressidan eller i sökande-dashboarden."
    >
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Ny kampanj</h2>
        <form action={createCampaignAction} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Titel *</span>
            <input name="title" required maxLength={120} className={inputClass} placeholder="T.ex. Nyheter i bostadskön" />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Text</span>
            <textarea name="body" rows={2} maxLength={400} className={inputClass} placeholder="Kort beskrivning av kampanjen." />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Knapptext</span>
            <input name="ctaLabel" maxLength={60} className={inputClass} placeholder="Läs mer" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Länk (relativ eller https)</span>
            <input name="ctaUrl" maxLength={300} className={inputClass} placeholder="/plus" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Placering</span>
            <select name="placement" className={inputClass} defaultValue="home">
              <option value="home">Startsidan</option>
              <option value="rent">Hyressidan</option>
              <option value="dashboard">Sökande-dashboard</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Startar</span>
              <input name="startsAt" type="datetime-local" className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Slutar</span>
              <input name="endsAt" type="datetime-local" className={inputClass} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
            <input name="isActive" type="checkbox" className="h-4 w-4 rounded border-[#d1d5db]" />
            Aktivera direkt
          </label>
          <div className="md:col-span-2">
            <Button type="submit">Skapa kampanj</Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Alla kampanjer</h2>
        {!campaigns?.length ? (
          <p className="mt-4 text-sm text-[#6b7280]">Inga kampanjer skapade ännu.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {campaigns.map((campaign) => {
              const withinWindow =
                (!campaign.starts_at || new Date(campaign.starts_at).getTime() <= renderedAt) &&
                (!campaign.ends_at || new Date(campaign.ends_at).getTime() >= renderedAt)
              const visible = campaign.is_active && withinWindow
              return (
                <div key={campaign.id} className="rounded-2xl border border-[#e8ebf3] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[#111827]">{campaign.title}</span>
                        <span className="rounded-full bg-[#f3f4f6] px-3 py-1 text-xs font-semibold text-[#4b5563]">
                          {placementLabels[campaign.placement] ?? campaign.placement}
                        </span>
                        <span
                          className={
                            visible
                              ? 'rounded-full bg-[#ecfdf5] px-3 py-1 text-xs font-semibold text-[#047857]'
                              : 'rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-semibold text-[#9a5b00]'
                          }
                        >
                          {visible ? 'Visas nu' : campaign.is_active ? 'Utanför tidsfönster' : 'Inaktiv'}
                        </span>
                      </div>
                      {campaign.body ? <p className="mt-2 max-w-2xl text-sm text-[#6b7280]">{campaign.body}</p> : null}
                      <div className="mt-2 text-xs text-[#6b7280]">
                        {formatDateTime(campaign.starts_at)} → {formatDateTime(campaign.ends_at)}
                        {campaign.cta_url ? <span> · CTA: {campaign.cta_label ?? 'Länk'} ({campaign.cta_url})</span> : null}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <form action={toggleCampaignAction}>
                        <input type="hidden" name="campaignId" value={campaign.id} />
                        <input type="hidden" name="nextActive" value={campaign.is_active ? 'false' : 'true'} />
                        <Button type="submit" variant="ghost" className="px-4 py-2 text-xs">
                          {campaign.is_active ? 'Inaktivera' : 'Aktivera'}
                        </Button>
                      </form>
                      <form action={deleteCampaignAction}>
                        <input type="hidden" name="campaignId" value={campaign.id} />
                        <Button type="submit" variant="ghost" className="px-4 py-2 text-xs !text-[#b91c1c]">
                          Ta bort
                        </Button>
                      </form>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </AdminShell>
  )
}
