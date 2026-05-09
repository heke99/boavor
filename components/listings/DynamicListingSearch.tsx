'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import {
  commercialTypeLabels,
  investmentTypeLabels,
  landTypeLabels,
  listingCategoryOptions,
  parkingTypeLabels,
  propertyTypeLabels,
  storageTypeLabels,
} from '@/lib/listing-options'
import type {
  CommercialType,
  InvestmentType,
  LandType,
  ListingCategory,
  ListingType,
  ParkingType,
  PropertyType,
  StorageType,
} from '@/lib/types'

type Props = {
  compact?: boolean
}

type FieldConfig = {
  key: string
  label: string
  type: 'input' | 'number' | 'date' | 'select' | 'boolean'
  placeholder?: string
  options?: Array<{ value: string; label: string }>
}

const residentialTypes: PropertyType[] = ['apartment', 'house', 'property']
const commercialTypes = Object.keys(commercialTypeLabels) as CommercialType[]
const parkingTypes = Object.keys(parkingTypeLabels) as ParkingType[]
const storageTypes = Object.keys(storageTypeLabels) as StorageType[]
const landTypes = Object.keys(landTypeLabels) as LandType[]
const investmentTypes = (Object.keys(investmentTypeLabels) as InvestmentType[]).filter((type) => type !== 'project_property')

function labelForCategory(category: ListingCategory) {
  return listingCategoryOptions.find((option) => option.value === category)?.label ?? 'Alla'
}

