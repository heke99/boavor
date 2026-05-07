'use client'

import { useMemo, useState } from 'react'
import { Search, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ListingType } from '@/lib/types'

export function HeroSearch() {
  const router = useRouter()
  const [mode, setMode] = useState<ListingType>('rent')
  const [city, setCity] = useState('')
  const [rooms, setRooms] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [propertyType, setPropertyType] = useState('')

  const buttonLabel = useMemo(
    () => (mode === 'rent' ? 'Sök hyresbostäder' : 'Sök bostäder till salu'),
    [mode],
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    params.set('mode', mode)
    if (city) params.set('city', city)
    if (rooms) params.set('rooms', rooms)
    if (maxPrice) params.set('maxPrice', maxPrice)
    if (propertyType) params.set('propertyType', propertyType)
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
          Till salu
        </button>

        <div className="ml-auto hidden items-center gap-2 rounded-full bg-[#eef2ff] px-4 py-2 text-sm font-semibold text-[#2c3e94] lg:flex">
          <Sparkles size={14} />
          Smartare sök med Bovaro
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-[1.7rem] font-semibold tracking-[-0.02em] text-[#111827] md:text-[1.95rem]">
          Börja din bostadssökning
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#5b6475]">
          Filtrera direkt på stad, bostadstyp, antal rum och pris. Sökrutan är byggd för att kännas snabb,
          tydlig och enkel att använda även när fler filter kopplas på.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2 xl:grid-cols-2">
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
          <label className="text-sm font-semibold text-[#111827]">Bostadstyp</label>
          <Select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="h-14 rounded-2xl border border-[#d7dbe7] bg-white px-4 text-[15px] text-[#111827]"
          >
            <option value="">Alla bostadstyper</option>
            <option value="apartment">Lägenhet</option>
            <option value="house">Hus</option>
            <option value="property">Fastighet</option>
          </Select>
        </div>

        <div className="space-y-2.5">
          <label className="text-sm font-semibold text-[#111827]">Antal rum</label>
          <Select
            value={rooms}
            onChange={(e) => setRooms(e.target.value)}
            className="h-14 rounded-2xl border border-[#d7dbe7] bg-white px-4 text-[15px] text-[#111827]"
          >
            <option value="">Välj antal rum</option>
            <option value="1">1+ rum</option>
            <option value="2">2+ rum</option>
            <option value="3">3+ rum</option>
            <option value="4">4+ rum</option>
            <option value="5">5+ rum</option>
          </Select>
        </div>

        <div className="space-y-2.5">
          <label className="text-sm font-semibold text-[#111827]">
            {mode === 'rent' ? 'Max hyra' : 'Max pris'}
          </label>
          <Input
            type="number"
            placeholder={mode === 'rent' ? 'Exempel: 15000' : 'Exempel: 4500000'}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="h-14 rounded-2xl border border-[#d7dbe7] bg-white px-4 text-[15px] text-[#111827] placeholder:text-[#7a8396]"
          />
        </div>

        <div className="xl:col-span-2 flex items-end">
          <Button className="h-14 w-full rounded-2xl bg-[#5b3df5] text-[15px] font-semibold text-white hover:bg-[#4c31d8]">
            <Search size={18} className="mr-2" />
            {buttonLabel}
          </Button>
        </div>
      </form>
    </div>
  )
}