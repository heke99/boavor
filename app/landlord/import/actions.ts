'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireLandlordAccess } from '@/lib/data/landlord'
import {
  applyMapping,
  findPiiColumns,
  parseCsv,
  suggestMapping,
  type MigrationField,
} from '@/lib/import/migration-csv'
import type { Json } from '@/lib/supabase/database.types'

const FIELDS: MigrationField[] = [
  'property_name',
  'street',
  'zip_code',
  'city',
  'unit_number',
  'floor',
  'rooms',
  'area_sqm',
  'base_rent',
  'ignore',
]

export async function createMigrationProjectAction(formData: FormData) {
  const context = await requireLandlordAccess()
  const { supabase, user, primaryCompanyId } = context

  const name = String(formData.get('name') ?? '').trim()
  const sourceLabel = String(formData.get('sourceLabel') ?? '').trim() || null
  const file = formData.get('file')
  const pasted = String(formData.get('csv') ?? '')
  const content = file instanceof File && file.size > 0 ? await file.text() : pasted

  if (!name) redirect('/landlord/import?error=name_required')
  if (!content.trim()) redirect('/landlord/import?error=csv_required')

  const parsed = parseCsv(content)
  if ('error' in parsed) {
    redirect(`/landlord/import?error=parse&detail=${encodeURIComponent(parsed.error)}`)
  }

  // Privacy gate: refuse files containing tenant PII columns.
  const piiColumns = findPiiColumns(parsed.headers)
  if (piiColumns.length > 0) {
    redirect(
      `/landlord/import?error=pii&detail=${encodeURIComponent(piiColumns.map((violation) => violation.header).join(', '))}`,
    )
  }

  const { data: project, error } = await supabase
    .from('migration_projects')
    .insert({
      company_id: primaryCompanyId,
      owner_user_id: primaryCompanyId ? null : user.id,
      name,
      source_label: sourceLabel,
      raw_csv: content,
      headers: parsed.headers as unknown as Json,
      mapping: suggestMapping(parsed.headers) as unknown as Json,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error || !project) {
    console.error('Failed to create migration project', error)
    redirect('/landlord/import?error=failed')
  }

  revalidatePath('/landlord/import')
  redirect(`/landlord/import/${project.id}`)
}

export async function updateMappingAction(formData: FormData) {
  const { supabase } = await requireLandlordAccess()
  const projectId = String(formData.get('projectId') ?? '')
  if (!projectId) return

  const { data: project } = await supabase
    .from('migration_projects')
    .select('id, headers, status')
    .eq('id', projectId)
    .maybeSingle()
  if (!project || project.status === 'imported') return

  const headers = (project.headers as string[]) ?? []
  const mapping: Record<string, MigrationField> = {}
  for (const header of headers) {
    const value = String(formData.get(`map:${header}`) ?? 'ignore') as MigrationField
    mapping[header] = FIELDS.includes(value) ? value : 'ignore'
  }

  await supabase
    .from('migration_projects')
    .update({ mapping: mapping as unknown as Json, status: 'draft' })
    .eq('id', projectId)

  revalidatePath(`/landlord/import/${projectId}`)
  redirect(`/landlord/import/${projectId}?saved=1`)
}

/** Dry run: validates everything and records per-row outcomes — writes nothing to properties/units. */
export async function runDryRunAction(formData: FormData) {
  const { supabase, user } = await requireLandlordAccess()
  const projectId = String(formData.get('projectId') ?? '')
  if (!projectId) return

  const { data: project } = await supabase
    .from('migration_projects')
    .select('id, raw_csv, mapping, status')
    .eq('id', projectId)
    .maybeSingle()
  if (!project || project.status === 'imported') return

  const parsed = parseCsv(project.raw_csv)
  if ('error' in parsed) redirect(`/landlord/import/${projectId}?error=parse`)

  const result = applyMapping(parsed, project.mapping as Record<string, MigrationField>)

  const { data: run } = await supabase
    .from('migration_runs')
    .insert({ project_id: projectId, run_type: 'dry_run', created_by: user.id })
    .select('id')
    .single()

  // Reset previous evaluation before writing this run's outcome.
  await supabase.from('migration_items').delete().eq('project_id', projectId)

  const items = [
    ...result.rows.map((row) => ({
      project_id: projectId,
      run_id: run?.id ?? null,
      row_number: row.rowNumber,
      entity_type: 'unit',
      source_row: JSON.parse(JSON.stringify(row)) as Json,
      status: 'valid',
    })),
    ...result.errors
      .filter((error) => error.rowNumber > 0)
      .map((error) => ({
        project_id: projectId,
        run_id: run?.id ?? null,
        row_number: error.rowNumber,
        entity_type: 'unit',
        source_row: {} as Json,
        status: 'error',
        error: error.message,
      })),
  ]
  if (items.length > 0) {
    await supabase.from('migration_items').insert(items)
  }

  const stats = {
    valid_rows: result.rows.length,
    error_rows: result.errors.filter((error) => error.rowNumber > 0).length,
    mapping_errors: result.errors.filter((error) => error.rowNumber === 0).map((error) => error.message),
    properties: result.propertyNames.length,
  }

  if (run) {
    await supabase
      .from('migration_runs')
      .update({ status: 'completed', stats: stats as unknown as Json, finished_at: new Date().toISOString() })
      .eq('id', run.id)
  }
  await supabase.from('migration_projects').update({ status: 'dry_run' }).eq('id', projectId)

  revalidatePath(`/landlord/import/${projectId}`)
  redirect(`/landlord/import/${projectId}?dryrun=1`)
}

/** Real import: creates properties and units; records entity ids for rollback. */
export async function runImportAction(formData: FormData) {
  const context = await requireLandlordAccess()
  const { supabase, user, primaryCompanyId } = context
  const projectId = String(formData.get('projectId') ?? '')
  if (!projectId) return

  const { data: project } = await supabase
    .from('migration_projects')
    .select('id, raw_csv, mapping, status, company_id, owner_user_id')
    .eq('id', projectId)
    .maybeSingle()
  // Import requires a completed dry run and must not run twice.
  if (!project || project.status !== 'dry_run') {
    redirect(`/landlord/import/${projectId}?error=dry_run_required`)
  }

  const parsed = parseCsv(project.raw_csv)
  if ('error' in parsed) redirect(`/landlord/import/${projectId}?error=parse`)
  const result = applyMapping(parsed, project.mapping as Record<string, MigrationField>)

  const { data: run } = await supabase
    .from('migration_runs')
    .insert({ project_id: projectId, run_type: 'import', created_by: user.id })
    .select('id')
    .single()

  let createdProperties = 0
  let createdUnits = 0
  let failedRows = 0

  // Create (or reuse existing) properties per distinct name.
  const propertyIdByName = new Map<string, string>()
  for (const propertyName of result.propertyNames) {
    const sample = result.rows.find((row) => row.propertyName === propertyName)
    const ownerFilter = project.company_id
      ? { column: 'company_id' as const, value: project.company_id }
      : { column: 'owner_user_id' as const, value: project.owner_user_id as string }

    const { data: existing } = await supabase
      .from('properties')
      .select('id')
      .eq('name', propertyName)
      .eq(ownerFilter.column, ownerFilter.value)
      .maybeSingle()

    if (existing) {
      propertyIdByName.set(propertyName, existing.id)
      continue
    }

    const { data: created, error } = await supabase
      .from('properties')
      .insert({
        company_id: project.company_id,
        owner_user_id: project.company_id ? null : project.owner_user_id,
        name: propertyName,
        street: sample?.street ?? null,
        zip_code: sample?.zipCode ?? null,
        city: sample?.city ?? 'Okänd',
      })
      .select('id')
      .single()

    if (error || !created) {
      failedRows += result.rows.filter((row) => row.propertyName === propertyName).length
      continue
    }
    propertyIdByName.set(propertyName, created.id)
    createdProperties += 1

    await supabase.from('migration_items').insert({
      project_id: projectId,
      run_id: run?.id ?? null,
      row_number: sample?.rowNumber ?? 0,
      entity_type: 'property',
      entity_id: created.id,
      source_row: { property_name: propertyName } as Json,
      status: 'imported',
    })
  }

  // Create units.
  for (const row of result.rows) {
    const propertyId = propertyIdByName.get(row.propertyName)
    if (!propertyId) continue

    const { data: existingUnit } = await supabase
      .from('units')
      .select('id')
      .eq('property_id', propertyId)
      .eq('unit_number', row.unitNumber)
      .maybeSingle()

    if (existingUnit) {
      await supabase
        .from('migration_items')
        .update({ status: 'skipped', error: 'Enheten finns redan.' })
        .eq('project_id', projectId)
        .eq('row_number', row.rowNumber)
        .eq('entity_type', 'unit')
      continue
    }

    const { data: createdUnit, error } = await supabase
      .from('units')
      .insert({
        property_id: propertyId,
        unit_number: row.unitNumber,
        floor: row.floor,
        rooms: row.rooms,
        area_sqm: row.areaSqm,
        base_rent: row.baseRent === null ? null : Math.round(row.baseRent),
      })
      .select('id')
      .single()

    if (error || !createdUnit) {
      failedRows += 1
      await supabase
        .from('migration_items')
        .update({ status: 'error', error: error?.message ?? 'Kunde inte skapa enheten.' })
        .eq('project_id', projectId)
        .eq('row_number', row.rowNumber)
        .eq('entity_type', 'unit')
      continue
    }

    createdUnits += 1
    await supabase
      .from('migration_items')
      .update({ status: 'imported', entity_id: createdUnit.id, run_id: run?.id ?? null })
      .eq('project_id', projectId)
      .eq('row_number', row.rowNumber)
      .eq('entity_type', 'unit')
  }

  const stats = { created_properties: createdProperties, created_units: createdUnits, failed_rows: failedRows }
  if (run) {
    await supabase
      .from('migration_runs')
      .update({ status: 'completed', stats: stats as unknown as Json, finished_at: new Date().toISOString() })
      .eq('id', run.id)
  }
  await supabase.from('migration_projects').update({ status: 'imported' }).eq('id', projectId)

  revalidatePath(`/landlord/import/${projectId}`)
  revalidatePath('/landlord/properties')
  redirect(`/landlord/import/${projectId}?imported=1`)
}

/** Rollback: deletes entities created by this project (units first, then untouched properties). */
export async function rollbackImportAction(formData: FormData) {
  const { supabase, user } = await requireLandlordAccess()
  const projectId = String(formData.get('projectId') ?? '')
  if (!projectId) return

  const { data: project } = await supabase
    .from('migration_projects')
    .select('id, status')
    .eq('id', projectId)
    .maybeSingle()
  if (!project || project.status !== 'imported') return

  const { data: run } = await supabase
    .from('migration_runs')
    .insert({ project_id: projectId, run_type: 'rollback', created_by: user.id })
    .select('id')
    .single()

  const { data: items } = await supabase
    .from('migration_items')
    .select('id, entity_type, entity_id')
    .eq('project_id', projectId)
    .eq('status', 'imported')
    .not('entity_id', 'is', null)

  let removedUnits = 0
  let removedProperties = 0
  let blocked = 0

  // Units first (properties may depend on them being gone).
  for (const item of (items ?? []).filter((entry) => entry.entity_type === 'unit')) {
    const { error } = await supabase.from('units').delete().eq('id', item.entity_id as string)
    if (error) {
      blocked += 1
      continue
    }
    removedUnits += 1
    await supabase.from('migration_items').update({ status: 'rolled_back', run_id: run?.id ?? null }).eq('id', item.id)
  }

  for (const item of (items ?? []).filter((entry) => entry.entity_type === 'property')) {
    // Only remove properties that have no remaining units (e.g. manually added ones).
    const { count } = await supabase
      .from('units')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', item.entity_id as string)
    if ((count ?? 0) > 0) {
      blocked += 1
      continue
    }
    const { error } = await supabase.from('properties').delete().eq('id', item.entity_id as string)
    if (error) {
      blocked += 1
      continue
    }
    removedProperties += 1
    await supabase.from('migration_items').update({ status: 'rolled_back', run_id: run?.id ?? null }).eq('id', item.id)
  }

  const stats = { removed_units: removedUnits, removed_properties: removedProperties, blocked }
  if (run) {
    await supabase
      .from('migration_runs')
      .update({ status: 'completed', stats: stats as unknown as Json, finished_at: new Date().toISOString() })
      .eq('id', run.id)
  }
  await supabase.from('migration_projects').update({ status: 'rolled_back' }).eq('id', projectId)

  revalidatePath(`/landlord/import/${projectId}`)
  revalidatePath('/landlord/properties')
  redirect(`/landlord/import/${projectId}?rolledback=1`)
}
