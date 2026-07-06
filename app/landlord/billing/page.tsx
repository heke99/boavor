import { BadgeCheck, CreditCard } from 'lucide-react'
import { LandlordShell } from '@/components/landlord/LandlordShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { requireLandlordAccess } from '@/lib/data/landlord'
import { isStripeConfigured } from '@/lib/billing/stripe'

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

export default async function LandlordBillingPage({ searchParams }: Props) {
  const params = await searchParams
  const context = await requireLandlordAccess()
  const { supabase, companyIds, primaryCompanyId } = context

  const [{ data: plans }, { data: subscriptions }] = await Promise.all([
    supabase
      .from('subscription_plans')
      .select('code, name, amount_sek, description, features, is_active, is_public, stripe_price_id')
      .eq('plan_audience', 'landlord')
      .eq('is_public', true)
      .order('amount_sek', { ascending: true }),
    companyIds.length
      ? supabase
          .from('company_subscriptions')
          .select('id, company_id, plan_code, status, provider, current_period_end, cancel_at_period_end, subscription_plans(name, amount_sek)')
          .in('company_id', companyIds)
      : Promise.resolve({ data: [] }),
  ])

  const stripeReady = isStripeConfigured()
  const billingStatus = typeof params.billing === 'string' ? params.billing : null
  const billingMessage =
    billingStatus === 'success'
      ? 'Tack! Betalningen är genomförd — prenumerationen syns inom kort.'
      : billingStatus === 'cancelled'
        ? 'Köpet avbröts. Inget har debiterats.'
        : billingStatus === 'company_required'
          ? 'Hyresvärdsplaner kräver ett företagskonto.'
          : null

  return (
    <LandlordShell
      activePath="/landlord/billing"
      title="Fakturering"
      description="Planer och betalningar för hyresvärdsverktygen. Under uppbyggnadsfasen är verktygen kostnadsfria."
    >
      {billingMessage ? (
        <div className={`rounded-2xl p-4 text-sm font-semibold ${billingStatus === 'success' ? 'bg-[#ecfdf3] text-[#166534]' : 'bg-[#fffbeb] text-[#92400e]'}`}>
          {billingMessage}
        </div>
      ) : null}

      {(subscriptions ?? []).length > 0 ? (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[#111827]">Aktiva prenumerationer</h2>
          <div className="mt-4 space-y-3">
            {(subscriptions ?? []).map((subscription) => {
              const plan = subscription.subscription_plans as { name: string; amount_sek: number } | null
              return (
                <div key={subscription.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e8ebf3] p-4">
                  <div>
                    <div className="font-semibold text-[#111827]">{plan?.name ?? subscription.plan_code}</div>
                    <div className="mt-1 text-xs text-[#6b7280]">
                      {STATUS_LABELS[subscription.status] ?? subscription.status}
                      {subscription.current_period_end
                        ? ` · Förnyas ${new Date(subscription.current_period_end).toLocaleDateString('sv-SE')}`
                        : ''}
                    </div>
                  </div>
                  {subscription.provider === 'stripe' && stripeReady ? (
                    <form action="/api/billing/portal" method="POST">
                      <input type="hidden" name="companyId" value={subscription.company_id} />
                      <input type="hidden" name="returnTo" value="/landlord/billing" />
                      <Button type="submit" variant="secondary" className="h-10">
                        <CreditCard size={15} className="mr-2" />
                        Hantera
                      </Button>
                    </form>
                  ) : null}
                </div>
              )
            })}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-5 md:grid-cols-3">
        {(plans ?? []).map((plan) => {
          const purchasable = plan.is_active && plan.stripe_price_id && stripeReady && primaryCompanyId
          return (
            <Card key={plan.code} className="flex flex-col p-6">
              <h2 className="text-lg font-semibold text-[#111827]">{plan.name}</h2>
              <div className="mt-2 text-3xl font-semibold text-[#111827]">
                {plan.code === 'landlord_enterprise' ? 'Offert' : plan.amount_sek === 0 ? 'Gratis' : `${plan.amount_sek} kr/mån`}
              </div>
              <p className="mt-2 text-sm leading-6 text-[#6b7280]">{plan.description}</p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-[#374151]">
                {((plan.features as string[]) ?? []).map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <BadgeCheck size={15} className="text-[#16a34a]" />
                    {feature}
                  </li>
                ))}
              </ul>
              {purchasable ? (
                <form action="/api/billing/checkout" method="POST" className="mt-5">
                  <input type="hidden" name="planCode" value={plan.code} />
                  <input type="hidden" name="companyId" value={primaryCompanyId ?? ''} />
                  <input type="hidden" name="returnTo" value="/landlord/billing" />
                  <Button type="submit" className="w-full">Teckna {plan.name}</Button>
                </form>
              ) : (
                <p className="mt-5 rounded-2xl bg-[#f7f8fc] p-3 text-center text-xs font-semibold text-[#6b7280]">
                  {plan.code === 'landlord_enterprise'
                    ? 'Kontakta oss: support@bovaro.se'
                    : 'Går inte att teckna ännu — verktygen är kostnadsfria under uppbyggnaden.'}
                </p>
              )}
            </Card>
          )
        })}
      </div>
    </LandlordShell>
  )
}
