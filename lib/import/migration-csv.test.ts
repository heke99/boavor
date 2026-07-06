import { describe, expect, it } from 'vitest'
import { applyMapping, findPiiColumns, parseCsv, suggestMapping } from './migration-csv'

const sample = [
  'Fastighet;Adress;Stad;Lägenhetsnummer;Rum;Kvm;Hyra',
  'Björken 1;Storgatan 1;Umeå;1001;2;55,5;8500',
  'Björken 1;Storgatan 1;Umeå;1002;3;72;10200',
  'Tallen 2;Lillvägen 3;Umeå;2001;1;38;6900',
].join('\n')

describe('parseCsv', () => {
  it('parses semicolon-separated files', () => {
    const parsed = parseCsv(sample)
    if ('error' in parsed) throw new Error(parsed.error)
    expect(parsed.headers).toHaveLength(7)
    expect(parsed.rows).toHaveLength(3)
  })

  it('rejects empty and oversized files', () => {
    expect(parseCsv('')).toHaveProperty('error')
    expect(parseCsv('bara en rubrikrad')).toHaveProperty('error')
    expect(parseCsv('a;b\n' + 'x;y\n'.repeat(2001))).toHaveProperty('error')
  })
})

describe('findPiiColumns (privacy gate)', () => {
  it('flags tenant PII columns', () => {
    const violations = findPiiColumns(['Fastighet', 'Hyresgäst namn', 'Personnummer', 'E-post', 'Telefon'])
    expect(violations.map((violation) => violation.header)).toEqual([
      'Hyresgäst namn',
      'Personnummer',
      'E-post',
      'Telefon',
    ])
  })

  it('accepts property-only columns', () => {
    expect(findPiiColumns(['Fastighet', 'Adress', 'Lägenhetsnummer', 'Hyra'])).toEqual([])
  })
})

describe('suggestMapping', () => {
  it('maps Swedish headers to fields', () => {
    const mapping = suggestMapping(['Fastighet', 'Adress', 'Stad', 'Lägenhetsnummer', 'Rum', 'Kvm', 'Hyra'])
    expect(mapping['Fastighet']).toBe('property_name')
    expect(mapping['Lägenhetsnummer']).toBe('unit_number')
    expect(mapping['Hyra']).toBe('base_rent')
  })

  it('marks unknown headers as ignore', () => {
    const mapping = suggestMapping(['Okänd kolumn'])
    expect(mapping['Okänd kolumn']).toBe('ignore')
  })
})

describe('applyMapping', () => {
  it('produces validated rows and distinct properties', () => {
    const parsed = parseCsv(sample)
    if ('error' in parsed) throw new Error(parsed.error)
    const result = applyMapping(parsed, suggestMapping(parsed.headers))
    expect(result.errors).toEqual([])
    expect(result.rows).toHaveLength(3)
    expect(result.propertyNames).toEqual(['Björken 1', 'Tallen 2'])
    expect(result.rows[0].areaSqm).toBe(55.5)
  })

  it('requires property and unit mappings', () => {
    const parsed = parseCsv(sample)
    if ('error' in parsed) throw new Error(parsed.error)
    const result = applyMapping(parsed, { Fastighet: 'ignore', Lägenhetsnummer: 'ignore' })
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.rows).toEqual([])
  })

  it('flags duplicates and invalid values per row', () => {
    const csv = [
      'Fastighet;Lägenhetsnummer;Rum',
      'A;1;2',
      'A;1;2',
      'A;2;99',
    ].join('\n')
    const parsed = parseCsv(csv)
    if ('error' in parsed) throw new Error(parsed.error)
    const result = applyMapping(parsed, suggestMapping(parsed.headers))
    expect(result.rows).toHaveLength(1)
    expect(result.errors).toHaveLength(2)
  })
})
