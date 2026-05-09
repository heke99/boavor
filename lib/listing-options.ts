import type {
  CommercialType,
  InvestmentType,
  LandType,
  ListingCategory,
  ListingSegment,
  ListingType,
  ParkingType,
  PropertyType,
  StorageType,
} from '@/lib/types'

export const listingSegmentLabels: Record<ListingSegment, string> = {
  residential: 'Bostad',
  commercial: 'Lokal / kontor',
  parking: 'Parkering',
  storage: 'Förråd / lager',
  land: 'Mark / tomt',
  investment: 'Fastighet / investering',
}

export const listingCategoryLabels: Record<ListingCategory, string> = {
  all: 'Alla',
  residential: 'Bostäder',
  commercial: 'Lokaler',
  office: 'Kontor',
  parking: 'Parkering',
  storage: 'Förråd',
  investment: 'Fastigheter',
  land: 'Mark',
}

export const listingTypeLabels: Record<ListingType, string> = {
  rent: 'Hyra',
  sale: 'Till salu',
}

export const listingActionLabels: Record<ListingType, string> = {
  rent: 'Hyra ut',
  sale: 'Sälja',
}

export const propertyTypeLabels: Record<PropertyType, string> = {
  apartment: 'Lägenhet',
  house: 'Hus',
  property: 'Fastighet',
  commercial_space: 'Lokal',
  office: 'Kontor',
  parking_space: 'P-plats',
  garage: 'Garage',
  storage_unit: 'Förråd / lager',
  land_plot: 'Mark / tomt',
  investment_property: 'Investeringsfastighet',
}

export const commercialTypeLabels: Record<CommercialType, string> = {
  office: 'Kontor',
  retail: 'Butikslokal',
  restaurant: 'Restauranglokal',
  warehouse: 'Lager',
  industrial: 'Industrilokal',
  showroom: 'Showroom',
  clinic: 'Klinik / salong',
  workshop: 'Verkstad',
  other: 'Annan lokal',
}

export const parkingTypeLabels: Record<ParkingType, string> = {
  outdoor: 'Utomhusplats',
  garage: 'Garageplats',
  ev_charging: 'Laddplats',
  motorcycle: 'MC-plats',
  truck: 'Lastbilsparkering',
  other: 'Annan parkering',
}

export const storageTypeLabels: Record<StorageType, string> = {
  storage_unit: 'Förråd',
  warehouse_box: 'Lagerbox',
  mini_warehouse: 'Minilager',
  pallet_space: 'Pallplats',
  container: 'Container',
  other: 'Annat lager',
}

export const landTypeLabels: Record<LandType, string> = {
  land_plot: 'Tomt',
  industrial_land: 'Industrimark',
  agricultural_land: 'Jordbruksmark',
  development_land: 'Exploateringsmark',
  yard_space: 'Uppställningsyta',
  other: 'Annan mark',
}

export const investmentTypeLabels: Record<InvestmentType, string> = {
  rental_property: 'Hyresfastighet',
  commercial_property: 'Kommersiell fastighet',
  mixed_use_property: 'Blandfastighet',
  portfolio: 'Portfolio',
  project_property: 'Projektfastighet',
  other: 'Annat investeringsobjekt',
}

export const listingCategoryOptions: Array<{ value: ListingCategory; label: string }> = [
  { value: 'all', label: 'Alla' },
  { value: 'residential', label: 'Bostäder' },
  { value: 'commercial', label: 'Lokaler' },
  { value: 'office', label: 'Kontor' },
  { value: 'parking', label: 'Parkering' },
  { value: 'storage', label: 'Förråd' },
  { value: 'investment', label: 'Fastigheter' },
  { value: 'land', label: 'Mark' },
]

export function getDefaultPropertyType(segment: ListingSegment, commercialType?: CommercialType | null): PropertyType {
  if (segment === 'residential') return 'apartment'
  if (segment === 'commercial') return commercialType === 'office' ? 'office' : 'commercial_space'
  if (segment === 'parking') return 'parking_space'
  if (segment === 'storage') return 'storage_unit'
  if (segment === 'land') return 'land_plot'
  return 'investment_property'
}

export function getCategoryFromListing(segment: ListingSegment, commercialType?: CommercialType | null): ListingCategory {
  if (segment === 'commercial' && commercialType === 'office') return 'office'
  return segment
}

export function getListingPrimaryMeta(segment: ListingSegment, commercialType?: CommercialType | null) {
  if (segment === 'commercial') return commercialType === 'office' ? 'Kontor' : 'Lokal'
  if (segment === 'parking') return 'Parkering'
  if (segment === 'storage') return 'Förråd / lager'
  if (segment === 'land') return 'Mark / tomt'
  if (segment === 'investment') return 'Fastighet / investering'
  return 'Bostad'
}

export function isRentalApplicationListing(segment: ListingSegment, listingType: ListingType) {
  return segment === 'residential' && listingType === 'rent'
}
