import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Building2, Clock3, Mail } from 'lucide-react'
import { ListingGrid } from '@/components/listings/ListingGrid'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getPublishedCompanyListings } from '@/lib/data/listings'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ portalSlug: string }> }

async function getPortal(portalSlug: string) {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return null

  const { data } = await supabase
    .from('tenant_portals')
    .select('id, company_id, slug, name, tagline, description, primary_color, logo_url, contact_email, cities, show_queue_info, is_active')
    .eq('slug', portalSlug)
    .eq('is_active', true)
    .maybeSingle()

  return data
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { portalSlug } = await params
  const portal = await getPortal(portalSlug)
  // notFound here (before streaming starts) so the HTTP status is a real 404.
  if (!portal) notFound()
  return {
    title: `${portal.name} — Lediga bostäder`,
    description: portal.tagline ?? `Lediga bostäder hos ${portal.name}. Ansök via Bovaro.`,
    robots: { index: true, follow: true },
  }
}

/** Public white-label portal: the owning company's published listings only. */
export default async function TenantPortalPage({ params }: Props) {
  const { portalSlug } = await params
  const portal = await getPortal(portalSlug)
  if (!portal) notFound()

  const listings = await getPublishedCompanyListings(portal.company_id, portal.cities ?? [])

  return (
    <section>
      <div className="relative overflow-hidden py-16 text-white md:py-24" style={{ backgroundColor: portal.primary_color }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.14),transparent_40%)]" />
        <div className="container-shell relative">
          <div className="flex items-center gap-4">
            {portal.logo_url ? (
              <Image
                src={portal.logo_url}
                alt={`${portal.name} logotyp`}
                width={64}
                height={64}
                className="h-16 w-16 rounded-2xl bg-white/90 object-contain p-2"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15">
                <Building2 size={28} />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-semibold tracking-[-0.03em] md:text-5xl">{portal.name}</h1>
              {portal.tagline ? <p className="mt-2 text-base text-white/85 md:text-lg">{portal.tagline}</p> : null}
            </div>
          </div>
          {portal.description ? (
            <p className="mt-6 max-w-3xl text-sm leading-7 text-white/85 md:text-base">{portal.description}</p>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold">
            {portal.show_queue_info ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2">
                <Clock3 size={15} />
                Ansökningar via Bovaros kostnadsfria bostadskö
              </span>
            ) : null}
            {portal.contact_email ? (
              <a
                href={`mailto:${portal.contact_email}`}
                className="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 !text-white hover:bg-white/20"
              >
                <Mail size={15} />
                {portal.contact_email}
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="container-shell py-12">
        <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#111827]">
          Lediga objekt {portal.cities?.length ? `i ${portal.cities.join(', ')}` : ''}
        </h2>
        <div className="mt-6">
          {listings.length > 0 ? (
            <ListingGrid listings={listings} />
          ) : (
            <div className="rounded-[28px] border border-[#e8ebf3] bg-white p-10 text-center">
              <p className="text-sm leading-6 text-[#6b7280]">
                Inga lediga objekt just nu. Skapa en bevakning på Bovaro så får du mejl när något publiceras.
              </p>
              <Link
                href="/listings"
                className="mt-4 inline-flex items-center rounded-2xl bg-[#111827] px-5 py-3 text-sm font-semibold !text-white hover:bg-[#0b1220]"
              >
                Sök på hela Bovaro
              </Link>
            </div>
          )}
        </div>

        <div className="mt-12 rounded-[28px] border border-[#e8ebf3] bg-[#f7f8fc] p-6 text-center text-sm text-[#6b7280]">
          Portalen drivs av{' '}
          <Link href="/" className="font-semibold text-[#243b8f] underline underline-offset-4">
            Bovaro
          </Link>
          {' '}— ansökningar, kö och meddelanden hanteras tryggt i plattformen.
        </div>
      </div>
    </section>
  )
}
