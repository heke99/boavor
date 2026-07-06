/**
 * Migration center CSV handling (pure, tested).
 *
 * Flow: parse → privacy gate (reject tenant PII columns) → suggest mapping →
 * apply mapping → validated property/unit rows for dry run or import.
 */

export const MAX_CSV_BYTES = 300_000
export const MAX_ROWS = 2_000

export type MigrationField =
  | 'property_name'
  | 'street'
  | 'zip_code'
  | 'city'
  | 'unit_number'
  | 'floor'
  | 'rooms'
  | 'area_sqm'
  | 'base_rent'
  | 'ignore'

export const FIELD_LABELS: Record<MigrationField, string> = {
  property_name: 'Fastighet (namn)',
  street: 'Gatuadress',
  zip_code: 'Postnummer',
  city: 'Stad',
  unit_number: 'Lägenhetsnummer',
  floor: 'Våning',
  rooms: 'Rum',
  area_sqm: 'Yta (kvm)',
  base_rent: 'Hyra (kr/mån)',
  ignore: 'Importera inte',
}

const HEADER_ALIASES: Record<string, MigrationField> = {
  fastighet: 'property_name',
  fastighetsnamn: 'property_name',
  property: 'property_name',
  property_name: 'property_name',
  byggnad: 'property_name',
  adress: 'street',
  gatuadress: 'street',
  street: 'street',
  postnummer: 'zip_code',
  zip: 'zip_code',
  zip_code: 'zip_code',
  stad: 'city',
  ort: 'city',
  city: 'city',
  kommun: 'city',
  lagenhetsnummer: 'unit_number',
  lägenhetsnummer: 'unit_number',
  lgh: 'unit_number',
  unit_number: 'unit_number',
  nummer: 'unit_number',
  vaning: 'floor',
  våning: 'floor',
  floor: 'floor',
  rum: 'rooms',
  rok: 'rooms',
  rooms: 'rooms',
  kvm: 'area_sqm',
  yta: 'area_sqm',
  area_sqm: 'area_sqm',
  boarea: 'area_sqm',
  hyra: 'base_rent',
  manadshyra: 'base_rent',
  månadshyra: 'base_rent',
  base_rent: 'base_rent',
  rent: 'base_rent',
}

/**
 * Privacy gate: the migration center imports PROPERTY data only. Columns
 * that look like tenant personal data are rejected outright — they must be
 * removed from the file before upload.
 */
const PII_HEADER_PATTERN =
  /(personnummer|pnr|ssn|hyresg[aä]st|tenant|namn|name|e[-_]?post|email|mail|telefon|phone|mobil|kontakt)/i

export type ParsedCsv = {
  headers: string[]
  rows: string[][]
}

export type PrivacyViolation = { header: string }

export function parseCsv(content: string): ParsedCsv | { error: string } {
  if (content.length > MAX_CSV_BYTES) {
    return { error: `Filen är för stor (max ${Math.round(MAX_CSV_BYTES / 1000)} kB).` }
  }
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  if (lines.length < 2) {
    return { error: 'Filen måste innehålla en rubrikrad och minst en datarad.' }
  }
  if (lines.length - 1 > MAX_ROWS) {
    return { error: `Filen innehåller för många rader (max ${MAX_ROWS}).` }
  }

  const separator = lines[0].includes(';') ? ';' : ','
  const split = (line: string) => line.split(separator).map((cell) => cell.trim().replace(/^"|"$/g, ''))

  const headers = split(lines[0])
  const rows = lines.slice(1).map(split)
  return { headers, rows }
}

export function findPiiColumns(headers: string[]): PrivacyViolation[] {
  return headers.filter((header) => PII_HEADER_PATTERN.test(header)).map((header) => ({ header }))
}

/** Best-effort mapping suggestion from header names. */
export function suggestMapping(headers: string[]): Record<string, MigrationField> {
  const mapping: Record<string, MigrationField> = {}
  const used = new Set<MigrationField>()
  headers.forEach((header) => {
    const field = HEADER_ALIASES[header.toLowerCase()]
    if (field && !used.has(field)) {
      mapping[header] = field
      used.add(field)
    } else {
      mapping[header] = 'ignore'
    }
  })
  return mapping
}

