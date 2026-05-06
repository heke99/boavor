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

  const buttonLabel = useMemo(() => (mode === 'rent' ? 'Sök hyresbostäder' : 'Sök bostäder till salu'), [mode])

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
    <div className="glass-panel rounded-[32px] p-5 md:p-7">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button
          className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === 'rent' ? 'bg-[var(--primary)] text-white' : 'bg-black/5 text-[var(--muted)]'}`}
          onClick={() => setMode('rent')}
          type="button"
        >
          Hyra
        </button>
        <button
          className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === 'sale' ? 'bg-[var(--primary)] text-white' : 'bg-black/5 text-[var(--muted)]'}`}
          onClick={() => setMode('sale')}
          type="button"
        >
          Till salu
        </button>
        <div className="ml-auto hidden items-center gap-2 rounded-full bg-[var(--secondary-soft)] px-4 py-2 text-sm font-medium text-[var(--secondary)] md:flex">
          <Sparkles size={14} />
          Matcha smartare med Bovaro
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Input placeholder="Stad, område eller adress" value={city} onChange={(e) => setCity(e.target.value)} />
        <Select value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
          <option value="">Alla bostadstyper</option>
          <option value="apartment">Lägenhet</option>
          <option value="house">Hus</option>
          <option value="property">Fastighet</option>
        </Select>
        <Select value={rooms} onChange={(e) => setRooms(e.target.value)}>
          <option value="">Antal rum</option>
          <option value="1">1+ rum</option>
          <option value="2">2+ rum</option>
          <option value="3">3+ rum</option>
          <option value="4">4+ rum</option>
        </Select>
        <Input
          type="number"
          placeholder={mode === 'rent' ? 'Max hyra' : 'Max pris'}
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
        <Button className="w-full">
          <Search size={16} className="mr-2" />
          {buttonLabel}
        </Button>
      </form>
    </div>
  )
}
