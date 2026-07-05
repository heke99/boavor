/**
 * Geocoding provider abstraction.
 *
 * Not configured by default: getGeocodingProvider() returns null and callers
 * must degrade gracefully (no map, no coordinates). The production adapter
 * uses a generic forward-geocoding HTTP API selected via GEOCODING_PROVIDER.
 */

export type GeocodeResult = {
  latitude: number
  longitude: number
  /** Confidence 0–1 when the provider reports it. */
  confidence?: number
}

export interface GeocodingProvider {
  readonly name: string
  geocode(query: { street?: string | null; zipCode?: string | null; city: string }): Promise<GeocodeResult | null>
}

/**
 * Nominatim-compatible adapter (works with any OSM Nominatim endpoint set via
 * GEOCODING_API_URL, subject to the endpoint's usage policy).
 */
class NominatimProvider implements GeocodingProvider {
  readonly name = 'nominatim'

  constructor(private readonly apiUrl: string) {}

  async geocode(query: { street?: string | null; zipCode?: string | null; city: string }): Promise<GeocodeResult | null> {
    const parts = [query.street, query.zipCode, query.city, 'Sweden'].filter(Boolean).join(', ')
    const url = new URL(`${this.apiUrl.replace(/\/$/, '')}/search`)
    url.searchParams.set('q', parts)
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', '1')
    url.searchParams.set('countrycodes', 'se')

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Bovaro/1.0 (support@bovaro.se)' },
      })
      if (!response.ok) return null
      const results = (await response.json()) as Array<{ lat: string; lon: string }>
      const first = results[0]
      if (!first) return null
      return { latitude: Number(first.lat), longitude: Number(first.lon) }
    } catch (error) {
      console.error('Geocoding failed', error)
      return null
    }
  }
}

export function getGeocodingProvider(env: NodeJS.ProcessEnv = process.env): GeocodingProvider | null {
  const provider = env.GEOCODING_PROVIDER?.trim().toLowerCase()
  if (provider === 'nominatim' && env.GEOCODING_API_URL) {
    return new NominatimProvider(env.GEOCODING_API_URL)
  }
  return null
}
