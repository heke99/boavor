import { AdminShell } from '@/components/admin/AdminShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { requireAdminUser } from '@/lib/data/admin'
import { isStripeConfigured } from '@/lib/billing/stripe'
import { grantComplimentaryAction, revokeSubscriptionAction, updatePlanAction } from './actions'

export const dynamic = 'force-dynamic'

export default async function AdminBillingPage() {
  const { supabase, role } = await requireAdminUser()

  const [{ data: plans }, { data: subscriptions }, { data: events }] = await Promise.all([
    supabase
      .from('subscription_plans')
      .select('code, name, amount_sek, plan_audience, is_active, is_public, stripe_price_id, trial_days, max_active_applications')
      .order('plan_audience')
      .order('amount_sek'),
    supabase
      .from('user_subscriptions')
      .select('id, user_id, plan_code, provider, status, current_period_end, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('billing_events')
      .select('id, stripe_event_id, event_type, processed_at, error, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const stripeReady = isStripeConfigured()
  const isSuperAdmin = role === 'super_admin'

  return (
    <AdminShell
      activePath="/admin/billing"
      title="Fakturering"
      description={`Planer, prenumerationer och Stripe-händelser. Stripe: ${stripeReady ? 'konfigurerad' : 'INTE konfigurerad i den här miljön'}.`}
    >
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Bevilja kostnadsfri åtkomst</h2>
        <p className="mt-1 text-sm text-[#6b7280]">Ger en användare en plan utan betalning under en begränsad period. Loggas i audit-loggen.</p>
        <form action={grantComplimentaryAction} className="mt-5 grid gap-3 md:grid-cols-[1fr_220px_130px_auto]">
          <Input name="userId" placeholder="Användar-ID (uuid)" required className="h-12 rounded-2xl border-[#d7dbe7]" />
          <Select name="planCode" defaultValue="bovaro_plus" className="h-12 rounded-2xl border-[#d7dbe7]">
            {(plans ?? []).map((plan) => (
              <option key={plan.code} value={plan.code}>{plan.name}</option>
            ))}
          </Select>
          <Input name="months" type="number" min={1} max={24} defaultValue={3} className="h-12 rounded-2xl border-[#d7dbe7]" />
          <Button className="h-12">Bevilja</Button>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Planer</h2>
        {!isSuperAdmin ? (
          <p className="mt-2 rounded-2xl bg-[#fffbeb] p-3 text-sm font-semibold text-[#92400e]">
            Endast superadmin kan ändra priser, synlighet och Stripe-koppling.
          </p>
        ) : null}
        <div className="mt-5 space-y-4">
          {(plans ?? []).map((plan) => (
            <div key={plan.code} className="rounded-2xl border border-[#e8ebf3] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-[#111827]">{plan.name}</span>
                <span className="rounded-full bg-[#f7f8fc] px-3 py-1 text-xs font-semibold text-[#6b7280]">{plan.code}</span>
                <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#4338ca]">{plan.plan_audience === 'landlord' ? 'Hyresvärd' : 'Sökande'}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${plan.is_active ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#f3f4f6] text-[#6b7280]'}`}>
                  {plan.is_active ? 'Aktiv' : 'Inaktiv'}
                </span>
                {plan.max_active_applications ? (
                  <span className="rounded-full bg-[#f7f8fc] px-3 py-1 text-xs text-[#6b7280]">{plan.max_active_applications} aktiva ansökningar</span>
                ) : null}
              </div>
              {isSuperAdmin ? (
                <form action={updatePlanAction} className="mt-4 grid gap-3 md:grid-cols-[130px_1fr_110px_auto_auto_auto]">
                  <input type="hidden" name="planCode" value={plan.code} />
                  <Input name="amountSek" type="number" min={0} defaultValue={plan.amount_sek} className="h-11 rounded-2xl border-[#d7dbe7]" />
                  <Input name="stripePriceId" defaultValue={plan.stripe_price_id ?? ''} placeholder="Stripe price id (price_…)" className="h-11 rounded-2xl border-[#d7dbe7]" />
                  <Input name="trialDays" type="number" min={0} defaultValue={plan.trial_days ?? 0} placeholder="Provdagar" className="h-11 rounded-2xl border-[#d7dbe7]" />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={plan.is_active} /> Aktiv</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPublic" defaultChecked={plan.is_public} /> Synlig</label>
                  <Button type="submit" variant="secondary" className="h-11">Spara</Button>
                </form>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Prenumerationer (senaste 100)</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-[#eef0f6] text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                <th className="py-2 pr-4">Användare</th>
                <th className="py-2 pr-4">Plan</th>
                <th className="py-2 pr-4">Leverantör</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Period slut</th>
                <th className="py-2">Åtgärd</th>
              </tr>
            </thead>
            <tbody>
              {(subscriptions ?? []).map((subscription) => (
                <tr key={subscription.id} className="border-b border-[#f4f5fa]">
                  <td className="py-2 pr-4 font-mono text-xs">{subscription.user_id.slice(0, 8)}…</td>
                  <td className="py-2 pr-4">{subscription.plan_code}</td>
                  <td className="py-2 pr-4">{subscription.provider}</td>
                  <td className="py-2 pr-4">{subscription.status}</td>
                  <td className="py-2 pr-4">
                    {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString('sv-SE') : '—'}
                  </td>
                  <td className="py-2">
                    {subscription.status === 'active' ? (
                      <form action={revokeSubscriptionAction}>
                        <input type="hidden" name="subscriptionId" value={subscription.id} />
                        <Button type="submit" variant="ghost" className="h-8 border border-[#fecaca] px-3 text-xs !text-[#b91c1c]">
                          Återkalla
                        </Button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Stripe-händelser (senaste 50)</h2>
        {(events ?? []).length === 0 ? (
          <p className="mt-4 rounded-2xl bg-[#f7f8fc] p-4 text-sm text-[#6b7280]">Inga webhook-händelser ännu.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-[#eef0f6] text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                  <th className="py-2 pr-4">Händelse</th>
                  <th className="py-2 pr-4">Stripe-ID</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Mottagen</th>
                </tr>
              </thead>
              <tbody>
                {(events ?? []).map((event) => (
                  <tr key={event.id} className="border-b border-[#f4f5fa]">
                    <td className="py-2 pr-4 font-semibold">{event.event_type}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{event.stripe_event_id}</td>
                    <td className="py-2 pr-4">
                      {event.error ? (
                        <span className="rounded-full bg-[#fee2e2] px-3 py-1 text-xs font-semibold text-[#b91c1c]" title={event.error}>Fel</span>
                      ) : event.processed_at ? (
                        <span className="rounded-full bg-[#dcfce7] px-3 py-1 text-xs font-semibold text-[#166534]">Behandlad</span>
                      ) : (
                        <span className="rounded-full bg-[#fef3c7] px-3 py-1 text-xs font-semibold text-[#92400e]">Väntar</span>
                      )}
                    </td>
                    <td className="py-2">{new Date(event.created_at).toLocaleString('sv-SE')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AdminShell>
  )
}
