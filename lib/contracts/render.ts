/**
 * Contract template rendering: replaces {{placeholder}} tokens with values.
 * Unknown placeholders are kept visible (never silently dropped) so a broken
 * template is caught in review.
 */

export type ContractValues = Record<string, string | number | null | undefined>

export function renderContractTemplate(template: string, values: ContractValues): string {
  return template.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (match, key: string) => {
    const value = values[key]
    if (value === null || value === undefined || value === '') return match
    return String(value)
  })
}

/** Placeholders still unresolved after rendering (for review warnings). */
export function findUnresolvedPlaceholders(rendered: string): string[] {
  const matches = rendered.match(/\{\{\s*[a-z0-9_]+\s*\}\}/gi) ?? []
  return Array.from(new Set(matches.map((match) => match.replace(/[{}\s]/g, ''))))
}
