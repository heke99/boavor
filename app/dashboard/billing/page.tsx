import { BadgeCheck, CreditCard, Sparkles } from 'lucide-react'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getAuthContext } from '@/lib/auth/permissions'
import { isStripeConfigured } from '@/lib/billing/stripe'
import { isSubscriptionEntitled } from '@/lib/billing/entitlements'

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, string> = {
  active: 'Aktiv',
  past_due: 'Betalning misslyckades',
  cancelled: 'Avslutad',
  paused: 'Pausad',
  pending: 'Väntar',
  expired: 'Utgången',
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function DashboardBillingPage({ searchParams }: Props) {
  const params = await searchParams
  const { supabase, user } = await getAuthContext({ loginRedirect: '/login?next=/dashboard/billing' })

  const [{ data: subscriptions }, { data: plusPlan }] = await Promise.all([
    supabase
      .from('user_subscriptions')
      .select('id, plan_code, status, provider, current_period_end, cancel_at_period_end, subscription_plans(name, amount_sek)')
      .eq('user_id', user.id),
    supabase
      .from('subscription_plans')
      .select('code, name, amount_sek, description, features, is_active, stripe_price_id')
      .eq('code', 'bovaro_plus')
      .maybeSingle(),
  ])

  const stripeReady = isStripeConfigured()
  const plusSubscription = (subscriptions ?? []).find((subscription) => subscription.plan_code === 'bovaro_plus')
  const plusEntitled = plusSubscription
    ? isSubscriptionEntitled({
        planCode: plusSubscription.plan_code,
        status: plusSubscription.status,
        currentPeriodEnd: plusSubscription.current_period_end,
        provider: plusSubscription.provider,
      })
    : false
  const canBuyPlus = Boolean(plusPlan?.is_active && plusPlan.stripe_price_id && stripeReady)

  const billingStatus = typeof params.billing === 'string' ? params.billing : null
  const billingMessage =
    billingStatus === 'success'
      ? 'Tack! Din betalning är genomförd — det kan ta någon minut innan prenumerationen syns här.'
      : billingStatus === 'cancelled'
        ? 'Köpet avbröts. Inget har debiterats.'
        : billingStatus === 'plan_unavailable'
          ? 'Planen är inte tillgänglig för köp just nu.'
          : billingStatus === 'no_customer'
            ? 'Ingen betalkund hittades — teckna en prenumeration först.'
            : null

  return (
    <DashboardShell
      activePath="/dashboard/billing"
      title="Fakturering"
      description="Dina prenumerationer och betalningar. Grundtjänsten är alltid kostnadsfri."
    >
      {billingMessage ? (
        <div className={`rounded-2xl p-4 text-sm font-semibold ${billingStatus === 'success' ? 'bg-[#ecfdf3] text-[#166534]' : 'bg-[#fffbeb] text-[#92400e]'}`}>
          {billingMessage}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#5b3df5]">
            <Sparkles size={16} />
            Bovaro Plus
          </div>
          {plusEntitled ? (
            <>
              <div className="mt-4 flex items-center gap-2 text-2xl font-semibold text-[#111827]">
                <BadgeCheck size={22} className="text-[#16a34a]" />
                Du har Bovaro Plus
              </div>
              <p className="mt-2 text-sm text-[#6b7280]">
                Status: {STATUS_LABELS[plusSubscription?.status ?? ''] ?? plusSubscription?.status}
                {plusSubscription?.current_period_end
                  ? ` · Förnyas ${new Date(plusSubscription.current_period_end).toLocaleDateString('sv-SE')}`
                  : ''}
                {plusSubscription?.cancel_at_period_end ? ' · Avslutas vid periodens slut' : ''}
              </p>
              {plusSubscription?.provider === 'stripe' && stripeReady ? (
                <form action="/api/billing/portal" method="POST" className="mt-5">
                  <input type="hidden" name="returnTo" value="/dashboard/billing" />
                  <Button type="submit" variant="secondary">
                    <CreditCard size={16} className="mr-2" />
                    Hantera prenumeration
                  </Button>
                </form>
              ) : plusSubscription?.provider === 'complimentary' ? (
                <p className="mt-4 rounded-2xl bg-[#eef2ff] p-3 text-xs font-semibold text-[#3730a3]">
                  Kostnadsfri åtkomst beviljad av Bovaro.
                </p>
              ) : null}
            </>
          ) : (
            <>
              <div className="mt-4 text-2xl font-semibold text-[#111827]">
                {plusPlan?.amount_sek ? `${plusPlan.amount_sek} kr/mån` : 'Bovaro Plus'}
              </div>
              <p className="mt-2 text-sm leading-6 text-[#6b7280]">{plusPlan?.description}</p>
              <ul className="mt-4 space-y-2 text-sm text-[#374151]">
                {((plusPlan?.features as string[]) ?? []).map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <BadgeCheck size={15} className="text-[#16a34a]" />
                    {feature}
                  </li>
                ))}
              </ul>
              {canBuyPlus ? (
                <form action="/api/billing/checkout" method="POST" className="mt-5">
                  <input type="hidden" name="planCode" value="bovaro_plus" />
                  <input type="hidden" name="returnTo" value="/dashboard/billing" />
                  <Button type="submit">Uppgradera till Plus</Button>
                </form>
              ) : (
                <p className="mt-5 rounded-2xl bg-[#fffbeb] p-3 text-sm font-semibold text-[#92400e]">
                  Bovaro Plus går inte att teckna ännu i den här miljön.
                </p>
              )}
            </>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[#111827]">Dina prenumerationer</h2>
          {(subscriptions ?? []).length === 0 ? (
            <p className="mt-4 rounded-2xl bg-[#f7f8fc] p-4 text-sm text-[#6b7280]">
              Du har inga betalda prenumerationer. Bostadskön och profilen är kostnadsfria.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {(subscriptions ?? []).map((subscription) => {
                const plan = subscription.subscription_plans as { name: string; amount_sek: number } | null
                return (
                  <div key={subscription.id} className="rounded-2xl border border-[#e8ebf3] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-[#111827]">{plan?.name ?? subscription.plan_code}</div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          subscription.status === 'active'
                            ? 'bg-[#dcfce7] text-[#166534]'
                            : subscription.status === 'past_due'
                              ? 'bg-[#fee2e2] text-[#b91c1c]'
                              : 'bg-[#f3f4f6] text-[#6b7280]'
                        }`}
                      >
                        {STATUS_LABELS[subscription.status] ?? subscription.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-[#6b7280]">
                      {plan?.amount_sek ? `${plan.amount_sek} kr/mån · ` : ''}
                      {subscription.provider === 'complimentary' ? 'Beviljad av Bovaro' : subscription.provider}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  )
}
