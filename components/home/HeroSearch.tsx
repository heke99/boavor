'use client'

import { CheckCircle2, Layers3, ShieldCheck, Sparkles } from 'lucide-react'
import { DynamicListingSearch } from '@/components/listings/DynamicListingSearch'

export function HeroSearch() {
  return (
    <div className="relative overflow-hidden rounded-[38px] border border-white/30 bg-white/96 p-5 shadow-[0_34px_110px_rgba(2,6,23,0.32)] ring-1 ring-white/60 backdrop-blur-2xl md:p-7 xl:p-8">
      <div className="pointer-events-none absolute -right-24 -top-24 h-52 w-52 rounded-full bg-[#5b3df5]/12 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-12 h-48 w-48 rounded-full bg-[#0ea5a4]/12 blur-3xl" />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#f4f2ff] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#4c31d8]">
            <Layers3 size={14} />
            Smart sökflöde
          </div>
          <h2 className="text-[1.8rem] font-semibold tracking-[-0.035em] text-[#111827] md:text-[2.15rem]">
            Hitta rätt objekt snabbare
          </h2>
          <p className="mt-2 max-w-xl text-[15px] leading-7 text-[#5b6475]">
            Sök bostad, lokal, kontor, parkering, förråd, mark eller fastighet. Bovaro visar rätt filter för varje kategori.
          </p>
        </div>

        <div className="hidden items-center gap-2 rounded-full bg-[#eef2ff] px-4 py-2 text-sm font-semibold text-[#2c3e94] shadow-sm lg:flex">
          <Sparkles size={14} />
          Dynamisk sökning
        </div>
      </div>

      <DynamicListingSearch compact />

      <div className="mt-5 grid gap-2 text-xs font-semibold text-[#4b5563] sm:grid-cols-3">
        <div className="flex items-center gap-2 rounded-2xl bg-[#f7f8fc] px-3 py-2">
          <CheckCircle2 size={14} className="text-[#0f9f65]" />
          Bostäder + kommersiellt
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-[#f7f8fc] px-3 py-2">
          <ShieldCheck size={14} className="text-[#5b3df5]" />
          Verifierade flöden
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-[#f7f8fc] px-3 py-2">
          <Sparkles size={14} className="text-[#9a5b00]" />
          Sparade sökningar
        </div>
      </div>
    </div>
  )
}
