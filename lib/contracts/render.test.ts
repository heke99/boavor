import { describe, expect, it } from 'vitest'
import { findUnresolvedPlaceholders, renderContractTemplate } from './render'

describe('renderContractTemplate', () => {
  it('replaces placeholders with values', () => {
    const rendered = renderContractTemplate('Hyresgäst: {{applicant_name}}, hyra {{rent}} kr', {
      applicant_name: 'Anna Andersson',
      rent: 12000,
    })
    expect(rendered).toBe('Hyresgäst: Anna Andersson, hyra 12000 kr')
  })

  it('keeps unknown placeholders visible', () => {
    const rendered = renderContractTemplate('Objekt: {{listing_title}}', {})
    expect(rendered).toBe('Objekt: {{listing_title}}')
  })

  it('handles whitespace inside braces', () => {
    expect(renderContractTemplate('{{ rent }}', { rent: 9500 })).toBe('9500')
  })

  it('does not replace empty values', () => {
    expect(renderContractTemplate('{{move_in_date}}', { move_in_date: '' })).toBe('{{move_in_date}}')
  })
})

describe('findUnresolvedPlaceholders', () => {
  it('lists remaining placeholders once', () => {
    const rendered = 'A {{rent}} B {{rent}} C {{landlord_name}}'
    expect(findUnresolvedPlaceholders(rendered)).toEqual(['rent', 'landlord_name'])
  })

  it('returns empty for a fully rendered document', () => {
    expect(findUnresolvedPlaceholders('Klart!')).toEqual([])
  })
})
