'use server'

import { revalidatePath } from 'next/cache'
import { requireLandlordAccess } from '@/lib/data/landlord'

const TEAM_ROLES = ['owner', 'admin', 'leasing_agent', 'viewer', 'billing']

export async function inviteTeamMemberAction(formData: FormData) {
  const { supabase, user, companyIds } = await requireLandlordAccess()

  const companyId = String(formData.get('companyId') ?? '')
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const teamRole = String(formData.get('teamRole') ?? 'leasing_agent')

  if (!companyId || !companyIds.includes(companyId)) return
  if (!email.includes('@') || !TEAM_ROLES.includes(teamRole)) return

  const { error } = await supabase.from('company_member_invites').insert({
    company_id: companyId,
    email,
    team_role: teamRole,
    invited_by: user.id,
  })

  if (error) console.error('Failed to create team invite', error)

  revalidatePath('/landlord/settings')
}

export async function revokeTeamInviteAction(formData: FormData) {
  const { supabase, companyIds } = await requireLandlordAccess()
  const inviteId = String(formData.get('inviteId') ?? '')
  if (!inviteId) return

  await supabase
    .from('company_member_invites')
    .update({ status: 'revoked' })
    .eq('id', inviteId)
    .in('company_id', companyIds)

  revalidatePath('/landlord/settings')
}

export async function updateTeamRoleAction(formData: FormData) {
  const { supabase, user, companyIds } = await requireLandlordAccess()
  const memberId = String(formData.get('memberId') ?? '')
  const teamRole = String(formData.get('teamRole') ?? '')
  if (!memberId || !TEAM_ROLES.includes(teamRole)) return

  const { data: member } = await supabase
    .from('company_members')
    .select('id, company_id, user_id')
    .eq('id', memberId)
    .maybeSingle()

  if (!member || !companyIds.includes(member.company_id)) return
  // A user cannot change their own team role (prevents accidental lockouts).
  if (member.user_id === user.id) return

  await supabase.from('company_members').update({ team_role: teamRole }).eq('id', memberId)

  revalidatePath('/landlord/settings')
}

export async function removeTeamMemberAction(formData: FormData) {
  const { supabase, user, companyIds } = await requireLandlordAccess()
  const memberId = String(formData.get('memberId') ?? '')
  if (!memberId) return

  const { data: member } = await supabase
    .from('company_members')
    .select('id, company_id, user_id')
    .eq('id', memberId)
    .maybeSingle()

  if (!member || !companyIds.includes(member.company_id)) return
  if (member.user_id === user.id) return

  await supabase.from('company_members').delete().eq('id', memberId)

  revalidatePath('/landlord/settings')
}
