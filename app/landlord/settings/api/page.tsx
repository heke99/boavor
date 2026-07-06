import { LandlordShell } from '@/components/landlord/LandlordShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { requireLandlordAccess } from '@/lib/data/landlord'
import {
  createApiKeyAction,
  createWebhookEndpointAction,
  deleteWebhookEndpointAction,
  revokeApiKeyAction,
  toggleWebhookEndpointAction,
} from './actions'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const errorMessages: Record<string, string> = {
  name_required: 'Ge nyckeln ett namn.',
  scopes_required: 'Välj minst en behörighet.',
  url_invalid: 'Webhook-adressen måste börja med https://.',
  events_required: 'Välj minst en händelse.',
  failed: 'Åtgärden misslyckades. Försök igen.',
}

const inputClass =
  'w-full rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#5b3df5]'

function formatDateTime(value: string | null) {
  if (!value) return '–'
  return new Date(value).toLocaleString('sv-SE')
}

export default async function LandlordApiPage({ searchParams }: Props) {
  const params = await searchParams
  const errorKey = typeof params.error === 'string' ? params.error : null
  const createdSecret = typeof params.created === 'string' ? params.created : null
  const webhookSecret = typeof params.secret === 'string' ? params.secret : null
  const { supabase } = await requireLandlordAccess()

  const [{ data: keys }, { data: endpoints }, { data: deliveries }] = await Promise.all([
    supabase
      .from('api_keys')
      .select('id, name, key_prefix, scopes, is_active, created_at, last_used_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('webhook_endpoints')
      .select('id, url, events, is_active, created_at, last_success_at, last_failure_at, failure_count')
      .order('created_at', { ascending: false }),
    supabase
      .from('webhook_deliveries')
      .select('id, endpoint_id, event_type, status, attempts, response_status, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  return (
    <LandlordShell
      activePath="/landlord/settings"
      title="API och webhooks"
      description="Integrera Bovaro med dina egna system: läs annonser och ansökningar via API:t och ta emot signerade webhooks i realtid. Dokumentation finns i docs/api/public_api.md."
    >
      {errorKey && errorMessages[errorKey] ? (
        <Card className="border border-[#fecaca] bg-[#fef2f2] p-5 text-sm font-semibold text-[#b91c1c]">
          {errorMessages[errorKey]}
        </Card>
      ) : null}
      {createdSecret ? (
        <Card className="border border-[#a7f3d0] bg-[#ecfdf5] p-5">
          <div className="text-sm font-semibold text-[#047857]">Din nya API-nyckel — kopiera den nu, den visas aldrig igen:</div>
          <code className="mt-2 block overflow-x-auto rounded-xl bg-white p-3 font-mono text-sm text-[#111827]">{createdSecret}</code>
        </Card>
      ) : null}
      {webhookSecret ? (
        <Card className="border border-[#a7f3d0] bg-[#ecfdf5] p-5">
          <div className="text-sm font-semibold text-[#047857]">
            Signeringshemlighet för din webhook — kopiera den nu och verifiera Bovaro-Signature-headern med den:
          </div>
          <code className="mt-2 block overflow-x-auto rounded-xl bg-white p-3 font-mono text-sm text-[#111827]">{webhookSecret}</code>
        </Card>
      ) : null}

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">API-nycklar</h2>
        <form action={createApiKeyAction} className="mt-5 grid gap-4 md:grid-cols-[1fr_auto_auto_auto]">
          <input name="name" required maxLength={80} className={inputClass} placeholder="Nyckelns namn (t.ex. Vitec-integration)" />
          <label className="flex items-center gap-2 rounded-2xl border border-[#e8ebf3] px-4 text-sm font-semibold text-[#111827]">
            <input type="checkbox" name="scopes" value="listings:read" defaultChecked /> Annonser (läs)
          </label>
          <label className="flex items-center gap-2 rounded-2xl border border-[#e8ebf3] px-4 text-sm font-semibold text-[#111827]">
            <input type="checkbox" name="scopes" value="applications:read" /> Ansökningar (läs)
          </label>
          <Button type="submit">Skapa nyckel</Button>
        </form>

        {!keys?.length ? (
          <p className="mt-5 text-sm text-[#6b7280]">Inga API-nycklar ännu.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {keys.map((key) => (
              <div key={key.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e8ebf3] p-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[#111827]">{key.name}</span>
                    <code className="rounded bg-[#f3f4f6] px-2 py-0.5 font-mono text-xs text-[#4b5563]">{key.key_prefix}…</code>
                    <span
                      className={
                        key.is_active
                          ? 'rounded-full bg-[#ecfdf5] px-3 py-1 text-xs font-semibold text-[#047857]'
                          : 'rounded-full bg-[#f3f4f6] px-3 py-1 text-xs font-semibold text-[#6b7280]'
                      }
                    >
                      {key.is_active ? 'Aktiv' : 'Återkallad'}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[#6b7280]">
                    {key.scopes.join(', ')} · senast använd {formatDateTime(key.last_used_at)}
                  </div>
                </div>
                {key.is_active ? (
                  <form action={revokeApiKeyAction}>
                    <input type="hidden" name="keyId" value={key.id} />
                    <Button type="submit" variant="ghost" className="h-9 px-3 text-xs !text-[#b91c1c]">Återkalla</Button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Webhooks</h2>
        <p className="mt-2 text-sm leading-6 text-[#6b7280]">
          Varje leverans signeras med HMAC-SHA256 i headern <code className="rounded bg-[#f3f4f6] px-1">Bovaro-Signature</code>.
          Misslyckade leveranser görs om med backoff (1 min → 12 h) i upp till fem försök.
        </p>
        <form action={createWebhookEndpointAction} className="mt-5 grid gap-4 md:grid-cols-[1fr_auto_auto]">
          <input name="url" type="url" required className={inputClass} placeholder="https://ditt-system.se/webhooks/bovaro" />
          <label className="flex items-center gap-2 rounded-2xl border border-[#e8ebf3] px-4 text-sm font-semibold text-[#111827]">
            <input type="checkbox" name="events" value="application.created" defaultChecked /> application.created
          </label>
          <Button type="submit">Lägg till webhook</Button>
        </form>

        {!endpoints?.length ? (
          <p className="mt-5 text-sm text-[#6b7280]">Inga webhooks konfigurerade.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {endpoints.map((endpoint) => (
              <div key={endpoint.id} className="rounded-2xl border border-[#e8ebf3] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="font-mono text-sm text-[#111827]">{endpoint.url}</code>
                      <span
                        className={
                          endpoint.is_active
                            ? 'rounded-full bg-[#ecfdf5] px-3 py-1 text-xs font-semibold text-[#047857]'
                            : 'rounded-full bg-[#f3f4f6] px-3 py-1 text-xs font-semibold text-[#6b7280]'
                        }
                      >
                        {endpoint.is_active ? 'Aktiv' : 'Pausad'}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-[#6b7280]">
                      {endpoint.events.join(', ')} · senast lyckad {formatDateTime(endpoint.last_success_at)}
                      {endpoint.failure_count > 0 ? ` · ${endpoint.failure_count} fel i rad` : ''}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <form action={toggleWebhookEndpointAction}>
                      <input type="hidden" name="endpointId" value={endpoint.id} />
                      <input type="hidden" name="nextActive" value={endpoint.is_active ? 'false' : 'true'} />
                      <Button type="submit" variant="ghost" className="h-9 px-3 text-xs">
                        {endpoint.is_active ? 'Pausa' : 'Aktivera'}
                      </Button>
                    </form>
                    <form action={deleteWebhookEndpointAction}>
                      <input type="hidden" name="endpointId" value={endpoint.id} />
                      <Button type="submit" variant="ghost" className="h-9 px-3 text-xs !text-[#b91c1c]">Ta bort</Button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {deliveries?.length ? (
          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Senaste leveranser</h3>
            <div className="mt-3 overflow-x-auto rounded-2xl border border-[#e8ebf3]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#f7f8fc] text-xs uppercase tracking-[0.12em] text-[#6b7280]">
                  <tr>
                    <th className="px-4 py-2">Händelse</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2 text-right">Försök</th>
                    <th className="px-4 py-2 text-right">HTTP</th>
                    <th className="px-4 py-2">Skapad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8ebf3]">
                  {deliveries.map((delivery) => (
                    <tr key={delivery.id}>
                      <td className="px-4 py-2 font-mono text-xs text-[#111827]">{delivery.event_type}</td>
                      <td className="px-4 py-2">
                        <span
                          className={
                            delivery.status === 'delivered'
                              ? 'rounded-full bg-[#ecfdf5] px-3 py-1 text-xs font-semibold text-[#047857]'
                              : delivery.status === 'dead'
                                ? 'rounded-full bg-[#fee2e2] px-3 py-1 text-xs font-semibold text-[#b91c1c]'
                                : 'rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-semibold text-[#9a5b00]'
                          }
                        >
                          {delivery.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-[#6b7280]">{delivery.attempts}</td>
                      <td className="px-4 py-2 text-right text-[#6b7280]">{delivery.response_status ?? '–'}</td>
                      <td className="px-4 py-2 text-[#6b7280]">{formatDateTime(delivery.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Card>
    </LandlordShell>
  )
}
