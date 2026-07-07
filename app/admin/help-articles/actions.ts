'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdminUser } from '@/lib/data/admin'
import { logAdminAudit } from '@/lib/auth/permissions'
import { normalizeSlug, isValidSlug } from '@/lib/portals/validation'

const CATEGORIES = ['allmant', 'sokande', 'hyresvard', 'byta', 'betalning', 'integritet'] as const

export async function saveHelpArticleAction(formData: FormData) {
  const { supabase, user } = await requireAdminUser()

  const articleId = String(formData.get('articleId') ?? '').trim() || null
  const title = String(formData.get('title') ?? '').trim()
  const body = String(formData.get('body') ?? '').trim()
  const category = String(formData.get('category') ?? 'allmant')
  const slug = normalizeSlug(String(formData.get('slug') ?? title))
  const sortOrder = Number(formData.get('sortOrder') ?? 100) || 100
  const isPublished = formData.get('isPublished') === 'on'

  if (!title || !body) redirect('/admin/help-articles?error=fields_required')
  if (!isValidSlug(slug)) redirect('/admin/help-articles?error=slug_invalid')
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) redirect('/admin/help-articles?error=fields_required')

  const payload = {
    slug,
    title,
    body,
    category,
    sort_order: sortOrder,
    is_published: isPublished,
    updated_by: user.id,
  }

  let savedArticleId = articleId
  if (articleId) {
    const { error } = await supabase.from('help_articles').update(payload).eq('id', articleId)
    if (error) {
      console.error('Failed to save help article', error)
      redirect(`/admin/help-articles?error=${error.code === '23505' ? 'slug_taken' : 'failed'}`)
    }
  } else {
    const { data: created, error } = await supabase
      .from('help_articles')
      .insert({ ...payload, created_by: user.id })
      .select('id')
      .maybeSingle()
    if (error) {
      console.error('Failed to save help article', error)
      redirect(`/admin/help-articles?error=${error.code === '23505' ? 'slug_taken' : 'failed'}`)
    }
    savedArticleId = created?.id ?? null
  }

  await logAdminAudit(supabase, {
    adminUserId: user.id,
    action: articleId ? 'help_article_updated' : 'help_article_created',
    targetType: 'help_article',
    targetId: savedArticleId,
    metadata: { slug, is_published: isPublished },
  })

  revalidatePath('/admin/help-articles')
  revalidatePath('/support')
  revalidatePath(`/support/artiklar/${slug}`)
  redirect('/admin/help-articles?saved=1')
}

export async function deleteHelpArticleAction(formData: FormData) {
  const { supabase, user } = await requireAdminUser()
  const articleId = String(formData.get('articleId') ?? '')
  if (!articleId) return

  await supabase.from('help_articles').delete().eq('id', articleId)
  await logAdminAudit(supabase, {
    adminUserId: user.id,
    action: 'help_article_deleted',
    targetType: 'help_article',
    targetId: articleId,
  })

  revalidatePath('/admin/help-articles')
  revalidatePath('/support')
}
