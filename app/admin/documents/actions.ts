'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminUser } from '@/lib/data/admin'
import { logAdminAudit } from '@/lib/auth/permissions'

export async function reviewProfileDocumentAction(formData: FormData) {
  const { supabase, user } = await requireAdminUser()

  const documentId = String(formData.get('documentId') ?? '')
  const decision = String(formData.get('decision') ?? '')
  const reason = String(formData.get('reason') ?? '').trim() || null

  if (!documentId || !['approved', 'rejected'].includes(decision)) return
  if (decision === 'rejected' && !reason) return

  const { data: document } = await supabase
    .from('profile_documents')
    .select('id, user_id, document_status')
    .eq('id', documentId)
    .maybeSingle()

  if (!document) return

  const newStatus = decision === 'approved' ? 'active' : 'rejected'

  const { error } = await supabase
    .from('profile_documents')
    .update({
      document_status: newStatus,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: decision === 'rejected' ? reason : null,
    })
    .eq('id', documentId)

  if (error) {
    console.error('Failed to review document', error)
    return
  }

  await supabase.from('document_reviews').insert({
    document_id: documentId,
    reviewer_id: user.id,
    decision,
    reason,
  })

  await supabase.from('notifications').insert({
    user_id: document.user_id,
    title: decision === 'approved' ? 'Dokument godkänt' : 'Dokument nekat',
    body:
      decision === 'approved'
        ? 'Ett av dina dokument har granskats och godkänts.'
        : `Ett av dina dokument har nekats: ${reason}. Ladda upp en ny version under Dokument.`,
  })

  await logAdminAudit(supabase, {
    adminUserId: user.id,
    action: `document_${decision}`,
    targetType: 'profile_document',
    targetId: documentId,
    metadata: { owner_user_id: document.user_id, reason },
  })

  revalidatePath('/admin/documents')
}
