#!/usr/bin/env node
/**
 * Demo mode: seeds (or fully resets) a self-contained demo environment for
 * sales demos — a demo landlord company with properties, units and published
 * listings, plus a demo seeker with queue points. All rows are tagged with
 * the demo- prefix so the reset never touches real data.
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_PASSWORD
 *
 * Run: node scripts/demo-reset.mjs
 * NEVER run against production.
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const password = process.env.DEMO_PASSWORD

if (!url || !serviceKey || !password || password.length < 8) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DEMO_PASSWORD (min 8 chars).')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

const DEMO_LANDLORD_EMAIL = 'demo-hyresvard@bovaro.test'
const DEMO_SEEKER_EMAIL = 'demo-sokande@bovaro.test'

async function findUser(email) {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 200 })
  if (error) throw error
  return data.users.find((user) => user.email === email) ?? null
}

async function ensureUser(email, meta) {
  let user = await findUser(email)
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: meta,
    })
    if (error) throw error
    user = data.user
    console.log(`created ${email}`)
  } else {
    await supabase.auth.admin.updateUserById(user.id, { password })
    console.log(`exists  ${email}`)
  }
  return user
}

// --- 1. Reset: remove previous demo data (tagged rows only) -----------------

console.log('Resetting previous demo data…')
await supabase.from('listings').delete().like('slug', 'demo-%')
const { data: demoProperties } = await supabase.from('properties').select('id').like('name', 'Demo %')
if (demoProperties?.length) {
  const ids = demoProperties.map((property) => property.id)
  await supabase.from('units').delete().in('property_id', ids)
  await supabase.from('properties').delete().in('id', ids)
}

// --- 2. Users and company ----------------------------------------------------

const landlord = await ensureUser(DEMO_LANDLORD_EMAIL, {
  account_type: 'company',
  first_name: 'Demo',
  last_name: 'Hyresvärd',
  company_name: 'Demo Fastigheter AB',
})
const seeker = await ensureUser(DEMO_SEEKER_EMAIL, {
  account_type: 'private',
  first_name: 'Demo',
  last_name: 'Sökande',
})

await supabase.from('profiles').update({ role: 'landlord', identity_verified_at: null }).eq('id', landlord.id)
await supabase
  .from('profiles')
  .update({ role: 'seeker', identity_verified_at: new Date().toISOString() })
  .eq('id', seeker.id)

const { data: membership } = await supabase
  .from('company_members')
  .select('company_id')
  .eq('user_id', landlord.id)
  .limit(1)
  .maybeSingle()
const companyId = membership?.company_id
if (!companyId) {
  console.error('Demo landlord has no company (signup trigger should create one). Aborting.')
  process.exit(1)
}
await supabase.from('companies').update({ name: 'Demo Fastigheter AB', verification_status: 'verified' }).eq('id', companyId)

// --- 3. Properties, units, listings ------------------------------------------

const { data: property } = await supabase
  .from('properties')
  .insert({ company_id: companyId, name: 'Demo Kvarteret Björken', street: 'Demovägen 1', city: 'Stockholm' })
  .select('id')
  .single()

const units = [
  { unit_number: '1101', rooms: 1, area_sqm: 32, base_rent: 7200, floor: '1' },
  { unit_number: '1201', rooms: 2, area_sqm: 54, base_rent: 9800, floor: '2' },
  { unit_number: '1301', rooms: 3, area_sqm: 71, base_rent: 12400, floor: '3' },
]
await supabase.from('units').insert(units.map((unit) => ({ ...unit, property_id: property.id })))

const listings = [
  { slug: 'demo-1a-vasastan', title: 'Demo: Ljus 1:a i Vasastan', rooms: 1, area_sqm: 32, price: 7200 },
  { slug: 'demo-2a-sodermalm', title: 'Demo: 2:a med balkong på Södermalm', rooms: 2, area_sqm: 54, price: 9800 },
  { slug: 'demo-3a-kungsholmen', title: 'Demo: Rymlig 3:a på Kungsholmen', rooms: 3, area_sqm: 71, price: 12400 },
]
for (const listing of listings) {
  await supabase.from('listings').insert({
    ...listing,
    description: 'Demoannons för säljdemo. Ansökningar hanteras inte.',
    listing_type: 'rent',
    listing_segment: 'residential',
    property_type: 'apartment',
    status: 'published',
    published_at: new Date().toISOString(),
    city: 'Stockholm',
    company_id: companyId,
    created_by: landlord.id,
  })
}

// --- 4. Queue points for the demo seeker --------------------------------------

await supabase
  .from('queue_memberships')
  .upsert(
    {
      user_id: seeker.id,
      membership_status: 'active',
      joined_queue_at: new Date(Date.now() - 240 * 86_400_000).toISOString(),
      current_points: 240,
    },
    { onConflict: 'user_id' },
  )

console.log('\nDemo environment ready:')
console.log(`  landlord: ${DEMO_LANDLORD_EMAIL} / $DEMO_PASSWORD  (workspace: /landlord)`)
console.log(`  seeker:   ${DEMO_SEEKER_EMAIL} / $DEMO_PASSWORD  (queue: 240 points)`)
console.log('  3 published demo listings (slug prefix demo-)')
console.log('\nRe-run this script any time to reset the demo.')
