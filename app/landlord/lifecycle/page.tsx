import { AlertTriangle, Building2, CalendarCheck, LogOut, Wallet, Wrench } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { LandlordShell } from '@/components/landlord/LandlordShell'
import { getLandlordLifecycleBundle } from '@/lib/landlord/lifecycle'
import { formatMoney } from '@/lib/tenant/portal'

export default async function LandlordLifecyclePage() {
  const { data } = await getLandlordLifecycleBundle()
  const cards = [
    { label: 'Aktiva hyresgästrelationer', value: data.tenancies, icon: Building2 },
    { label: 'Kommande inflyttningar', value: data.move_ins, icon: CalendarCheck },
    { label: 'Obetalda hyresavier', value: data.unpaid_invoices, icon: Wallet },
    { label: 'Utestående saldo', value: formatMoney(data.outstanding_ore), icon: Wallet },
    { label: 'Öppna felanmälningar', value: data.maintenance, icon: Wrench },
    { label: 'Akuta felanmälningar', value: data.urgent_maintenance, icon: AlertTriangle },
    { label: 'Pågående utflyttningar', value: data.move_outs, icon: LogOut },
    { label: 'Dead-letter events', value: data.dead_letters, icon: AlertTriangle },
  ]
  return (
    <LandlordShell activePath="/landlord/lifecycle" title="Hyresgäster & livscykel" description="Signerade avtal, inflyttning, hyresreskontra, underhåll och utflyttning i samma tenantisolerade modell.">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => {
          const Icon = item.icon
          return <Card key={item.label} className="p-6"><Icon size={20} className="text-[#1d4ed8]" /><div className="mt-3 text-sm text-[#6b7280]">{item.label}</div><div className="mt-1 text-2xl font-semibold">{item.value}</div></Card>
        })}
      </div>
      <Card className="p-6">
        <h2 className="text-xl font-semibold">Canonical driftkontroll</h2>
        <p className="mt-3 text-sm leading-6 text-[#6b7280]">Hyresgästrelationer kan endast provisioneras från ett signerat, hashverifierat och immutable avtalsdokument. SaaS-fakturering och hyresreskontra är separata domäner.</p>
      </Card>
    </LandlordShell>
  )
}