function getFields(category: ListingCategory, mode: ListingType | ''): FieldConfig[] {
  const priceLabel = mode === 'sale' ? 'Max pris' : 'Max hyra'

  if (category === 'commercial' || category === 'office') {
    return [
      category === 'commercial'
        ? {
            key: 'commercialType',
            label: 'Lokaltyp',
            type: 'select',
            options: commercialTypes
              .filter((type) => type !== 'office')
              .map((type) => ({ value: type, label: commercialTypeLabels[type] })),
          }
        : { key: 'commercialType', label: 'Lokaltyp', type: 'select', options: [{ value: 'office', label: 'Kontor' }] },
      { key: 'minArea', label: 'Min kvm', type: 'number', placeholder: 'Ex: 80' },
      { key: 'maxArea', label: 'Max kvm', type: 'number', placeholder: 'Ex: 500' },
      { key: 'maxPrice', label: priceLabel, type: 'number', placeholder: mode === 'sale' ? 'Ex: 9000000' : 'Ex: 35000' },
      { key: 'availableFrom', label: 'Tillträde från', type: 'date' },
      { key: 'isVatApplicable', label: 'Momspliktig hyra', type: 'boolean' },
      { key: 'minLeaseMonths', label: 'Min avtalstid', type: 'number', placeholder: 'Månader' },
      { key: 'workplaces', label: 'Arbetsplatser', type: 'number', placeholder: 'Ex: 10' },
      { key: 'meetingRooms', label: 'Mötesrum', type: 'number', placeholder: 'Ex: 2' },
      { key: 'isFurnished', label: 'Möblerat', type: 'boolean' },
      { key: 'hasReception', label: 'Reception', type: 'boolean' },
      { key: 'access247', label: '24/7 tillgång', type: 'boolean' },
    ]
  }

  if (category === 'parking') {
    return [
      { key: 'parkingType', label: 'Parkeringstyp', type: 'select', options: parkingTypes.map((type) => ({ value: type, label: parkingTypeLabels[type] })) },
      { key: 'maxPrice', label: priceLabel, type: 'number', placeholder: 'Ex: 2500' },
      { key: 'hasEvCharger', label: 'Laddbox', type: 'boolean' },
      { key: 'isGarage', label: 'Garage', type: 'boolean' },
      { key: 'access247', label: '24/7 tillgång', type: 'boolean' },
      { key: 'hasCameraSurveillance', label: 'Kameraövervakning', type: 'boolean' },
      { key: 'maxVehicleHeightCm', label: 'Min maxhöjd cm', type: 'number', placeholder: 'Ex: 210' },
    ]
  }

  if (category === 'storage') {
    return [
      { key: 'storageType', label: 'Typ', type: 'select', options: storageTypes.map((type) => ({ value: type, label: storageTypeLabels[type] })) },
      { key: 'minArea', label: 'Min kvm', type: 'number', placeholder: 'Ex: 5' },
      { key: 'maxArea', label: 'Max kvm', type: 'number', placeholder: 'Ex: 100' },
      { key: 'maxPrice', label: priceLabel, type: 'number', placeholder: 'Ex: 4000' },
      { key: 'isHeated', label: 'Uppvärmt', type: 'boolean' },
      { key: 'access247', label: '24/7 tillgång', type: 'boolean' },
      { key: 'hasCameraSurveillance', label: 'Kameraövervakning', type: 'boolean' },
      { key: 'hasLoadingZone', label: 'Lastzon', type: 'boolean' },
      { key: 'hasElevatorAccess', label: 'Hiss/lyft', type: 'boolean' },
    ]
  }

  if (category === 'land') {
    return [
      { key: 'landType', label: 'Marktyp', type: 'select', options: landTypes.map((type) => ({ value: type, label: landTypeLabels[type] })) },
      { key: 'minLandArea', label: 'Min tomtyta', type: 'number', placeholder: 'Ex: 1000' },
      { key: 'maxPrice', label: priceLabel, type: 'number', placeholder: 'Ex: 5000000' },
      { key: 'hasDetailPlan', label: 'Detaljplan', type: 'boolean' },
      { key: 'hasBuildingRights', label: 'Byggrätt', type: 'boolean' },
      { key: 'hasWaterSewer', label: 'VA finns', type: 'boolean' },
      { key: 'hasElectricity', label: 'El finns', type: 'boolean' },
      { key: 'hasRoadAccess', label: 'Väganslutning', type: 'boolean' },
    ]
  }

  if (category === 'investment') {
    return [
      { key: 'investmentType', label: 'Fastighetstyp', type: 'select', options: investmentTypes.map((type) => ({ value: type, label: investmentTypeLabels[type] })) },
      { key: 'maxPrice', label: 'Max pris', type: 'number', placeholder: 'Ex: 25000000' },
      { key: 'minUnits', label: 'Min units', type: 'number', placeholder: 'Ex: 6' },
      { key: 'minArea', label: 'Min kvm', type: 'number', placeholder: 'Ex: 500' },
      { key: 'minNoi', label: 'Min NOI', type: 'number', placeholder: 'Ex: 1000000' },
      { key: 'minCapRate', label: 'Min cap rate %', type: 'number', placeholder: 'Ex: 5.5' },
      { key: 'minOccupancyRate', label: 'Min uthyrningsgrad %', type: 'number', placeholder: 'Ex: 90' },
      { key: 'maxVacancyRate', label: 'Max vakansgrad %', type: 'number', placeholder: 'Ex: 10' },
    ]
  }

  return [
    { key: 'propertyType', label: 'Bostadstyp', type: 'select', options: residentialTypes.map((type) => ({ value: type, label: propertyTypeLabels[type] })) },
    { key: 'rooms', label: 'Antal rum', type: 'select', options: ['1', '2', '3', '4', '5'].map((rooms) => ({ value: rooms, label: `${rooms}+ rum` })) },
    { key: 'minArea', label: 'Min kvm', type: 'number', placeholder: 'Ex: 45' },
    { key: 'maxPrice', label: priceLabel, type: 'number', placeholder: mode === 'sale' ? 'Ex: 4500000' : 'Ex: 15000' },
    { key: 'availableFrom', label: 'Inflytt från', type: 'date' },
    { key: 'hasBalcony', label: 'Balkong', type: 'boolean' },
    { key: 'hasElevator', label: 'Hiss', type: 'boolean' },
    { key: 'hasParking', label: 'Parkering', type: 'boolean' },
    { key: 'petsAllowed', label: 'Husdjur tillåtet', type: 'boolean' },
  ]
}

