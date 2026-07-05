import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { IdentityVerificationPanel } from '@/components/dashboard/IdentityVerificationPanel'
import { Card } from '@/components/ui/Card'
import { getIdentityState } from '@/lib/data/identity'
import { getDashboardProfile } from '@/lib/data/profile'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BadgeCheck, CircleDashed } from 'lucide-react'

export const dynamic = 'force-dynamic'

type ChecklistItem = {
  label: string
  done: boolean
  href: string
}

export default async function IdentityPage() {
  const [identity, profileResult] = await Promise.all([getIdentityState(), getDashboardProfile()])

  if (!identity.isSignedIn || !profileResult.isSignedIn || !profileResult.profile) {
    redirect('/login?next=/dashboard/identity')
  }

  const profile = profileResult.profile

  const checklist: ChecklistItem[] = [
    { label: 'Konto skapat', done: true, href: '/dashboard' },
    { label: 'Identitet verifierad', done: identity.isVerified, href: '/dashboard/identity' },
    {
      label: 'Kontaktuppgifter ifyllda',
      done: Boolean(profile.phone && profile.firstName && profile.lastName),
      href: '/dashboard/profile',
    },
    {
      label: 'Inkomst och hushåll ifyllt',
      done: Boolean(profile.monthlyIncome && profile.householdSize),
      href: '/dashboard/profile',
    },
    { label: 'Dokument uppladdade', done: profile.documents.length > 0, href: '/dashboard/documents' },
    {
      label: 'Bostadskö aktiv',
      done: profile.queueMembership?.status === 'active',
      href: '/bostadsko',
    },
  ]

  return (
    <DashboardShell
      activePath="/dashboard/identity"
      title="Identitet"
      description="Verifiera din identitet för att kunna skicka bostadsansökningar. Ditt personnummer sparas aldrig i klartext."
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <IdentityVerificationPanel identity={identity} />

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[#111827]">Din ansökningsstatus</h2>
          <p className="mt-1 text-sm text-[#6b7280]">
            Det här behöver vara klart för att din ansökan ska vara komplett.
          </p>
          <ul className="mt-5 space-y-3">
            {checklist.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 rounded-2xl border border-black/5 px-4 py-3 text-sm font-semibold transition hover:bg-[#f7f8fc]"
                >
                  {item.done ? (
                    <BadgeCheck size={18} className="shrink-0 text-[#16a34a]" />
                  ) : (
                    <CircleDashed size={18} className="shrink-0 text-[#9ca3af]" />
                  )}
                  <span className={item.done ? 'text-[#111827]' : 'text-[#6b7280]'}>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </DashboardShell>
  )
}
