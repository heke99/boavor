import { LandlordShell } from '@/components/landlord/LandlordShell'
import { ModulePlaceholder } from '@/components/landlord/ModulePlaceholder'

export const dynamic = 'force-dynamic'

export default function LandlordBillingPage() {
  return (
    <LandlordShell
      activePath="/landlord/billing"
      title="Fakturering"
      description="Abonnemang och fakturor för hyresvärdsverktygen."
    >
      <ModulePlaceholder
        title="Faktureringen är inte aktiverad ännu"
        description="Under uppbyggnadsfasen är hyresvärdsverktygen kostnadsfria. Abonnemang med Stripe-betalning aktiveras i ett senare steg — faktura-e-post och referens anger du redan nu under Onboarding."
      />
    </LandlordShell>
  )
}
