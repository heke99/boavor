import { ListingGrid } from '@/components/listings/ListingGrid'
import { ListingFilters } from '@/components/listings/ListingFilters'
import { getPublishedListings } from '@/lib/data/listings'
import type {
  CommercialType,
  InvestmentType,
  LandType,
  ListingCategory,
  ParkingType,
  PropertyType,
  SearchFilters,
  StorageType,
} from '@/lib/types'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const validCategories: ListingCategory[] = ['all', 'residential', 'commercial', 'office', 'parking', 'storage', 'land', 'investment']
const validPropertyTypes: PropertyType[] = ['apartment', 'house', 'property', 'commercial_space', 'office', 'parking_space', 'garage', 'storage_unit', 'land_plot', 'investment_property']
const validCommercialTypes: CommercialType[] = ['office', 'retail', 'restaurant', 'warehouse', 'industrial', 'showroom', 'clinic', 'workshop', 'other']
const validParkingTypes: ParkingType[] = ['outdoor', 'garage', 'ev_charging', 'motorcycle', 'truck', 'other']
const validStorageTypes: StorageType[] = ['storage_unit', 'warehouse_box', 'mini_warehouse', 'pallet_space', 'container', 'other']
const validLandTypes: LandType[] = ['land_plot', 'industrial_land', 'agricultural_land', 'development_land', 'yard_space', 'other']
const validInvestmentTypes: InvestmentType[] = ['rental_property', 'commercial_property', 'mixed_use_property', 'portfolio', 'project_property', 'other']

function getString(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function getEnum<T extends string>(params: Record<string, string | string[] | undefined>, key: string, allowed: readonly T[]) {
  const value = getString(params, key)
  return value && allowed.includes(value as T) ? (value as T) : undefined
}

export default async function ListingsPage({ searchParams }: Props) {
  const params = await searchParams

  const filters: SearchFilters = {
    mode: getEnum(params, 'mode', ['rent', 'sale'] as const),
    category: getEnum(params, 'category', validCategories),
    city: getString(params, 'city'),
    maxPrice: getString(params, 'maxPrice'),
    minArea: getString(params, 'minArea'),
    maxArea: getString(params, 'maxArea'),
    availableFrom: getString(params, 'availableFrom'),
    propertyType: getEnum(params, 'propertyType', validPropertyTypes),
    commercialType: getEnum(params, 'commercialType', validCommercialTypes),
    parkingType: getEnum(params, 'parkingType', validParkingTypes),
    storageType: getEnum(params, 'storageType', validStorageTypes),
    landType: getEnum(params, 'landType', validLandTypes),
    investmentType: getEnum(params, 'investmentType', validInvestmentTypes),
    rooms: getString(params, 'rooms'),
    minRooms: getString(params, 'minRooms'),
    hasBalcony: getString(params, 'hasBalcony'),
    hasElevator: getString(params, 'hasElevator'),
    hasParking: getString(params, 'hasParking'),
    petsAllowed: getString(params, 'petsAllowed'),
    isVatApplicable: getString(params, 'isVatApplicable'),
    minLeaseMonths: getString(params, 'minLeaseMonths'),
    workplaces: getString(params, 'workplaces'),
    meetingRooms: getString(params, 'meetingRooms'),
    isFurnished: getString(params, 'isFurnished'),
    hasReception: getString(params, 'hasReception'),
    access247: getString(params, 'access247'),
    hasEvCharger: getString(params, 'hasEvCharger'),
    isGarage: getString(params, 'isGarage'),
    hasCameraSurveillance: getString(params, 'hasCameraSurveillance'),
    maxVehicleHeightCm: getString(params, 'maxVehicleHeightCm'),
    isHeated: getString(params, 'isHeated'),
    hasLoadingZone: getString(params, 'hasLoadingZone'),
    hasElevatorAccess: getString(params, 'hasElevatorAccess'),
    hasDetailPlan: getString(params, 'hasDetailPlan'),
    hasBuildingRights: getString(params, 'hasBuildingRights'),
    hasWaterSewer: getString(params, 'hasWaterSewer'),
    hasElectricity: getString(params, 'hasElectricity'),
    hasRoadAccess: getString(params, 'hasRoadAccess'),
    minLandArea: getString(params, 'minLandArea'),
    minUnits: getString(params, 'minUnits'),
    minNoi: getString(params, 'minNoi'),
    minCapRate: getString(params, 'minCapRate'),
    minOccupancyRate: getString(params, 'minOccupancyRate'),
    maxVacancyRate: getString(params, 'maxVacancyRate'),
    sort: getEnum(params, 'sort', ['newest', 'price_asc', 'price_desc', 'area_desc'] as const),
  }

  const activeFiltersCount = Object.values(filters).filter(Boolean).length
  const listings = await getPublishedListings(filters)

  return (
    <section className="container-shell py-12">
      <div className="relative overflow-hidden rounded-[42px] bg-[linear-gradient(135deg,#101228,#243b8f)] p-8 text-white shadow-[0_28px_90px_rgba(15,23,42,0.18)] md:p-12">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#5eead4]/20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-[#5b3df5]/28 blur-3xl" />
        <div className="relative max-w-3xl">
          <div className="inline-flex rounded-full border border-white/16 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/82">
            Sök hela Bovaro
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] md:text-6xl">Sök bostäder, lokaler och fastigheter</h1>
          <p className="mt-5 text-base leading-8 text-white/78 md:text-lg">
            Filtrera bland hyresbostäder, objekt till salu, kontor, lokaler, parkering, förråd, mark och investeringsfastigheter.
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-[34px] border border-white/70 bg-white/88 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <ListingFilters />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-[#6b7280]">
          <span className="font-semibold text-[#111827]">{listings.length}</span> träffar
          {activeFiltersCount ? <span> · {activeFiltersCount} aktiva filter</span> : null}
        </div>
        <div className="rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-semibold text-[#9a5b00]">
          Bostäder + kommersiella objekt
        </div>
      </div>

      <div className="mt-8">
        <ListingGrid listings={listings} />
      </div>
    </section>
  )
}
