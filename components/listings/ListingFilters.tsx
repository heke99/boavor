'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function ListingFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/listings?${params.toString()}`)
  }

  return (
    <div className="rounded-[28px] border border-black/8 bg-white p-5 shadow-[0_10px_30px_rgba(13,17,32,0.05)]">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
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
          <option value="">Alla typer</option>
          <option value="apartment">Lägenhet</option>
          <option value="house">Hus</option>
          <option value="property">Fastighet</option>
        </Select>

        <Select defaultValue={searchParams.get('rooms') ?? ''} onChange={(e) => updateParam('rooms', e.target.value)}>
          <option value="">Valfritt antal rum</option>
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
