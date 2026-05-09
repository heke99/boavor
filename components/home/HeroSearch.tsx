'use client'

import { Sparkles } from 'lucide-react'
import { DynamicListingSearch } from '@/components/listings/DynamicListingSearch'

export function HeroSearch() {
  return (
    <div className="rounded-[36px] border border-white/20 bg-white p-6 shadow-[0_28px_90px_rgba(15,23,42,0.28)] md:p-7 xl:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[1.7rem] font-semibold tracking-[-0.02em] text-[#111827] md:text-[1.95rem]">
            Sök smartare
          </h2>
          <p className="mt-2 max-w-xl text-[15px] leading-7 text-[#5b6475]">
            Välj bostad, lokal, kontor, parkering, förråd, mark eller fastighet. Filtren ändras automatiskt.
          </p>
        </div>

        <div className="hidden items-center gap-2 rounded-full bg-[#eef2ff] px-4 py-2 text-sm font-semibold text-[#2c3e94] lg:flex">
          <Sparkles size={14} />
          Dynamisk sökning
        </div>
      </div>

      <DynamicListingSearch compact />
    </div>
  )
}
