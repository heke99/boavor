'use server'

import { redirect } from 'next/navigation'
import { getAuthContext } from '@/lib/auth/permissions'

export async function respondToCoApplicantInviteAction(formData: FormData) {
  const token = String(formData.get('token') ?? '')
  const decision = String(formData.get('decision') ?? '')
  if (!token || !['accept', 'decline'].includes(decision)) return

  const { supabase } = await getAuthContext({
    loginRedirect: `/login?next=${encodeURIComponent(`/co-applicant/invite/${token}`)}`,
  })

  const { error } = await supabase.rpc('respond_co_applicant_invite', {
    p_token: token,
    p_accept: decision === 'accept',
  })

  if (error) {
    console.error('Failed to respond to co-applicant invite', error)
  }

  redirect(`/co-applicant/invite/${token}?done=1`)
}