export type MappedRow = {
  rowNumber: number
  propertyName: string
  street: string | null
  zipCode: string | null
  city: string | null
  unitNumber: string
  floor: string | null
  rooms: number | null
  areaSqm: number | null
  baseRent: number | null
}

export type MappingError = { rowNumber: number; message: string }

export type MappingResult = {
  rows: MappedRow[]
  errors: MappingError[]
  /** Distinct property names in order of first appearance. */
  propertyNames: string[]
}

function parseNumber(value: string): number | null {
  if (!value) return null
  const normalized = value.replace(/\s/g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export function applyMapping(parsed: ParsedCsv, mapping: Record<string, MigrationField>): MappingResult {
  const fieldByIndex = new Map<number, MigrationField>()
  parsed.headers.forEach((header, index) => {
    const field = mapping[header]
    if (field && field !== 'ignore') fieldByIndex.set(index, field)
  })

  const mappedFields = new Set(fieldByIndex.values())
  const errors: MappingError[] = []
  if (!mappedFields.has('property_name')) {
    errors.push({ rowNumber: 0, message: 'Mappa en kolumn till "Fastighet (namn)".' })
  }
  if (!mappedFields.has('unit_number')) {
    errors.push({ rowNumber: 0, message: 'Mappa en kolumn till "Lägenhetsnummer".' })
  }
  if (errors.length > 0) return { rows: [], errors, propertyNames: [] }

  const rows: MappedRow[] = []
  const propertyNames: string[] = []
  const seenUnits = new Set<string>()

  parsed.rows.forEach((cells, index) => {
    const rowNumber = index + 2 // header is line 1
    const row: MappedRow = {
      rowNumber,
      propertyName: '',
      street: null,
      zipCode: null,
      city: null,
      unitNumber: '',
      floor: null,
      rooms: null,
      areaSqm: null,
      baseRent: null,
    }

    fieldByIndex.forEach((field, columnIndex) => {
      const value = cells[columnIndex] ?? ''
      switch (field) {
        case 'property_name':
          row.propertyName = value
          break
        case 'street':
          row.street = value || null
          break
        case 'zip_code':
          row.zipCode = value || null
          break
        case 'city':
          row.city = value || null
          break
        case 'unit_number':
          row.unitNumber = value
          break
        case 'floor':
          row.floor = value || null
          break
        case 'rooms':
          row.rooms = parseNumber(value)
          break
        case 'area_sqm':
          row.areaSqm = parseNumber(value)
          break
        case 'base_rent':
          row.baseRent = parseNumber(value)
          break
      }
    })

    if (!row.propertyName) {
      errors.push({ rowNumber, message: 'Fastighetsnamn saknas.' })
      return
    }
    if (!row.unitNumber) {
      errors.push({ rowNumber, message: 'Lägenhetsnummer saknas.' })
      return
    }
    const unitKey = `${row.propertyName}::${row.unitNumber}`
    if (seenUnits.has(unitKey)) {
      errors.push({ rowNumber, message: `Dubblett: ${row.unitNumber} i ${row.propertyName} förekommer flera gånger.` })
      return
    }
    if (row.rooms !== null && (row.rooms <= 0 || row.rooms > 20)) {
      errors.push({ rowNumber, message: `Ogiltigt antal rum (${row.rooms}).` })
      return
    }
    if (row.areaSqm !== null && (row.areaSqm <= 0 || row.areaSqm > 1000)) {
      errors.push({ rowNumber, message: `Ogiltig yta (${row.areaSqm} kvm).` })
      return
    }
    if (row.baseRent !== null && (row.baseRent < 0 || row.baseRent > 200000)) {
      errors.push({ rowNumber, message: `Ogiltig hyra (${row.baseRent} kr).` })
      return
    }

    seenUnits.add(unitKey)
    if (!propertyNames.includes(row.propertyName)) propertyNames.push(row.propertyName)
    rows.push(row)
  })

  return { rows, errors, propertyNames }
}
