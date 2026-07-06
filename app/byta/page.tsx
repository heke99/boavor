import type { Metadata } from 'next'
import { ArrowLeftRight, ArrowRight, Lock, ShieldCheck, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { isModuleEnabled } from '@/lib/product/modules'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export const metadata: Metadata = {
  title: 'Bovaro Byta — byt bostad tryggt',
  description:
    'Bovaro Byta blir en tjänst för lägenhetsbyten mellan hyresgäster, med verifierade profiler och skyddade kontaktuppgifter.',
}

const principles = [
  {
    icon: UserCheck,
    title: 'Verifierade användare',
    description: 'Endast verifierade användare kan skapa bytesannonser och kontakta varandra.',
  },
  {
    icon: Lock,
    title: 'Skyddade uppgifter',
    description: 'Exakt adress och namn visas först vid ömsesidigt intresse — du bestämmer själv vad som delas.',
  },
  {
    icon: ShieldCheck,
    title: 'Hyresvärdens godkännande',
    description: 'Byten dokumenteras stegvis så att bägge hyresvärdar kan granska och godkänna bytet korrekt.',
  },
]

export default async function BytaPage() {
  const bytaEnabled = isModuleEnabled('bovaroByta')

  // Honest public stat: number of active exchange ads (service role count —
  // profile contents remain restricted to verified users).
  let activeCount: number | null = null
  const serviceClient = createSupabaseServiceClient()
  if (serviceClient) {
    const { count } = await serviceClient
      .from('exchange_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
    activeCount = count ?? 0
  }

  return (
    <>
      <section className="relative overflow-hidden bg-[#070a1a]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(91,61,245,0.42),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(14,165,164,0.30),transparent_24%),linear-gradient(135deg,#080b1c_0%,#111a3a_46%,#243b8f_100%)]" />
        <div className="container-shell relative py-20 md:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-xl">
              <ArrowLeftRight size={15} />
              Bovaro Byta
            </div>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-white md:text-6xl">
              Byt lägenhet — tryggt och strukturerat.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/82 md:text-lg">
              Bovaro Byta blir en tjänst där hyresgäster kan hitta varandra för lägenhetsbyten, med verifierade
              profiler, skyddade kontaktuppgifter och ett tydligt flöde hela vägen till hyresvärdens godkännande.
            </p>
            {!bytaEnabled ? (
              <div className="mt-8 inline-flex items-center gap-2 rounded-2xl border border-amber-200/40 bg-amber-500/15 px-4 py-3 text-sm font-semibold text-amber-100">
                Bovaro Byta är under uppbyggnad och har inte öppnat ännu.
              </div>
            ) : activeCount !== null ? (
              <div className="mt-8 inline-flex items-center gap-2 rounded-2xl border border-white/18 bg-white/10 px-4 py-3 text-sm font-semibold text-white">
                {activeCount} aktiva bytesannonser just nu
              </div>
            ) : null}
            <div className="mt-8 flex flex-wrap gap-3">
              {bytaEnabled ? (
                <>
                  <Button href="/byta/skapa" className="border border-white/22 bg-white !text-[#111827] hover:bg-white/90">
                    Skapa bytesannons
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                  <Button href="/dashboard/byten" className="border border-white/22 bg-white/10 !text-white hover:bg-white/16">
                    Mina byten och matchningar
                  </Button>
                </>
              ) : (
                <>
                  <Button href="/register" className="border border-white/22 bg-white !text-[#111827] hover:bg-white/90">
                    Skapa konto så är du redo
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                  <Button href="/rent" className="border border-white/22 bg-white/10 !text-white hover:bg-white/16">
                    Se lediga hyresbostäder
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell py-16">
        <SectionHeading
          eyebrow="Trygghet först"
          title="Principerna bakom Bovaro Byta"
          description="Bostadsbyten involverar känsliga uppgifter och juridiska steg. Därför bygger vi tjänsten med tydliga skyddsregler från start."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {principles.map((principle) => (
            <div key={principle.title} className="rounded-[28px] border border-[#e8ebf3] bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.05)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#5b3df5]">
                <principle.icon size={20} />
              </div>
              <div className="mt-4 text-lg font-semibold text-[#111827]">{principle.title}</div>
              <p className="mt-2 text-sm leading-6 text-[#5b6475]">{principle.description}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
