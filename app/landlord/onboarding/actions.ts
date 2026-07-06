'use server'

import { revalidatePath } from 'next/cache'
import { requireLandlordAccess } from '@/lib/data/landlord'

export async function updateCompanyProfileAction(formData: FormData) {
  const { supabase, companyIds } = await requireLandlordAccess()

  const companyId = String(formData.get('companyId') ?? '')
  if (!companyId || !companyIds.includes(companyId)) return

  const notificationEmails = String(formData.get('notificationEmails') ?? '')
    .split(',')
    .map((email) => email.trim())
    .filter((email) => email.includes('@'))

  const { error } = await supabase
    .from('companies')
    .update({
      name: String(formData.get('name') ?? '').trim() || undefined,
      organization_number: String(formData.get('organizationNumber') ?? '').trim() || null,
      email: String(formData.get('email') ?? '').trim() || null,
      phone: String(formData.get('phone') ?? '').trim() || null,
      city: String(formData.get('city') ?? '').trim() || null,
      website: String(formData.get('website') ?? '').trim() || null,
      billing_email: String(formData.get('billingEmail') ?? '').trim() || null,
      invoice_reference: String(formData.get('invoiceReference') ?? '').trim() || null,
      logo_url: String(formData.get('logoUrl') ?? '').trim() || null,
      public_description: String(formData.get('publicDescription') ?? '').trim() || null,
      default_selection_method: ['strict_queue', 'guided_queue', 'first_come', 'random', 'manual_with_policy'].includes(
        String(formData.get('defaultSelectionMethod') ?? ''),
      )
        ? String(formData.get('defaultSelectionMethod'))
        : 'manual_with_policy',
      notification_emails: notificationEmails,
    })
    .eq('id', companyId)

  if (error) console.error('Failed to update company profile', error)

  revalidatePath('/landlord/onboarding')
  revalidatePath('/landlord')
}
