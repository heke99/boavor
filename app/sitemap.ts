import type { MetadataRoute } from 'next'
import { getPublishedListings } from '@/lib/data/listings'
import { cityDisplayNameToSlug } from '@/lib/seo/city'
import { hasSupabaseEnv } from '@/lib/supabase/env'
import { getSiteUrl } from '@/lib/url'

const staticRoutes = [
  '',
  '/rent',
  '/buy',
  '/listings',
  '/bostadsko',
  '/plus',
  '/byta',
  '/hyresvardar',
  '/support',
  '/terms',
  '/privacy',
  '/cookies',
  '/advertiser-terms',
  '/queue-terms',
]

// Static generation must never hang on a slow or unreachable database.
const LISTINGS_FETCH_TIMEOUT_MS = 10_000

async function getListingsForSitemap() {
  if (!hasSupabaseEnv()) return []

  try {
    const timeout = new Promise<[]>((resolve) => {
      setTimeout(() => resolve([]), LISTINGS_FETCH_TIMEOUT_MS)
    })
    return await Promise.race([getPublishedListings({}, { limit: 500 }), timeout])
  } catch (error) {
    console.error('Sitemap listing fetch failed', error)
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl()
  const now = new Date()
  const listings = await getListingsForSitemap()

  // City pages generated from real published rental listings.
  const rentalCities = Array.from(
    new Set(
      listings
        .filter((listing) => listing.listingType === 'rent' && listing.listingSegment === 'residential')
        .map((listing) => cityDisplayNameToSlug(listing.city))
        .filter(Boolean),
    ),
  )

  return [
    ...staticRoutes.map((route) => ({
      url: `${siteUrl}${route}`,
      lastModified: now,
      changeFrequency: route === '' || route === '/listings' ? ('daily' as const) : ('monthly' as const),
      priority: route === '' ? 1 : route === '/listings' ? 0.9 : 0.6,
    })),
    ...rentalCities.map((citySlug) => ({
      url: `${siteUrl}/lediga-lagenheter/${citySlug}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    ...listings.map((listing) => ({
      url: `${siteUrl}/listing/${listing.slug}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
  ]
}
