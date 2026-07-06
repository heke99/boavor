import { AdminShell } from '@/components/admin/AdminShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { requireAdminUser } from '@/lib/data/admin'
import { getMaintenanceMode } from '@/lib/platform/maintenance'
import {
  createIncidentAction,
  resolveIntegrationFailureAction,
  retryWebhookDeliveryAction,
  setMaintenanceModeAction,
  updateIncidentStatusAction,
} from './actions'

export const dynamic = 'force-dynamic'

const severityStyles: Record<string, string> = {
  minor: 'bg-[#f3f4f6] text-[#4b5563]',
  major: 'bg-[#fff7ed] text-[#9a5b00]',
  critical: 'bg-[#fee2e2] text-[#b91c1c]',
}

const incidentStatusLabels: Record<string, string> = {
  open: 'Pågående',
  monitoring: 'Övervakas',
  resolved: 'Löst',
}

function formatDateTime(value: string | null) {
  if (!value) return '–'
  return new Date(value).toLocaleString('sv-SE')
}

const inputClass =
  'w-full rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#5b3df5]'

export default async function AdminOpsPage() {
  const { supabase, role } = await requireAdminUser()

  const [maintenance, { data: cronRuns }, { data: failures }, { data: deadDeliveries }, { data: incidents }] =
    await Promise.all([
      getMaintenanceMode(),
      supabase
        .from('cron_run_logs')
        .select('id, job_name, status, started_at, finished_at, error, result')
        .order('started_at', { ascending: false })
        .limit(40),
      supabase
        .from('integration_failures')
        .select('id, integration, operation, error, status, created_at')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('webhook_deliveries')
        .select('id, event_type, attempts, last_error, created_at')
        .eq('status', 'dead')
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('incident_reports')
        .select('id, title, description, severity, status, started_at, resolved_at')
        .order('started_at', { ascending: false })
        .limit(30),
    ])

  const failedCronRuns = (cronRuns ?? []).filter((run) => run.status === 'failed')
  const openIncidents = (incidents ?? []).filter((incident) => incident.status !== 'resolved')

  return (
    <AdminShell
      activePath="/admin/ops"
      title="Drift (ops)"
      description="Cron-körningar, integrationsfel, döda webhooks, incidenter och underhållsläge. Runbook: docs/ops/runbook.md."
    >
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <div className="text-sm font-semibold text-[#6b7280]">Misslyckade cron (senaste 40)</div>
          <div className={`mt-2 text-3xl font-semibold ${failedCronRuns.length ? 'text-[#b91c1c]' : 'text-[#111827]'}`}>
            {failedCronRuns.length}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-sm font-semibold text-[#6b7280]">Öppna integrationsfel</div>
          <div className={`mt-2 text-3xl font-semibold ${(failures ?? []).length ? 'text-[#b91c1c]' : 'text-[#111827]'}`}>
            {(failures ?? []).length}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-sm font-semibold text-[#6b7280]">Döda webhooks</div>
          <div className="mt-2 text-3xl font-semibold text-[#111827]">{(deadDeliveries ?? []).length}</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm font-semibold text-[#6b7280]">Öppna incidenter</div>
          <div className={`mt-2 text-3xl font-semibold ${openIncidents.length ? 'text-[#b91c1c]' : 'text-[#111827]'}`}>
            {openIncidents.length}
          </div>
        </Card>
      </div>

      <Card className={maintenance.enabled ? 'border border-[#fde68a] bg-[#fffbeb] p-6' : 'p-6'}>
        <h2 className="text-xl font-semibold text-[#111827]">Underhållsläge</h2>
        <p className="mt-2 text-sm leading-6 text-[#6b7280]">
          {maintenance.enabled
            ? 'PÅ — en banner visas på hela sajten och nya ansökningar blockeras.'
            : 'Av — plattformen fungerar normalt. Endast superadmin kan slå på underhållsläget.'}
        </p>
        {role === 'super_admin' ? (
          <form action={setMaintenanceModeAction} className="mt-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="enabled" value={maintenance.enabled ? 'false' : 'true'} />
            {!maintenance.enabled ? (
              <label className="block min-w-[320px] flex-1">
                <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Meddelande till användarna</span>
                <input
                  name="message"
                  maxLength={200}
                  defaultValue={maintenance.message}
                  className={inputClass}
                  placeholder="T.ex. Planerat underhåll — åter 06:00."
                />
              </label>
            ) : null}
            <Button type="submit" variant={maintenance.enabled ? 'secondary' : 'primary'}>
              {maintenance.enabled ? 'Stäng av underhållsläget' : 'Aktivera underhållsläge'}
            </Button>
          </form>
        ) : null}
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-[#111827]">Integrationsfel (öppna)</h2>
          {!failures?.length ? (
            <p className="mt-4 text-sm text-[#6b7280]">Inga öppna integrationsfel.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {failures.map((failure) => (
                <div key={failure.id} className="rounded-2xl border border-[#e8ebf3] p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="rounded-full bg-[#fee2e2] px-3 py-1 text-xs font-semibold text-[#b91c1c]">
                        {failure.integration}
                      </span>
                      <span className="ml-2 font-mono text-xs text-[#111827]">{failure.operation}</span>
                    </div>
                    <form action={resolveIntegrationFailureAction}>
                      <input type="hidden" name="failureId" value={failure.id} />
                      <Button type="submit" variant="ghost" className="h-8 px-3 text-xs">Markera löst</Button>
                    </form>
                  </div>
                  <p className="mt-2 text-xs text-[#6b7280]">{failure.error.slice(0, 200)}</p>
                  <div className="mt-1 text-xs text-[#9ca3af]">{formatDateTime(failure.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold text-[#111827]">Döda webhook-leveranser</h2>
          {!deadDeliveries?.length ? (
            <p className="mt-4 text-sm text-[#6b7280]">Inga döda leveranser.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {deadDeliveries.map((delivery) => (
                <div key={delivery.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#e8ebf3] p-3 text-sm">
                  <div>
                    <span className="font-mono text-xs text-[#111827]">{delivery.event_type}</span>
                    <div className="mt-1 text-xs text-[#6b7280]">
                      {delivery.attempts} försök · {delivery.last_error?.slice(0, 80) ?? 'okänt fel'} · {formatDateTime(delivery.created_at)}
                    </div>
                  </div>
                  <form action={retryWebhookDeliveryAction}>
                    <input type="hidden" name="deliveryId" value={delivery.id} />
                    <Button type="submit" variant="ghost" className="h-8 px-3 text-xs">Försök igen</Button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Incidenter</h2>
        <form action={createIncidentAction} className="mt-4 grid gap-3 md:grid-cols-[1fr_160px_auto]">
          <input name="title" required maxLength={140} className={inputClass} placeholder="Incidentrubrik" />
          <select name="severity" className={inputClass} defaultValue="minor">
            <option value="minor">Mindre</option>
            <option value="major">Allvarlig</option>
            <option value="critical">Kritisk</option>
          </select>
          <Button type="submit" variant="secondary">Registrera incident</Button>
          <textarea name="description" rows={2} maxLength={2000} className={`${inputClass} md:col-span-3`} placeholder="Beskrivning (valfritt)" />
        </form>

        {!incidents?.length ? (
          <p className="mt-4 text-sm text-[#6b7280]">Inga incidenter registrerade.</p>
        ) : (
          <div className="mt-5 space-y-2">
            {incidents.map((incident) => (
              <div key={incident.id} className="rounded-2xl border border-[#e8ebf3] p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${severityStyles[incident.severity]}`}>
                        {incident.severity === 'critical' ? 'Kritisk' : incident.severity === 'major' ? 'Allvarlig' : 'Mindre'}
                      </span>
                      <span className="font-semibold text-[#111827]">{incident.title}</span>
                      <span className="text-xs text-[#6b7280]">
                        {incidentStatusLabels[incident.status]} · start {formatDateTime(incident.started_at)}
                      </span>
                    </div>
                    {incident.description ? <p className="mt-1 text-xs text-[#6b7280]">{incident.description.slice(0, 200)}</p> : null}
                  </div>
                  {incident.status !== 'resolved' ? (
                    <div className="flex gap-2">
                      {incident.status === 'open' ? (
                        <form action={updateIncidentStatusAction}>
                          <input type="hidden" name="incidentId" value={incident.id} />
                          <input type="hidden" name="status" value="monitoring" />
                          <Button type="submit" variant="ghost" className="h-8 px-3 text-xs">Övervaka</Button>
                        </form>
                      ) : null}
                      <form action={updateIncidentStatusAction}>
                        <input type="hidden" name="incidentId" value={incident.id} />
                        <input type="hidden" name="status" value="resolved" />
                        <Button type="submit" variant="ghost" className="h-8 px-3 text-xs">Markera löst</Button>
                      </form>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Cron-körningar (senaste 40)</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-[#e8ebf3]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f7f8fc] text-xs uppercase tracking-[0.12em] text-[#6b7280]">
              <tr>
                <th className="px-4 py-2">Jobb</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Start</th>
                <th className="px-4 py-2">Resultat/fel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8ebf3]">
              {(cronRuns ?? []).map((run) => (
                <tr key={run.id}>
                  <td className="px-4 py-2 font-mono text-xs text-[#111827]">{run.job_name}</td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        run.status === 'success'
                          ? 'rounded-full bg-[#ecfdf5] px-3 py-1 text-xs font-semibold text-[#047857]'
                          : run.status === 'failed'
                            ? 'rounded-full bg-[#fee2e2] px-3 py-1 text-xs font-semibold text-[#b91c1c]'
                            : 'rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-semibold text-[#9a5b00]'
                      }
                    >
                      {run.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-[#6b7280]">{formatDateTime(run.started_at)}</td>
                  <td className="px-4 py-2 font-mono text-xs text-[#6b7280]">
                    {run.error ? run.error.slice(0, 80) : JSON.stringify(run.result ?? {}).slice(0, 80)}
                  </td>
                </tr>
              ))}
              {!cronRuns?.length ? (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-sm text-[#6b7280]">Inga körningar loggade ännu.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminShell>
  )
}
