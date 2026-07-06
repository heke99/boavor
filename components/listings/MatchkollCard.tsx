import Link from 'next/link'
import { BadgeCheck, CircleAlert, CircleHelp, Fingerprint, Sparkles, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { runMatchkollAction } from '@/app/listing/[slug]/actions'
import { MATCHKOLL_RESULT_LABELS } from '@/lib/policy/engine'
import type { StoredEvaluation } from '@/lib/data/matchkoll'

const RESULT_STYLES: Record<string, { className: string; icon: typeof BadgeCheck }> = {
  eligible: { className: 'border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]', icon: BadgeCheck },
  likely_eligible: { className: 'border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]', icon: BadgeCheck },
  missing_info: { className: 'border-[#fde68a] bg-[#fffbeb] text-[#92400e]', icon: CircleHelp },
  not_eligible: { className: 'border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]', icon: XCircle },
}

type Props = {
  slug: string
  isSignedIn: boolean
  isVerified: boolean
  hasPlus: boolean
  evaluation: StoredEvaluation | null
  statusMessage: string | null
}

export function MatchkollCard({ slug, isSignedIn, isVerified, hasPlus, evaluation, statusMessage }: Props) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#5b3df5]">
        <Sparkles size={16} />
        Matchkoll
      </div>
      <h2 className="mt-3 text-xl font-semibold text-[#111827]">Uppfyller du kraven?</h2>
      <p className="mt-2 text-sm leading-6 text-[#5b6475]">
        Matchkoll jämför din profil med hyresvärdens krav innan du ansöker. Resultatet sparas bara för dig.
      </p>

      {statusMessage ? (
        <div className="mt-4 rounded-2xl bg-[#fffbeb] p-3 text-sm font-medium text-[#92400e]">{statusMessage}</div>
      ) : null}

      {!isSignedIn ? (
        <div className="mt-5">
          <Button href={`/login?next=${encodeURIComponent(`/listing/${slug}`)}`} variant="light" className="border border-black/10">
            Logga in för att köra Matchkoll
          </Button>
        </div>
      ) : !isVerified ? (
        <div className="mt-5">
          <Button href="/dashboard/identity" variant="light" className="border border-black/10">
            <Fingerprint size={16} className="mr-2" />
            Verifiera identitet först
          </Button>
        </div>
      ) : (
        <>
          {evaluation ? (
            <div className={`mt-5 rounded-2xl border p-4 ${RESULT_STYLES[evaluation.result]?.className ?? ''}`}>
              <div className="flex items-center gap-2 font-semibold">
                {(() => {
                  const Icon = RESULT_STYLES[evaluation.result]?.icon ?? CircleAlert
                  return <Icon size={18} />
                })()}
                {MATCHKOLL_RESULT_LABELS[evaluation.result as keyof typeof MATCHKOLL_RESULT_LABELS] ?? evaluation.result}
              </div>
              <div className="mt-1 text-xs opacity-80">
                Senast körd {new Intl.DateTimeFormat('sv-SE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(evaluation.createdAt))}
              </div>

              <ul className="mt-4 space-y-2 text-sm">
                {evaluation.outcomes
                  .filter((outcome) => hasPlus || outcome.status !== 'passed')
                  .map((outcome, index) => (
                    <li key={`${outcome.ruleType}-${index}`} className="flex items-start gap-2">
                      {outcome.status === 'passed' ? (
                        <BadgeCheck size={16} className="mt-0.5 shrink-0" />
                      ) : outcome.status === 'failed' ? (
                        <XCircle size={16} className="mt-0.5 shrink-0" />
                      ) : (
                        <CircleHelp size={16} className="mt-0.5 shrink-0" />
                      )}
                      <span>{outcome.explanation}</span>
                    </li>
                  ))}
                {evaluation.outcomes.length === 0 ? (
                  <li>Hyresvärden har inte angett några särskilda krav för den här bostaden.</li>
                ) : null}
              </ul>

              {!hasPlus && evaluation.outcomes.some((outcome) => outcome.status === 'passed') ? (
                <p className="mt-3 text-xs opacity-80">
                  Detaljerad genomgång av alla uppfyllda krav ingår i{' '}
                  <Link href="/plus" className="font-semibold underline underline-offset-2">Bovaro Plus</Link>.
                </p>
              ) : null}
            </div>
          ) : null}

          <form action={runMatchkollAction} className="mt-5">
            <input type="hidden" name="slug" value={slug} />
            <Button type="submit" variant="light" className="border border-black/10">
              <Sparkles size={16} className="mr-2" />
              {evaluation ? 'Kör Matchkoll igen' : 'Kör Matchkoll'}
            </Button>
          </form>
        </>
      )}
    </Card>
  )
}
