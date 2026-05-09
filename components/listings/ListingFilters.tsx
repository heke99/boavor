'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { listingCategoryOptions } from '@/lib/listing-options'

export function ListingFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentCategory = searchParams.get('category') ?? 'all'

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') params.set(key, value)
    else params.delete(key)
    router.push(`/listings?${params.toString()}`)
  }

  return (
    <div className="rounded-[28px] border border-black/8 bg-white p-5 shadow-[0_10px_30px_rgba(13,17,32,0.05)]">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {listingCategoryOptions.map((option) => {
          const active = currentCategory === option.value || (!searchParams.get('category') && option.value === 'all')
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => updateParam('category', option.value)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                active ? 'bg-[#111827] text-white' : 'bg-[#f3f4f6] text-[#111827] hover:bg-[#e9ecf3]'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Select defaultValue={searchParams.get('mode') ?? ''} onChange={(e) => updateParam('mode', e.target.value)}>
          <option value="">Hyra + till salu</option>
          <option value="rent">Hyra</option>
          <option value="sale">Till salu</option>
        </Select>

        <Input
          defaultValue={searchParams.get('city') ?? ''}
          placeholder="Stad eller område"
          onBlur={(e) => updateParam('city', e.target.value)}
        />

        <Select defaultValue={searchParams.get('propertyType') ?? ''} onChange={(e) => updateParam('propertyType', e.target.value)}>
          <option value="">Alla objekttyper</option>
          <option value="apartment">Lägenhet</option>
          <option value="house">Hus</option>
          <option value="property">Bostadsfastighet</option>
          <option value="commercial_space">Lokal</option>
          <option value="office">Kontor</option>
          <option value="parking_space">P-plats</option>
          <option value="garage">Garage</option>
          <option value="storage_unit">Förråd / lager</option>
          <option value="land_plot">Mark / tomt</option>
          <option value="investment_property">Investeringsfastighet</option>
        </Select>

        <Select defaultValue={searchParams.get('rooms') ?? ''} onChange={(e) => updateParam('rooms', e.target.value)}>
          <option value="">Rum, valfritt</option>
          <option value="1">1+ rum</option>
          <option value="2">2+ rum</option>
          <option value="3">3+ rum</option>
          <option value="4">4+ rum</option>
        </Select>

        <Input
          type="number"
          defaultValue={searchParams.get('maxPrice') ?? ''}
          placeholder="Max pris / hyra"
          onBlur={(e) => updateParam('maxPrice', e.target.value)}
        />
      </div>
      <div className="mt-4 flex justify-end">
        <Button href="/listings" variant="ghost" className="border border-black/8">
          Rensa filter
        </Button>
      </div>
    </div>
  )
}
