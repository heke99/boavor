/** City slug helpers for SEO location pages. */

const SWEDISH_SLUG_REPLACEMENTS: Array<[RegExp, string]> = [
  [/å/g, 'a'],
  [/ä/g, 'a'],
  [/ö/g, 'o'],
  [/é/g, 'e'],
]

export function cityDisplayNameToSlug(name: string): string {
  let slug = name.trim().toLowerCase()
  for (const [pattern, replacement] of SWEDISH_SLUG_REPLACEMENTS) {
    slug = slug.replace(pattern, replacement)
  }
  return slug
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

/**
 * Best-effort reverse mapping from slug to display name. Known major cities
 * keep their Swedish characters; unknown slugs are title-cased.
 */
const KNOWN_CITIES: Record<string, string> = {
  stockholm: 'Stockholm',
  goteborg: 'Göteborg',
  malmo: 'Malmö',
  uppsala: 'Uppsala',
  linkoping: 'Linköping',
  orebro: 'Örebro',
  vasteras: 'Västerås',
  norrkoping: 'Norrköping',
  helsingborg: 'Helsingborg',
  jonkoping: 'Jönköping',
  lund: 'Lund',
  umea: 'Umeå',
  gavle: 'Gävle',
  boras: 'Borås',
  sodertalje: 'Södertälje',
  eskilstuna: 'Eskilstuna',
  karlstad: 'Karlstad',
  vaxjo: 'Växjö',
  halmstad: 'Halmstad',
  sundsvall: 'Sundsvall',
  lulea: 'Luleå',
  ostersund: 'Östersund',
}

export function citySlugToDisplayName(slug: string): string {
  const normalized = decodeURIComponent(slug).trim().toLowerCase()
  if (KNOWN_CITIES[normalized]) return KNOWN_CITIES[normalized]

  return normalized
    .split('-')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ')
}
