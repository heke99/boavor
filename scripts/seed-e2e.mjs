#!/usr/bin/env node
/**
 * Seeds dedicated E2E test accounts and minimal fixtures.
 *
 * Requires (never commit these):
 *   NEXT_PUBLIC_SUPABASE_URL   – project URL
 *   SUPABASE_SERVICE_ROLE_KEY  – service role key (admin API)
 *   E2E_SEED_PASSWORD          – password for all test accounts (min 8 chars)
 *
 * Creates, idempotently:
 *   e2e-seeker@bovaro.test   – verified seeker profile
 *   e2e-landlord@bovaro.test – landlord with a published test listing
 *   e2e-admin@bovaro.test    – super_admin
 *
 * Run: node scripts/seed-e2e.mjs
 * Then export E2E_SEEKER_EMAIL / E2E_SEEKER_PASSWORD (etc.) and run
 * `npm run test:e2e`.
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const password = process.env.E2E_SEED_PASSWORD

if (!url || !serviceKey || !password) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or E2E_SEED_PASSWORD.')
  process.exit(1)
}
if (password.length < 8) {
  console.error('E2E_SEED_PASSWORD must be at least 8 characters.')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

const ACCOUNTS = [
  { email: 'e2e-seeker@bovaro.test', role: 'seeker', accountType: 'private', firstName: 'E2E', lastName: 'Sökande' },
  { email: 'e2e-landlord@bovaro.test', role: 'landlord', accountType: 'company', firstName: 'E2E', lastName: 'Hyresvärd' },
  { email: 'e2e-admin@bovaro.test', role: 'super_admin', accountType: 'private', firstName: 'E2E', lastName: 'Admin' },
]

async function findUserByEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 200 })
  if (error) throw error
  return data.users.find((user) => user.email === email) ?? null
}

async function ensureUser(account) {
  let user = await findUserByEmail(account.email)
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: account.email,
      password,
      email_confirm: true,
      user_metadata: {
        account_type: account.accountType,
        first_name: account.firstName,
        last_name: account.lastName,
      },
    })
    if (error) throw error
    user = data.user
    console.log(`created ${account.email}`)
  } else {
    const { error } = await supabase.auth.admin.updateUserById(user.id, { password })
    if (error) throw error
    console.log(`exists  ${account.email} (password reset)`)
  }

  // Role can only be set via service role / super admin (DB trigger enforced).
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role: account.role, first_name: account.firstName, last_name: account.lastName })
    .eq('id', user.id)
  if (profileError) throw profileError

  return user
}

async function ensureListing(landlordId) {
  const slug = 'e2e-testlagenhet-stockholm'
  const { data: existing } = await supabase.from('listings').select('id').eq('slug', slug).maybeSingle()
  if (existing) {
    console.log('exists  test listing')
    return existing.id
  }

  const { data, error } = await supabase
    .from('listings')
    .insert({
      slug,
      title: 'E2E Testlägenhet i Stockholm',
      description: 'Testannons för automatiska E2E-flöden. Publiceras aldrig i produktion med riktiga uppgifter.',
      listing_type: 'rent',
      listing_segment: 'residential',
      property_type: 'apartment',
      status: 'published',
      published_at: new Date().toISOString(),
      city: 'Stockholm',
      area_name: 'Södermalm',
      street: 'Testgatan 1',
      price: 12000,
      rooms: 2,
      area_sqm: 55,
      created_by: landlordId,
    })
    .select('id')
    .single()
  if (error) throw error
  console.log('created test listing')
  return data.id
}

const seeker = await ensureUser(ACCOUNTS[0])
const landlord = await ensureUser(ACCOUNTS[1])
await ensureUser(ACCOUNTS[2])
await ensureListing(landlord.id)

// Verified identity for the seeker so apply flows are reachable.
const { error: identityError } = await supabase
  .from('profiles')
  .update({ identity_verified_at: new Date().toISOString() })
  .eq('id', seeker.id)
if (identityError) throw identityError

console.log('\nSeed complete. Export these for Playwright:')
for (const account of ACCOUNTS) {
  const prefix = account.role === 'super_admin' ? 'E2E_ADMIN' : account.role === 'landlord' ? 'E2E_LANDLORD' : 'E2E_SEEKER'
  console.log(`  ${prefix}_EMAIL=${account.email}`)
  console.log(`  ${prefix}_PASSWORD=$E2E_SEED_PASSWORD`)
}
