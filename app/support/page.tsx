import Link from 'next/link'
import { BookOpen, LifeBuoy, Mail, ShieldCheck } from 'lucide-react'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const categoryLabels: Record<string, string> = {
  allmant: 'Allmänt',
  sokande: 'För bostadssökande',
  hyresvard: 'För hyresvärdar',
  byta: 'Bovaro Byta',
  betalning: 'Betalning och Plus',
  integritet: 'Integritet och GDPR',
}

async function getPublishedArticles() {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return []
  const { data } = await supabase
    .from('help_articles')
    .select('slug, title, category, sort_order')
    .eq('is_published', true)
    .order('category')
    .order('sort_order')
  return data ?? []
}

export default async function SupportPage() {
  const articles = await getPublishedArticles()
  const byCategory = new Map<string, typeof articles>()
  for (const article of articles) {
    const list = byCategory.get(article.category) ?? []
    list.push(article)
    byCategory.set(article.category, list)
  }

  return (
    <section className="bg-[#f6f7fb] py-14 md:py-20">
      <div className="container-shell">
        <div className="mx-auto max-w-4xl">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#5b3df5]">
            <LifeBuoy size={24} />
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-[-0.03em] text-[#111827] md:text-5xl">Hjälpcenter</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[#5b6475]">
            Guider och svar på vanliga frågor om konto, bostadskö, ansökningar, annonser och personuppgifter.
            Hittar du inte svaret kan du skapa ett supportärende.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-[#111827]">
                <Mail size={20} />
                <div className="font-semibold">Skapa supportärende</div>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#5b6475]">
                Inloggade användare skapar ärenden direkt i plattformen och följer svaren där.
              </p>
              <Link
                href="/dashboard/support"
                className="mt-4 inline-flex items-center rounded-2xl bg-[#111827] px-5 py-3 text-sm font-semibold !text-white hover:bg-[#0b1220]"
              >
                Till mina ärenden
              </Link>
            </div>
            <div className="rounded-3xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-[#111827]">
                <ShieldCheck size={20} />
                <div className="font-semibold">Villkor och integritet</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
                <Link href="/terms" className="rounded-full bg-[#f3f4f6] px-4 py-2 text-[#111827] hover:bg-[#e5e7eb]">
                  Allmänna villkor
                </Link>
                <Link href="/privacy" className="rounded-full bg-[#f3f4f6] px-4 py-2 text-[#111827] hover:bg-[#e5e7eb]">
                  Integritetspolicy
                </Link>
                <Link href="/advertiser-terms" className="rounded-full bg-[#f3f4f6] px-4 py-2 text-[#111827] hover:bg-[#e5e7eb]">
                  Annonsörsvillkor
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-12">
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#111827]">Artiklar</h2>
            {articles.length === 0 ? (
              <p className="mt-4 rounded-3xl border border-[#e5e7eb] bg-white p-6 text-sm leading-6 text-[#5b6475]">
                Hjälpcentret fylls på med artiklar löpande. Under tiden är du välkommen att skapa ett supportärende.
              </p>
            ) : (
              <div className="mt-5 grid gap-6 md:grid-cols-2">
                {[...byCategory.entries()].map(([category, categoryArticles]) => (
                  <div key={category} className="rounded-3xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-[#6b7280]">
                      <BookOpen size={15} />
                      {categoryLabels[category] ?? category}
                    </div>
                    <ul className="mt-4 space-y-2">
                      {categoryArticles.map((article) => (
                        <li key={article.slug}>
                          <Link
                            href={`/support/artiklar/${article.slug}`}
                            className="text-sm font-semibold text-[#243b8f] underline-offset-4 hover:underline"
                          >
                            {article.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
