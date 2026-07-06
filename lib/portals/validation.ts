/** Portal branding validation (pure, tested). Mirrors the DB check constraints. */

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,46})[a-z0-9]$/
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/
const DOMAIN_PATTERN = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/

/** Lowercases, transliterates å/ä/ö and strips everything not url-safe. */
export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9-\s]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug)
}

export function isValidHexColor(color: string): boolean {
  return HEX_COLOR_PATTERN.test(color)
}

/** Bare hostname (no scheme/path); rejects the platform's own domains. */
export function isValidCustomDomain(domain: string, reservedHosts: string[] = []): boolean {
  const normalized = domain.toLowerCase().trim()
  if (!DOMAIN_PATTERN.test(normalized)) return false
  return !reservedHosts.some((host) => normalized === host || normalized.endsWith(`.${host}`))
}
