'use client'

import { useMemo, useState } from 'react'
import { Search, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ListingCategory, ListingType } from '@/lib/types'

const categoryOptions: Array<{ value: ListingCategory; label: string }> = [
  { value: 'residential', label: 'Bostad' },
  { value: 'commercial', label: 'Lokal' },
  { value: 'office', label: 'Kontor' },
  { value: 'parking', label: 'Parkering' },
  { value: 'storage', label: 'Förråd' },
  { value: 'investment', label: 'Fastighet' },
]

export function HeroSearch() {
  const router = useRouter()
  const [mode, setMode] = useState<ListingType>('rent')
  const [category, setCategory] = useState<ListingCategory>('residential')
  const [city, setCity] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  const buttonLabel = useMemo(() => (mode === 'rent' ? 'Sök att hyra' : 'Sök att köpa'), [mode])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    params.set('mode', mode)
    params.set('category', category)
    if (city) params.set('city', city)
    if (maxPrice) params.set('maxPrice', maxPrice)
    router.push(`/listings?${params.toString()}`)
  }

  return (
    <div className="rounded-[36px] border border-white/20 bg-white p-8 shadow-[0_28px_90px_rgba(15,23,42,0.28)] md:p-9 xl:p-10">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
            mode === 'rent'
              ? 'bg-[#5b3df5] text-white shadow-[0_12px_30px_rgba(91,61,245,0.24)]'
              : 'bg-[#eef2ff] text-[#111827] hover:bg-[#e4e8fb]'
          }`}
          onClick={() => setMode('rent')}
          type="button"
        >
          Hyra
        </button>

        <button
          className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
            mode === 'sale'
              ? 'bg-[#5b3df5] text-white shadow-[0_12px_30px_rgba(91,61,245,0.24)]'
              : 'bg-[#eef2ff] text-[#111827] hover:bg-[#e4e8fb]'
          }`}
          onClick={() => setMode('sale')}
          type="button"
        >
          Köpa
        </button>

        <div className="ml-auto hidden items-center gap-2 rounded-full bg-[#eef2ff] px-4 py-2 text-sm font-semibold text-[#2c3e94] lg:flex">
          <Sparkles size={14} />
          Bostäder + kommersiella objekt
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-[1.7rem] font-semibold tracking-[-0.02em] text-[#111827] md:text-[1.95rem]">
          Sök i hela Bovaro
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#5b6475]">
          Hitta bostäder, lokaler, kontor, parkeringar, förråd, mark och investeringsfastigheter i samma sökflöde.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2.5">
          <label className="text-sm font-semibold text-[#111827]">Vad söker du?</label>
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value as ListingCategory)}
            className="h-14 rounded-2xl border border-[#d7dbe7] bg-white px-4 text-[15px] text-[#111827]"
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2.5">
          <label className="text-sm font-semibold text-[#111827]">Var</label>
          <Input
            placeholder="Stad, område eller adress"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="h-14 rounded-2xl border border-[#d7dbe7] bg-white px-4 text-[15px] text-[#111827] placeholder:text-[#7a8396]"
          />
        </div>

        <div className="space-y-2.5">
          <label className="text-sm font-semibold text-[#111827]">
            {mode === 'rent' ? 'Max hyra' : 'Max pris'}
          </label>
          <Input
            type="number"
            placeholder={mode === 'rent' ? 'Exempel: 25000' : 'Exempel: 4500000'}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="h-14 rounded-2xl border border-[#d7dbe7] bg-white px-4 text-[15px] text-[#111827] placeholder:text-[#7a8396]"
          />
        </div>

        <div className="flex items-end">
          <Button className="h-14 w-full rounded-2xl bg-[#5b3df5] text-[15px] font-semibold !text-white hover:bg-[#4c31d8]">
            <Search size={18} className="mr-2" />
            {buttonLabel}
          </Button>
        </div>
      </form>
    </div>
  )
}
