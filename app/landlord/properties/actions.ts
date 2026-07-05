'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireLandlordAccess } from '@/lib/data/landlord'
import { parseUnitsCsv } from '@/lib/import/units-csv'

export async function createPropertyAction(formData: FormData) {
  const { supabase, user, companyIds } = await requireLandlordAccess()

  const name = String(formData.get('name') ?? '').trim()
  const city = String(formData.get('city') ?? '').trim()
  if (!name || !city) return

  const companyId = String(formData.get('companyId') ?? '').trim()
  const useCompany = companyId && companyIds.includes(companyId)

  await supabase.from('properties').insert({
    name,
    city,
    street: String(formData.get('street') ?? '').trim() || null,
    zip_code: String(formData.get('zipCode') ?? '').trim() || null,
    area_name: String(formData.get('areaName') ?? '').trim() || null,
    description: String(formData.get('description') ?? '').trim() || null,
    company_id: useCompany ? companyId : null,
    owner_user_id: useCompany ? null : user.id,
  })

  revalidatePath('/landlord/properties')
}

export async function createUnitAction(formData: FormData) {
  const { supabase } = await requireLandlordAccess()

  const propertyId = String(formData.get('propertyId') ?? '')
  const unitNumber = String(formData.get('unitNumber') ?? '').trim()
  if (!propertyId || !unitNumber) return

  // RLS validates property ownership on insert.
  const { error } = await supabase.from('units').insert({
    property_id: propertyId,
    unit_number: unitNumber,
    floor: String(formData.get('floor') ?? '').trim() || null,
    rooms: Number(formData.get('rooms') ?? 0) || null,
    area_sqm: Number(formData.get('areaSqm') ?? 0) || null,
    base_rent: Number(formData.get('baseRent') ?? 0) || null,
    has_balcony: formData.get('hasBalcony') === 'on',
    has_accessibility: formData.get('hasAccessibility') === 'on',
  })

  if (error) console.error('Failed to create unit', error)

  revalidatePath('/landlord/properties')
}

export async function deleteUnitAction(formData: FormData) {
  const { supabase } = await requireLandlordAccess()
  const unitId = String(formData.get('unitId') ?? '')
  if (!unitId) return

  await supabase.from('units').delete().eq('id', unitId)
  revalidatePath('/landlord/properties')
}

/** CSV bulk import of units into a property. */
export async function importUnitsAction(formData: FormData) {
  const { supabase } = await requireLandlordAccess()

  const propertyId = String(formData.get('propertyId') ?? '')
  if (!propertyId) return

  const file = formData.get('file')
  let content = ''
  if (file instanceof File && file.size > 0) {
    if (file.size > 1024 * 1024) {
      redirect(`/landlord/properties?import=too_large`)
    }
    content = await file.text()
  } else {
    content = String(formData.get('csvContent') ?? '')
  }

  if (!content.trim()) {
    redirect(`/landlord/properties?import=empty`)
  }

  const { rows, errors } = parseUnitsCsv(content)

  let imported = 0
  if (rows.length > 0) {
    const { error, data } = await supabase
      .from('units')
      .insert(
        rows.map((row) => ({
          property_id: propertyId,
          unit_number: row.unitNumber,
          floor: row.floor,
          rooms: row.rooms,
          area_sqm: row.areaSqm,
          base_rent: row.baseRent,
        })),
      )
      .select('id')

    if (error) {
      console.error('Unit import failed', error)
      redirect(`/landlord/properties?import=failed`)
    }
    imported = data?.length ?? 0
  }

  revalidatePath('/landlord/properties')
  redirect(`/landlord/properties?import=done&imported=${imported}&skipped=${errors.length}`)
}

/** Creates a draft listing prefilled from a unit. */
export async function createListingFromUnitAction(formData: FormData) {
  const { supabase, user } = await requireLandlordAccess()
  const unitId = String(formData.get('unitId') ?? '')
  if (!unitId) return

  const { data: unit } = await supabase
    .from('units')
    .select('id, unit_number, floor, rooms, area_sqm, base_rent, has_balcony, has_accessibility, property_id, properties(id, name, street, zip_code, city, area_name, company_id, owner_user_id)')
    .eq('id', unitId)
    .maybeSingle()

  if (!unit) return
  const property = unit.properties as unknown as {
    id: string
    name: string
    street: string | null
    zip_code: string | null
    city: string
    area_name: string | null
    company_id: string | null
    owner_user_id: string | null
  } | null
  if (!property) return

  const title = `${property.name} – lgh ${unit.unit_number}`
  const slugBase = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
  const slug = `${slugBase}-${Date.now().toString(36)}`

  const { data: listing, error } = await supabase
    .from('listings')
    .insert({
      title,
      slug,
      listing_type: 'rent',
      listing_purpose: 'rent',
      listing_segment: 'residential',
      property_type: 'apartment',
      status: 'draft',
      street: property.street,
      zip_code: property.zip_code,
      city: property.city,
      area_name: property.area_name,
      price: unit.base_rent ?? 0,
      rooms: unit.rooms,
      area_sqm: unit.area_sqm,
      floor: unit.floor,
      has_balcony: unit.has_balcony,
      has_accessibility: unit.has_accessibility,
      unit_id: unit.id,
      company_id: property.company_id,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error || !listing) {
    console.error('Failed to create listing from unit', error)
    return
  }

  await supabase.from('units').update({ status: 'listed' }).eq('id', unit.id)

  redirect(`/dashboard/listings/${listing.id}/edit`)
}
