import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

async function getArticle(slug: string) {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return null
  const { data } = await supabase
    .from('help_articles')
    .select('slug, title, body, category, updated_at')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle()
  return data
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticle(slug)
  if (!article) notFound()
  return { title: `${article.title} | Hjälpcenter` }
}

export default async function HelpArticlePage({ params }: Props) {
  const { slug } = await params
  const article = await getArticle(slug)
  if (!article) notFound()

  return (
    <section className="bg-[#f6f7fb] py-14 md:py-20">
      <div className="container-shell">
        <div className="mx-auto max-w-3xl">
          <Link href="/support" className="inline-flex items-center gap-2 text-sm font-semibold text-[#5b3df5]">
            <ArrowLeft size={15} />
            Hjälpcentret
          </Link>
          <article className="mt-4 rounded-[36px] border border-[#e5e7eb] bg-white p-8 shadow-[0_22px_70px_rgba(15,23,42,0.07)] md:p-10">
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#111827] md:text-4xl">{article.title}</h1>
            <div className="mt-2 text-xs text-[#6b7280]">
              Uppdaterad {new Date(article.updated_at).toLocaleDateString('sv-SE')}
            </div>
            <div className="mt-6 space-y-4">
              {article.body.split(/\n{2,}/).map((paragraph, index) => (
                <p key={index} className="whitespace-pre-wrap text-[15px] leading-8 text-[#374151]">
                  {paragraph}
                </p>
              ))}
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
