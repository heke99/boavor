/**
 * CSV parser/validator for bulk unit import.
 *
 * Expected header (Swedish or English accepted, case-insensitive):
 *   lagenhetsnummer/unit_number, rum/rooms, kvm/area_sqm, hyra/base_rent,
 *   vaning/floor (optional)
 */

export type UnitImportRow = {
  unitNumber: string
  rooms: number | null
  areaSqm: number | null
  baseRent: number | null
  floor: string | null
}

export type UnitImportError = {
  line: number
  message: string
}

export type UnitImportResult = {
  rows: UnitImportRow[]
  errors: UnitImportError[]
}

const HEADER_ALIASES: Record<string, keyof UnitImportRow> = {
  unit_number: 'unitNumber',
  lagenhetsnummer: 'unitNumber',
  lägenhetsnummer: 'unitNumber',
  nummer: 'unitNumber',
  rooms: 'rooms',
  rum: 'rooms',
  area_sqm: 'areaSqm',
  kvm: 'areaSqm',
  yta: 'areaSqm',
  base_rent: 'baseRent',
  hyra: 'baseRent',
  rent: 'baseRent',
  floor: 'floor',
  vaning: 'floor',
  våning: 'floor',
}

function splitCsvLine(line: string, separator: string): string[] {
  return line.split(separator).map((cell) => cell.trim().replace(/^"|"$/g, ''))
}

function parseNumber(value: string): number | null {
  if (!value) return null
  const normalized = value.replace(/\s/g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export function parseUnitsCsv(content: string): UnitImportResult {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    return { rows: [], errors: [{ line: 0, message: 'Filen är tom.' }] }
  }

  // The separator is decided by the header row and applies to the whole file
  // (values may contain decimal commas when semicolons separate columns).
  const separator = lines[0].includes(';') ? ';' : ','
  const headerCells = splitCsvLine(lines[0], separator).map((cell) => cell.toLowerCase())
  const columnMap = new Map<number, keyof UnitImportRow>()
  headerCells.forEach((cell, index) => {
    const field = HEADER_ALIASES[cell]
    if (field) columnMap.set(index, field)
  })

  if (![...columnMap.values()].includes('unitNumber')) {
    return {
      rows: [],
      errors: [{ line: 1, message: 'Kolumnen "lagenhetsnummer" (eller "unit_number") saknas i rubrikraden.' }],
    }
  }

  const rows: UnitImportRow[] = []
  const errors: UnitImportError[] = []
  const seenUnitNumbers = new Set<string>()

  for (let index = 1; index < lines.length; index += 1) {
    const lineNumber = index + 1
    const cells = splitCsvLine(lines[index], separator)

    const row: UnitImportRow = { unitNumber: '', rooms: null, areaSqm: null, baseRent: null, floor: null }
    columnMap.forEach((field, columnIndex) => {
      const value = cells[columnIndex] ?? ''
      if (field === 'unitNumber') row.unitNumber = value
      else if (field === 'floor') row.floor = value || null
      else row[field] = parseNumber(value)
    })

    if (!row.unitNumber) {
      errors.push({ line: lineNumber, message: 'Lägenhetsnummer saknas.' })
      continue
    }
    if (seenUnitNumbers.has(row.unitNumber)) {
      errors.push({ line: lineNumber, message: `Dubblett: lägenhetsnummer ${row.unitNumber} förekommer flera gånger.` })
      continue
    }
    if (row.rooms !== null && (row.rooms <= 0 || row.rooms > 20)) {
      errors.push({ line: lineNumber, message: `Ogiltigt antal rum (${row.rooms}).` })
      continue
    }
    if (row.areaSqm !== null && (row.areaSqm <= 0 || row.areaSqm > 1000)) {
      errors.push({ line: lineNumber, message: `Ogiltig yta (${row.areaSqm} kvm).` })
      continue
    }
    if (row.baseRent !== null && (row.baseRent < 0 || row.baseRent > 200000)) {
      errors.push({ line: lineNumber, message: `Ogiltig hyra (${row.baseRent} kr).` })
      continue
    }

    seenUnitNumbers.add(row.unitNumber)
    rows.push(row)
  }

  return { rows, errors }
}