export function DynamicListingSearch({ compact = false }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [category, setCategory] = useState<ListingCategory>((searchParams.get('category') as ListingCategory) || 'residential')
  const [mode, setMode] = useState<ListingType | ''>((searchParams.get('mode') as ListingType) || '')
  const [city, setCity] = useState(searchParams.get('city') ?? '')

  const fields = useMemo(() => getFields(category, mode), [category, mode])
  const visibleFields = compact ? fields.slice(0, 2) : fields

  function submit(formData: FormData) {
    const params = new URLSearchParams()
    if (category && category !== 'all') params.set('category', category)
    if (mode) params.set('mode', mode)

    const cityValue = String(formData.get('city') ?? '').trim()
    if (cityValue) params.set('city', cityValue)

    fields.forEach((field) => {
      const value = String(formData.get(field.key) ?? '').trim()
      if (!value) return
      params.set(field.key, value)
    })

    const sort = String(formData.get('sort') ?? '').trim()
    if (sort && sort !== 'newest') params.set('sort', sort)

    router.push(`/listings?${params.toString()}`)
  }

  function resetCategory(nextCategory: ListingCategory) {
    setCategory(nextCategory)
  }

  return (
    <form action={submit} className="rounded-[30px] border border-[#e8ebf3] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] md:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
          <SlidersHorizontal size={17} />
          Dynamisk sökning
          <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#4338ca]">
            {labelForCategory(category)}
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {listingCategoryOptions.map((option) => {
            const active = category === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => resetCategory(option.value)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active ? 'bg-[#111827] !text-white' : 'bg-[#f3f4f6] text-[#111827] hover:bg-[#e9ecf3]'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#111827]">Hyra eller köpa</label>
            <Select value={mode} onChange={(event) => setMode(event.target.value as ListingType | '')} className="h-13 text-[#111827]">
              <option value="">Alla</option>
              <option value="rent">Hyra</option>
              <option value="sale">Köpa</option>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#111827]">Stad / område</label>
            <Input name="city" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Ex: Stockholm" className="h-13 text-[#111827]" />
          </div>

          {visibleFields.map((field) => (
            <DynamicField key={`${category}-${field.key}`} field={field} defaultValue={searchParams.get(field.key) ?? ''} />
          ))}

          {!compact ? (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#111827]">Sortering</label>
              <Select name="sort" defaultValue={searchParams.get('sort') ?? 'newest'} className="h-13 text-[#111827]">
                <option value="newest">Nyast först</option>
                <option value="price_asc">Billigast först</option>
                <option value="price_desc">Högst pris först</option>
                <option value="area_desc">Störst yta först</option>
              </Select>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f6] pt-4">
          <p className="text-sm leading-6 text-[#6b7280]">
            {category === 'residential'
              ? 'Bostad visar rum, kvm, inflytt och boendekrav.'
              : category === 'commercial' || category === 'office'
                ? 'Lokaler och kontor visar yta, moms, tillträde och arbetsplatsfilter.'
                : category === 'parking'
                  ? 'Parkering visar laddbox, garage, höjd och tillgång.'
                  : category === 'storage'
                    ? 'Förråd visar yta, uppvärmning, 24/7 och lastzon.'
                    : category === 'land'
                      ? 'Mark visar tomtyta, detaljplan, byggrätt, VA och el.'
                      : 'Fastigheter visar units, NOI, cap rate och uthyrningsgrad.'}
          </p>

          <div className="flex gap-2">
            <Button href="/listings" variant="ghost" className="border border-[#d7dbe7] !text-[#111827]">
              <X size={16} className="mr-2" />
              Rensa
            </Button>
            <Button type="submit" className="!text-white">
              <Search size={17} className="mr-2" />
              Sök
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}

function DynamicField({ field, defaultValue }: { field: FieldConfig; defaultValue: string }) {
  if (field.type === 'select') {
    return (
      <div className="space-y-2">
        <label className="text-sm font-semibold text-[#111827]">{field.label}</label>
        <Select name={field.key} defaultValue={defaultValue} className="h-13 text-[#111827]">
          <option value="">Alla</option>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
    )
  }

  if (field.type === 'boolean') {
    return (
      <label className="flex h-[74px] items-center gap-3 rounded-2xl border border-[#d7dbe7] bg-white px-4 text-sm font-semibold text-[#111827]">
        <input name={field.key} type="checkbox" value="true" defaultChecked={defaultValue === 'true'} className="h-4 w-4 accent-[#5b3df5]" />
        {field.label}
      </label>
    )
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-[#111827]">{field.label}</label>
      <Input
        name={field.key}
        type={field.type === 'input' ? 'text' : field.type}
        defaultValue={defaultValue}
        placeholder={field.placeholder}
        className="h-13 text-[#111827] placeholder:text-[#7a8396]"
      />
    </div>
  )
}
