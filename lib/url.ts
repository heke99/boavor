export function getSafeNextPath(value: string | null | undefined, fallback = '/dashboard') {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback
  return value
}

export function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.replace(/^/, 'https://') ??
    process.env.VERCEL_URL?.replace(/^/, 'https://') ??
    'http://localhost:3000'
  )
}
