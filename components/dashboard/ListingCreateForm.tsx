'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { CommercialType, ListingSegment, ListingType } from '@/lib/types'
import { listingActionLabels, listingSegmentLabels } from '@/lib/listing-options'

type Props = {
  action: (formData: FormData) => void | Promise<void>
}

const segmentOptions: Array<{ value: ListingSegment; label: string; help: string }> = [
  { value: 'residential', label: 'Bostad', help: 'Lägenhet, hus eller bostadsfastighet.' },
  { value: 'commercial', label: 'Lokal / kontor', help: 'Butik, restaurang, kontor, lager eller annan lokal.' },
  { value: 'parking', label: 'Parkering', help: 'P-plats, garage, laddplats eller företagsparkering.' },
  { value: 'storage', label: 'Förråd / lager', help: 'Förråd, lagerbox, minilager eller pallplats.' },
  { value: 'land', label: 'Mark / tomt', help: 'Tomt, mark, industrimark eller uppställningsyta.' },
  { value: 'investment', label: 'Fastighet / investeringsobjekt', help: 'Hyresfastighet, kommersiell fastighet eller portfolio.' },
]

export function ListingCreateForm({ action }: Props) {
  const [segment, setSegment] = useState<ListingSegment>('residential')
  const [listingType, setListingType] = useState<ListingType>('rent')
  const [commercialType, setCommercialType] = useState<CommercialType>('retail')

  const titlePlaceholder = useMemo(() => {
    if (segment === 'commercial') return commercialType === 'office' ? 'Ex: Modernt kontor nära centrum' : 'Ex: Butikslokal med skyltfönster'
    if (segment === 'parking') return 'Ex: Garageplats med laddbox'
    if (segment === 'storage') return 'Ex: Lagerbox med 24/7 tillgång'
    if (segment === 'land') return 'Ex: Industrimark med väganslutning'
    if (segment === 'investment') return 'Ex: Hyresfastighet med stabilt NOI'
    return 'Ex: Ljus 2:a nära vattnet'
  }, [commercialType, segment])

  return (
    <form action={action} className="mt-6 space-y-6">
      <div>
        <div className="text-sm font-semibold text-[#111827]">Vad vill du publicera?</div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {segmentOptions.map((option) => {
            const active = segment === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSegment(option.value)}
                className={`rounded-3xl border p-4 text-left transition ${
                  active ? 'border-[#5b3df5] bg-[#f4f2ff] shadow-[0_14px_34px_rgba(91,61,245,0.12)]' : 'border-black/8 bg-white hover:bg-[#f8fafc]'
                }`}
              >
                <div className="font-semibold text-[#111827]">{option.label}</div>
                <p className="mt-2 text-sm leading-6 text-[#6b7280]">{option.help}</p>
              </button>
            )
          })}
        </div>
      </div>

      <input type="hidden" name="listingSegment" value={segment} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[#111827]">Vill du hyra ut eller sälja?</label>
          <Select name="listingType" value={listingType} onChange={(e) => setListingType(e.target.value as ListingType)}>
            <option value="rent">Hyra ut</option>
            <option value="sale">Sälja</option>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-1 xl:col-span-2">
          <label className="text-sm font-semibold text-[#111827]">Titel</label>
          <Input name="title" placeholder={titlePlaceholder} required />
        </div>

        {segment === 'residential' ? (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#111827]">Bostadstyp</label>
            <Select name="propertyType" defaultValue="apartment">
              <option value="apartment">Lägenhet</option>
              <option value="house">Hus</option>
              <option value="property">Fastighet</option>
            </Select>
          </div>
        ) : null}

        {segment === 'commercial' ? (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#111827]">Lokaltyp</label>
            <Select name="commercialType" value={commercialType} onChange={(e) => setCommercialType(e.target.value as CommercialType)}>
              <option value="retail">Butikslokal</option>
              <option value="office">Kontor</option>
              <option value="restaurant">Restauranglokal</option>
              <option value="warehouse">Lager</option>
              <option value="industrial">Industrilokal</option>
              <option value="showroom">Showroom</option>
              <option value="clinic">Klinik / salong</option>
              <option value="workshop">Verkstad</option>
              <option value="other">Annan lokal</option>
            </Select>
          </div>
        ) : null}

        {segment === 'parking' ? (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#111827]">Parkeringstyp</label>
            <Select name="parkingType" defaultValue="outdoor">
              <option value="outdoor">Utomhusplats</option>
              <option value="garage">Garageplats</option>
              <option value="ev_charging">Laddplats</option>
              <option value="motorcycle">MC-plats</option>
              <option value="truck">Lastbilsparkering</option>
              <option value="other">Annan parkering</option>
            </Select>
          </div>
        ) : null}

        {segment === 'storage' ? (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#111827]">Förråd/lager-typ</label>
            <Select name="storageType" defaultValue="storage_unit">
              <option value="storage_unit">Förråd</option>
              <option value="warehouse_box">Lagerbox</option>
              <option value="mini_warehouse">Minilager</option>
              <option value="pallet_space">Pallplats</option>
              <option value="container">Container</option>
              <option value="other">Annat lager</option>
            </Select>
          </div>
        ) : null}

        {segment === 'land' ? (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#111827]">Marktyp</label>
            <Select name="landType" defaultValue="land_plot">
              <option value="land_plot">Tomt</option>
              <option value="industrial_land">Industrimark</option>
              <option value="agricultural_land">Jordbruksmark</option>
              <option value="development_land">Exploateringsmark</option>
              <option value="yard_space">Uppställningsyta</option>
              <option value="other">Annan mark</option>
            </Select>
          </div>
        ) : null}

        {segment === 'investment' ? (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#111827]">Fastighetstyp</label>
            <Select name="investmentType" defaultValue="rental_property">
              <option value="rental_property">Hyresfastighet</option>
              <option value="commercial_property">Kommersiell fastighet</option>
              <option value="mixed_use_property">Blandfastighet</option>
              <option value="portfolio">Portfolio</option>
              <option value="project_property">Projektfastighet</option>
              <option value="other">Annat investeringsobjekt</option>
            </Select>
          </div>
        ) : null}

        <Input name="city" placeholder="Stad" required />
        <Input name="areaName" placeholder="Område" />
        <Input name="street" placeholder="Adress" />
        <Input name="zipCode" placeholder="Postnummer" />
        <Input name="price" placeholder={listingType === 'rent' ? 'Hyra per månad' : 'Pris'} type="number" required />
        <Input name="areaSqm" placeholder={segment === 'land' ? 'Markyta m²' : 'Yta m²'} type="number" step="0.1" />

        {segment === 'residential' ? <Input name="rooms" placeholder="Rum" type="number" step="0.5" /> : null}

        {segment !== 'residential' ? (
          <>
            <Input name="minLeaseMonths" placeholder="Minsta avtalstid, månader" type="number" />
            <Input name="monthlyServiceFee" placeholder="Service/driftavgift per månad" type="number" />
            <Select name="isVatApplicable" defaultValue="false">
              <option value="false">Ej momspliktig / ej angivet</option>
              <option value="true">Momspliktig</option>
            </Select>
          </>
        ) : null}

        {segment === 'investment' ? (
          <>
            <Input name="annualIncome" placeholder="Årliga hyresintäkter" type="number" />
            <Input name="operatingCost" placeholder="Driftkostnader per år" type="number" />
            <Input name="capRate" placeholder="Direktavkastning %" type="number" step="0.01" />
          </>
        ) : null}

        <Input name="availableFrom" placeholder="Tillgänglig från (YYYY-MM-DD)" />
        <Input name="imageUrl" placeholder="Bild-URL" />
        <Input name="features" placeholder="Egenskaper, separera med kommatecken" className="md:col-span-2 xl:col-span-3" />

        <textarea
          name="description"
          rows={5}
          placeholder="Beskriv objektet"
          className="md:col-span-2 xl:col-span-3 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[rgba(91,61,245,0.12)]"
        />

        <Select name="status" defaultValue="draft">
          <option value="draft">Utkast</option>
          <option value="published">Publicera direkt</option>
        </Select>

        {segment === 'residential' && listingType === 'rent' ? (
          <>
            <Input name="minIncome" type="number" placeholder="Minsta inkomst för hyra" />
            <Select name="petsAllowed" defaultValue="true">
              <option value="true">Husdjur tillåtna</option>
              <option value="false">Husdjur ej tillåtna</option>
            </Select>
            <Select name="employmentRequired" defaultValue="false">
              <option value="false">Anställning ej krav</option>
              <option value="true">Anställning krävs</option>
            </Select>
            <Select name="referencesRequired" defaultValue="false">
              <option value="false">Referenser ej krav</option>
              <option value="true">Referenser krävs</option>
            </Select>
          </>
        ) : null}
      </div>

      <div className="rounded-3xl bg-[#f8fafc] p-5 text-sm leading-7 text-[#5b6475]">
        <strong className="text-[#111827]">Valt flöde:</strong> {listingSegmentLabels[segment]} · {listingActionLabels[listingType]}. Bostäder för hyra använder ansökan. Lokaler, kontor, parkering, förråd, mark, försäljning och investeringsobjekt använder intresseanmälningar/leads.
      </div>

      <div className="flex justify-end">
        <Button type="submit">Spara objekt</Button>
      </div>
    </form>
  )
}
