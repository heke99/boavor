import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, ShieldCheck, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Bostadskö — Bovaro',
  description:
    'Ställ dig i Bovaros bostadskö kostnadsfritt. Du samlar kötid från dagen du går med och använder den när du söker förstahandskontrakt.',
}

async function getSignedInState() {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return { isSignedIn: false }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { isSignedIn: Boolean(user) }
}

const steps = [
  {
    icon: Users,
    title: '1. Skapa konto',
    description: 'Registrera dig kostnadsfritt som privatperson. Det tar bara några minuter.',
  },
  {
    icon: Clock3,
    title: '2. Gå med i kön',
    description: 'Aktivera ditt kömedlemskap från din profil. Din kötid börjar räknas direkt.',
  },
  {
    icon: CalendarDays,
    title: '3. Samla kötid',
    description: 'Din köplats bygger på hur länge du stått i kön. Du ser dina poäng och din historik i din översikt.',
  },
  {
    icon: CheckCircle2,
    title: '4. Sök bostad',
    description: 'När du ansöker om en bostad följer din kötid med i ansökan och vägs in av hyresvärden.',
  },
]

export default async function BostadskoPage() {
  const { isSignedIn } = await getSignedInState()

  return (
    <>
      <section className="relative overflow-hidden bg-[#070a1a]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(91,61,245,0.42),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(14,165,164,0.30),transparent_24%),linear-gradient(135deg,#080b1c_0%,#111a3a_46%,#243b8f_100%)]" />
        <div className="container-shell relative py-20 md:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-xl">
              <Clock3 size={15} />
              Kostnadsfri bostadskö
            </div>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-white md:text-6xl">
              Ställ dig i kön till ditt nästa förstahandskontrakt.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/82 md:text-lg">
              Bovaros bostadskö är gratis. Du samlar kötid från dagen du går med, och din köplats följer med
              automatiskt när du ansöker om bostäder på Bovaro. Inga avgifter, inga överraskningar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {isSignedIn ? (
                <Button href="/dashboard/profile" className="border border-white/22 bg-white !text-[#111827] hover:bg-white/90">
                  Hantera mitt kömedlemskap
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              ) : (
                <Button href="/register" className="border border-white/22 bg-white !text-[#111827] hover:bg-white/90">
                  Skapa konto och gå med
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              )}
              <Button href="/rent" className="border border-white/22 bg-white/10 !text-white hover:bg-white/16">
                Se lediga hyresbostäder
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell py-16">
        <SectionHeading
          eyebrow="Så fungerar det"
          title="Från registrering till bostadsansökan"
          description="Kön är enkel och transparent. Din kötid är din — den påverkas inte av vilka bostäder du söker."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div key={step.title} className="rounded-[28px] border border-[#e8ebf3] bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.05)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#5b3df5]">
                <step.icon size={20} />
              </div>
              <div className="mt-4 text-lg font-semibold text-[#111827]">{step.title}</div>
              <p className="mt-2 text-sm leading-6 text-[#5b6475]">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-shell pb-16">
        <div className="rounded-[36px] border border-[#e8ebf3] bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)] md:p-10">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ecfdf5] text-[#047857]">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-[#111827]">Rättvist och transparent</h2>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-[#5b6475]">
                <li>• Kön är kostnadsfri och kräver bara ett konto.</li>
                <li>• Din kötid räknas från dagen du aktiverar medlemskapet — och du kan alltid se din historik.</li>
                <li>• När du ansöker om en bostad sparas din kötid i ansökan, så att hyresvärden ser rätt uppgifter.</li>
                <li>• Du kan pausa eller avsluta ditt medlemskap när du vill från din profil.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell pb-20">
        <div className="rounded-[36px] bg-[linear-gradient(135deg,#101228,#1e2e72)] p-8 text-white md:p-12">
          <h2 className="text-3xl font-semibold">Redo att börja samla kötid?</h2>
          <p className="mt-3 max-w-2xl text-white/78">
            Skapa en kostnadsfri profil, gå med i kön och håll utkik efter bostäder som passar dig.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href={isSignedIn ? '/dashboard/profile' : '/register'} className="border border-white/22 bg-white !text-[#111827] hover:bg-white/90">
              {isSignedIn ? 'Till min profil' : 'Skapa konto'}
            </Button>
            <Link href="/queue-terms" className="inline-flex items-center rounded-full px-5 py-3 text-sm font-semibold text-white/80 hover:text-white">
              Läs kövillkoren
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
