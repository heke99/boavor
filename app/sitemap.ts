import type { MetadataRoute } from 'next'
import { getPublishedListings } from '@/lib/data/listings'
import { getSiteUrl } from '@/lib/url'

const staticRoutes = [
  '',
  '/rent',
  '/buy',
  '/listings',
  '/support',
  '/terms',
  '/privacy',
  '/cookies',
  '/advertiser-terms',
  '/queue-terms',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl()
  const now = new Date()
  const listings = await getPublishedListings({}, { limit: 500 })

  return [
    ...staticRoutes.map((route) => ({
      url: `${siteUrl}${route}`,
      lastModified: now,
      changeFrequency: route === '' || route === '/listings' ? ('daily' as const) : ('monthly' as const),
      priority: route === '' ? 1 : route === '/listings' ? 0.9 : 0.6,
    })),
    ...listings.map((listing) => ({
      url: `${siteUrl}/listing/${listing.slug}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
  ]
}
