import { BadgeCheck, Fingerprint, LockKeyhole, Wallet } from 'lucide-react'

const trustItems = [
  {
    icon: Wallet,
    title: 'Kostnadsfri bostadskö',
    description: 'Köpoäng samlas automatiskt — utan avgifter och utan förpliktelser.',
  },
  {
    icon: Fingerprint,
    title: 'Verifierade identiteter',
    description: 'Ansökningar kräver verifierad identitet. Personnummer lagras aldrig i klartext.',
  },
  {
    icon: BadgeCheck,
    title: 'Granskade hyresvärdar',
    description: 'Företagskonton verifieras av Bovaro innan de får full åtkomst.',
  },
  {
    icon: LockKeyhole,
    title: 'Dina uppgifter, dina regler',
    description: 'GDPR-verktyg inbyggda: ladda ner din data eller begär radering när du vill.',
  },
]

/** Trust badges under the hero: why Bovaro is safe to use. */
export function TrustStrip() {
  return (
    <section aria-label="Trygghet på Bovaro" className="container-shell py-10">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {trustItems.map((item) => (
          <div key={item.title} className="rounded-[28px] border border-[#e8ebf3] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#5b3df5]">
              <item.icon size={18} aria-hidden />
            </div>
            <div className="mt-3 font-semibold text-[#111827]">{item.title}</div>
            <p className="mt-1 text-sm leading-6 text-[#5b6475]">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
