import { BadgeCheck, CircleDashed, TriangleAlert } from 'lucide-react'
import { LandlordShell } from '@/components/landlord/LandlordShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { requireLandlordAccess } from '@/lib/data/landlord'
import { updateCompanyProfileAction } from './actions'

export const dynamic = 'force-dynamic'

export default async function LandlordOnboardingPage() {
  const context = await requireLandlordAccess()
  const { supabase, companyIds } = context

  const { data: companies } = companyIds.length
    ? await supabase
        .from('companies')
        .select('id, name, organization_number, email, phone, city, website, verification_status, verification_note, billing_email, invoice_reference, logo_url, public_description, default_selection_method, notification_emails')
        .in('id', companyIds)
    : { data: [] }

  return (
    <LandlordShell
      activePath="/landlord/onboarding"
      title="Onboarding"
      description="Fyll i företagsuppgifterna så att Bovaro kan verifiera er. Verifierade hyresvärdar kan publicera annonser och får en märkning mot sökande."
    >
      {(companies ?? []).length === 0 ? (
        <Card className="p-8">
          <h2 className="text-2xl font-semibold text-[#111827]">Inget företag kopplat</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6b7280]">
            Du använder Bovaro som privat hyresvärd. Vill du hantera bostäder via ett företag registrerar du ett
            företagskonto, eller lägger till bolagsuppgifter under Min profil.
          </p>
          <div className="mt-5 flex gap-3">
            <Button href="/dashboard/profile" variant="secondary">Till Min profil</Button>
          </div>
        </Card>
      ) : (
        (companies ?? []).map((company) => (
          <Card key={company.id} className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-[#111827]">{company.name}</h2>
              {company.verification_status === 'verified' ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-[#dcfce7] px-4 py-2 text-sm font-semibold text-[#166534]">
                  <BadgeCheck size={16} /> Verifierad hyresvärd
                </span>
              ) : company.verification_status === 'rejected' ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-[#fee2e2] px-4 py-2 text-sm font-semibold text-[#b91c1c]">
                  <TriangleAlert size={16} /> Verifiering nekad
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-[#fef3c7] px-4 py-2 text-sm font-semibold text-[#92400e]">
                  <CircleDashed size={16} /> Väntar på verifiering
                </span>
              )}
            </div>

            {company.verification_note ? (
              <p className="mt-3 rounded-2xl bg-[#f7f8fc] p-4 text-sm text-[#6b7280]">
                Meddelande från Bovaro: {company.verification_note}
              </p>
            ) : null}

            <form action={updateCompanyProfileAction} className="mt-6 grid gap-4 md:grid-cols-2">
              <input type="hidden" name="companyId" value={company.id} />
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#6b7280]">Företagsnamn</label>
                <Input name="name" defaultValue={company.name} required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#6b7280]">Organisationsnummer</label>
                <Input name="organizationNumber" defaultValue={company.organization_number ?? ''} placeholder="559000-0000" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#6b7280]">Kontakt-e-post</label>
                <Input name="email" type="email" defaultValue={company.email ?? ''} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#6b7280]">Telefon</label>
                <Input name="phone" defaultValue={company.phone ?? ''} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#6b7280]">Stad</label>
                <Input name="city" defaultValue={company.city ?? ''} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#6b7280]">Webbplats</label>
                <Input name="website" defaultValue={company.website ?? ''} placeholder="https://" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#6b7280]">Faktura-e-post</label>
                <Input name="billingEmail" type="email" defaultValue={company.billing_email ?? ''} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#6b7280]">Fakturareferens</label>
                <Input name="invoiceReference" defaultValue={company.invoice_reference ?? ''} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#6b7280]">Logotyp-URL</label>
                <Input name="logoUrl" defaultValue={company.logo_url ?? ''} placeholder="https://…/logo.png" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#6b7280]">Standardurval för annonser</label>
                <Select name="defaultSelectionMethod" defaultValue={company.default_selection_method ?? 'manual_with_policy'}>
                  <option value="manual_with_policy">Manuellt urval med krav</option>
                  <option value="strict_queue">Strikt kötid</option>
                  <option value="guided_queue">Vägledd kötid</option>
                  <option value="first_come">Först till kvarn</option>
                  <option value="random">Slumpad ordning</option>
                </Select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-[#6b7280]">Notis-e-postadresser (kommaseparerade)</label>
                <Input name="notificationEmails" defaultValue={(company.notification_emails ?? []).join(', ')} placeholder="uthyrning@bolag.se, kontor@bolag.se" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-[#6b7280]">Publik beskrivning (visas för sökande)</label>
                <textarea
                  name="publicDescription"
                  rows={4}
                  defaultValue={company.public_description ?? ''}
                  placeholder="Berätta kort om er som hyresvärd."
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit">Spara företagsprofil</Button>
              </div>
            </form>
          </Card>
        ))
      )}

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[#111827]">Så fungerar verifieringen</h2>
        <ul className="mt-3 space-y-2 text-sm leading-7 text-[#6b7280]">
          <li>• Bovaros team granskar företagsuppgifterna (namn, organisationsnummer, kontaktuppgifter).</li>
          <li>• Verifierade företag kan publicera annonser och får märkningen &quot;Verifierad hyresvärd&quot;.</li>
          <li>• Om något behöver kompletteras ser du det som ett meddelande här ovan.</li>
        </ul>
      </Card>
    </LandlordShell>
  )
}
