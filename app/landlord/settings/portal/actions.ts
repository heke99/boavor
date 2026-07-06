'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireLandlordAccess } from '@/lib/data/landlord'
import { isValidCustomDomain, isValidHexColor, isValidSlug, normalizeSlug } from '@/lib/portals/validation'
import { getSiteUrl } from '@/lib/url'

export async function savePortalAction(formData: FormData) {
  const { supabase, user, primaryCompanyId } = await requireLandlordAccess()
  if (!primaryCompanyId) redirect('/landlord/settings/portal?error=company_required')

  const name = String(formData.get('name') ?? '').trim()
  const slug = normalizeSlug(String(formData.get('slug') ?? name))
  const primaryColor = String(formData.get('primaryColor') ?? '#243b8f').trim()
  const customDomainInput = String(formData.get('customDomain') ?? '').trim().toLowerCase()
  const cities = String(formData.get('cities') ?? '')
    .split(',')
    .map((city) => city.trim())
    .filter(Boolean)

  if (!name) redirect('/landlord/settings/portal?error=name_required')
  if (!isValidSlug(slug)) redirect('/landlord/settings/portal?error=slug_invalid')
  if (!isValidHexColor(primaryColor)) redirect('/landlord/settings/portal?error=color_invalid')

  let customDomain: string | null = null
  if (customDomainInput) {
    const reservedHost = new URL(getSiteUrl()).hostname
    if (!isValidCustomDomain(customDomainInput, [reservedHost, 'vercel.app'])) {
      redirect('/landlord/settings/portal?error=domain_invalid')
    }
    customDomain = customDomainInput
  }

  const { error } = await supabase.from('tenant_portals').upsert(
    {
      company_id: primaryCompanyId,
      slug,
      name,
      tagline: String(formData.get('tagline') ?? '').trim() || null,
      description: String(formData.get('description') ?? '').trim() || null,
      primary_color: primaryColor,
      logo_url: String(formData.get('logoUrl') ?? '').trim() || null,
      contact_email: String(formData.get('contactEmail') ?? '').trim() || null,
      custom_domain: customDomain,
      cities,
      show_queue_info: formData.get('showQueueInfo') === 'on',
      is_active: formData.get('isActive') === 'on',
      created_by: user.id,
    },
    { onConflict: 'company_id' },
  )

  if (error) {
    console.error('Failed to save portal', error)
    const code = error.code === '23505' ? 'slug_taken' : 'failed'
    redirect(`/landlord/settings/portal?error=${code}`)
  }

  revalidatePath('/landlord/settings/portal')
  revalidatePath(`/p/${slug}`)
  redirect('/landlord/settings/portal?saved=1')
}
