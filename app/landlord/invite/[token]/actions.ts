'use server'

import { redirect } from 'next/navigation'
import { getAuthContext } from '@/lib/auth/permissions'

export async function acceptCompanyInviteAction(formData: FormData) {
  const token = String(formData.get('token') ?? '')
  if (!token) return

  const { supabase } = await getAuthContext({
    loginRedirect: `/login?next=${encodeURIComponent(`/landlord/invite/${token}`)}`,
  })

  const { error } = await supabase.rpc('accept_company_invite', { p_token: token })
  if (error) {
    console.error('Failed to accept company invite', error)
    redirect(`/landlord/invite/${token}`)
  }

  redirect(`/landlord/invite/${token}?done=1`)
}
