import { describe, expect, it } from 'vitest'
import { parseUnitsCsv } from './units-csv'

describe('parseUnitsCsv', () => {
  it('parses a valid CSV with Swedish headers', () => {
    const result = parseUnitsCsv('lagenhetsnummer,rum,kvm,hyra,vaning\n1101,2,55,9500,1\n1102,3,72.5,12000,2')
    expect(result.errors).toHaveLength(0)
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0]).toEqual({ unitNumber: '1101', rooms: 2, areaSqm: 55, baseRent: 9500, floor: '1' })
    expect(result.rows[1].areaSqm).toBe(72.5)
  })

  it('accepts English headers and semicolon separators', () => {
    const result = parseUnitsCsv('unit_number;rooms;area_sqm;base_rent\nA1;1;35;7000')
    expect(result.errors).toHaveLength(0)
    expect(result.rows[0].unitNumber).toBe('A1')
  })

  it('handles decimal commas', () => {
    const result = parseUnitsCsv('unit_number;rooms;area_sqm\nA1;1,5;35,5')
    expect(result.rows[0].rooms).toBe(1.5)
    expect(result.rows[0].areaSqm).toBe(35.5)
  })

  it('rejects missing unit number column', () => {
    const result = parseUnitsCsv('rum,kvm\n2,55')
    expect(result.rows).toHaveLength(0)
    expect(result.errors[0].message).toContain('lagenhetsnummer')
  })

  it('flags duplicates and invalid values with line numbers', () => {
    const result = parseUnitsCsv(
      'lagenhetsnummer,rum,kvm,hyra\n1101,2,55,9500\n1101,2,55,9500\n1103,99,55,9500\n1104,2,-5,9500\n1105,2,55,999999',
    )
    expect(result.rows).toHaveLength(1)
    expect(result.errors).toHaveLength(4)
    expect(result.errors.map((error) => error.line)).toEqual([3, 4, 5, 6])
  })

  it('handles empty content', () => {
    const result = parseUnitsCsv('')
    expect(result.errors[0].message).toContain('tom')
  })
})
