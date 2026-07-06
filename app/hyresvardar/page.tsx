import type { Metadata } from 'next'
import { ArrowRight, BadgeCheck, Building2, ClipboardList, Inbox, LineChart, ShieldCheck, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { RoiCalculator } from '@/components/sales/RoiCalculator'
import { DemoRequestForm } from '@/components/sales/DemoRequestForm'
import { isModuleEnabled } from '@/lib/product/modules'

export const metadata: Metadata = {
  title: 'För hyresvärdar — Bovaro',
  description:
    'Publicera hyresbostäder, ta emot strukturerade ansökningar och hantera intressenter på ett ställe. Bovaro ger hyresvärdar ett modernt uthyrningsflöde.',
}

const currentCapabilities = [
  {
    icon: Building2,
    title: 'Publicera annonser',
    description: 'Skapa och publicera annonser för hyresbostäder och lokaler med bilder, fakta och krav.',
  },
  {
    icon: Inbox,
    title: 'Samlade ansökningar',
    description: 'Alla ansökningar och intresseanmälningar samlas per annons med sökandens profil och kötid.',
  },
  {
    icon: ClipboardList,
    title: 'Statusflöde och anteckningar',
    description: 'Flytta ansökningar genom er process och samarbeta med interna anteckningar i teamet.',
  },
  {
    icon: BadgeCheck,
    title: 'Verifierat företag',
    description: 'Företagskonton granskas av Bovaro. Verifierade hyresvärdar får en tydlig märkning mot sökande.',
  },
]

const workspaceCapabilities = [
  {
    icon: Users,
    title: 'Automatisk kravmatchning',
    description: 'Definiera er uthyrningspolicy och låt Matchkoll föranalysera vilka sökande som uppfyller kraven.',
  },
  {
    icon: LineChart,
    title: 'Analys och rapporter',
    description: 'Följ visningar, ansökningar och konvertering per annons — med CSV-export.',
  },
  {
    icon: ShieldCheck,
    title: 'Visningar, erbjudanden och kontrakt',
    description: 'Boka visningar, skicka tidsbegränsade erbjudanden och hantera kontrakt med digital signering.',
  },
]

export default function HyresvardarPage() {
  const landlordSaasEnabled = isModuleEnabled('landlordSaas')

  return (
    <>
      <section className="relative overflow-hidden bg-[#070a1a]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(91,61,245,0.42),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(14,165,164,0.30),transparent_24%),linear-gradient(135deg,#080b1c_0%,#111a3a_46%,#243b8f_100%)]" />
        <div className="container-shell relative py-20 md:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-xl">
              <Building2 size={15} />
              För hyresvärdar
            </div>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-white md:text-6xl">
              Mindre administration. Bättre uthyrning.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/82 md:text-lg">
              Bovaro samlar annonsering, ansökningar och intressenthantering i ett flöde. Ni får strukturerade
              ansökningar med profil, inkomst och kötid — i stället för mejlkorgar fulla av lösa intresseanmälningar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/register" className="border border-white/22 bg-white !text-[#111827] hover:bg-white/90">
                Skapa företagskonto
                <ArrowRight size={16} className="ml-2" />
              </Button>
              <Button href="/login?next=/dashboard/listings" className="border border-white/22 bg-white/10 !text-white hover:bg-white/16">
                Logga in till annonsflödet
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell py-16">
        <SectionHeading
          eyebrow="Tillgängligt idag"
          title="Det här kan ni göra i Bovaro nu"
          description="Funktioner som redan är igång för hyresvärdar med företagskonto."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {currentCapabilities.map((capability) => (
            <div key={capability.title} className="rounded-[28px] border border-[#e8ebf3] bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.05)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#5b3df5]">
                <capability.icon size={20} />
              </div>
              <div className="mt-4 text-lg font-semibold text-[#111827]">{capability.title}</div>
              <p className="mt-2 text-sm leading-6 text-[#5b6475]">{capability.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-shell pb-16">
        <SectionHeading
          eyebrow="Arbetsytan"
          title="En komplett arbetsyta för professionell uthyrning"
          description={
            landlordSaasEnabled
              ? 'Hela arbetsytan är aktiverad: fastigheter, pipeline, meddelanden, visningar, kontrakt, analys och import.'
              : 'Den utökade arbetsytan rullas ut stegvis.'
          }
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {workspaceCapabilities.map((capability) => (
            <div key={capability.title} className="rounded-[28px] border border-[#e8ebf3] bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.05)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#5b3df5]">
                <capability.icon size={20} />
              </div>
              <div className="mt-4 text-lg font-semibold text-[#111827]">{capability.title}</div>
              <p className="mt-2 text-sm leading-6 text-[#5b6475]">{capability.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-shell pb-16">
        <SectionHeading
          eyebrow="ROI-kalkyl"
          title="Vad är kortare vakans och mindre administration värt?"
          description="Fyll i era siffror och få en konservativ uppskattning. Lämna e-post så går vi igenom kalkylen tillsammans."
        />
        <div className="mt-8">
          <RoiCalculator />
        </div>
      </section>

      <section className="container-shell pb-20">
        <div className="rounded-[36px] bg-[linear-gradient(135deg,#101228,#1e2e72)] p-8 text-white md:p-12">
          <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
            <div>
              <h2 className="text-3xl font-semibold">Kom igång som hyresvärd</h2>
              <p className="mt-3 max-w-2xl text-white/78">
                Skapa ett företagskonto, bli verifierad av Bovaro och publicera er första annons — eller boka en
                personlig demo så visar vi arbetsytan med ert bestånd som exempel.
              </p>
              <div className="mt-6">
                <Button href="/register" className="border border-white/22 bg-white !text-[#111827] hover:bg-white/90">
                  Skapa företagskonto
                </Button>
              </div>
            </div>
            <DemoRequestForm />
          </div>
        </div>
      </section>
    </>
  )
}
