import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  it('joins headers and rows with CRLF', () => {
    const csv = toCsv(['day', 'metric', 'value'], [['2026-07-05', 'new_users', 3]])
    expect(csv).toBe('day,metric,value\r\n2026-07-05,new_users,3\r\n')
  })

  it('quotes cells containing commas, quotes and newlines', () => {
    const csv = toCsv(['title'], [['Hej, "världen"'], ['rad\nbryt']])
    expect(csv).toBe('title\r\n"Hej, ""världen"""\r\n"rad\nbryt"\r\n')
  })

  it('renders null and undefined as empty cells', () => {
    const csv = toCsv(['a', 'b'], [[null, undefined]])
    expect(csv).toBe('a,b\r\n,\r\n')
  })
})
