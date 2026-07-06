import Link from 'next/link'
import { LandlordShell } from '@/components/landlord/LandlordShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { requireLandlordAccess } from '@/lib/data/landlord'
import { getSiteUrl } from '@/lib/url'
import { savePortalAction } from './actions'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const errorMessages: Record<string, string> = {
  company_required: 'Portaler kräver ett företagskonto.',
  name_required: 'Ge portalen ett namn.',
  slug_invalid: 'Adressdelen (slug) måste vara 3–48 tecken: små bokstäver, siffror och bindestreck.',
  color_invalid: 'Färgen måste anges som hex, t.ex. #243b8f.',
  domain_invalid: 'Ange domänen utan https:// och utan sökväg, t.ex. bostader.dittbolag.se.',
  slug_taken: 'Adressen är upptagen av en annan portal. Välj en annan slug.',
  failed: 'Portalen kunde inte sparas. Försök igen.',
}

const inputClass =
  'w-full rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#5b3df5]'

export default async function LandlordPortalPage({ searchParams }: Props) {
  const params = await searchParams
  const errorKey = typeof params.error === 'string' ? params.error : null
  const saved = params.saved === '1'
  const { supabase, primaryCompanyId } = await requireLandlordAccess()

  const { data: portal } = primaryCompanyId
    ? await supabase
        .from('tenant_portals')
        .select('slug, name, tagline, description, primary_color, logo_url, contact_email, custom_domain, cities, show_queue_info, is_active')
        .eq('company_id', primaryCompanyId)
        .maybeSingle()
    : { data: null }

  const siteHost = new URL(getSiteUrl()).hostname

  return (
    <LandlordShell
      activePath="/landlord/settings"
      title="Hyresgästportal (white label)"
      description="En publik, varumärkt portal med era publicerade objekt. Ansökningar och kö hanteras i Bovaro."
    >
      {errorKey && errorMessages[errorKey] ? (
        <Card className="border border-[#fecaca] bg-[#fef2f2] p-5 text-sm font-semibold text-[#b91c1c]">
          {errorMessages[errorKey]}
        </Card>
      ) : null}
      {saved ? (
        <Card className="border border-[#a7f3d0] bg-[#ecfdf5] p-5 text-sm font-semibold text-[#047857]">
          Portalen har sparats.
          {portal?.slug ? (
            <Link href={`/p/${portal.slug}`} className="ml-2 underline underline-offset-4">
              Öppna portalen →
            </Link>
          ) : null}
        </Card>
      ) : null}

      {!primaryCompanyId ? (
        <Card className="p-8">
          <h2 className="text-xl font-semibold text-[#111827]">Portaler kräver företagskonto</h2>
          <p className="mt-2 text-sm leading-6 text-[#6b7280]">
            Skapa eller gå med i ett företag under onboarding för hyresvärdar för att aktivera en portal.
          </p>
        </Card>
      ) : (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-[#111827]">{portal ? 'Redigera portal' : 'Skapa portal'}</h2>
          {portal?.is_active && portal.slug ? (
            <p className="mt-2 text-sm text-[#6b7280]">
              Portalen är aktiv på{' '}
              <Link href={`/p/${portal.slug}`} className="font-semibold text-[#243b8f] underline underline-offset-4">
                {siteHost}/p/{portal.slug}
              </Link>
              {portal.custom_domain ? ` och ${portal.custom_domain}` : ''}
            </p>
          ) : null}
          <form action={savePortalAction} className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Namn *</span>
              <input name="name" required maxLength={80} defaultValue={portal?.name ?? ''} className={inputClass} placeholder="T.ex. Höjden Bostäder" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Adress (slug) *</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#6b7280]">/p/</span>
                <input name="slug" maxLength={48} defaultValue={portal?.slug ?? ''} className={inputClass} placeholder="hojden-bostader" />
              </div>
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Tagline</span>
              <input name="tagline" maxLength={160} defaultValue={portal?.tagline ?? ''} className={inputClass} placeholder="Hyresbostäder i centrala Umeå" />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Beskrivning</span>
              <textarea name="description" rows={3} maxLength={600} defaultValue={portal?.description ?? ''} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Primärfärg (hex)</span>
              <input name="primaryColor" defaultValue={portal?.primary_color ?? '#243b8f'} className={inputClass} placeholder="#243b8f" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Logotyp-URL (https)</span>
              <input name="logoUrl" type="url" defaultValue={portal?.logo_url ?? ''} className={inputClass} placeholder="https://…/logo.png" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Kontakt-e-post</span>
              <input name="contactEmail" type="email" defaultValue={portal?.contact_email ?? ''} className={inputClass} placeholder="uthyrning@dittbolag.se" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Städer (kommaseparerat, tomt = alla)</span>
              <input name="cities" defaultValue={(portal?.cities ?? []).join(', ')} className={inputClass} placeholder="Umeå, Skellefteå" />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Egen domän (valfritt)</span>
              <input name="customDomain" defaultValue={portal?.custom_domain ?? ''} className={inputClass} placeholder="bostader.dittbolag.se" />
              <span className="mt-1.5 block text-xs leading-5 text-[#6b7280]">
                Peka domänen som CNAME mot {siteHost} och lägg till den i Vercel-projektet. Portalen svarar då på er egen domän.
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
              <input type="checkbox" name="showQueueInfo" defaultChecked={portal?.show_queue_info ?? true} className="h-4 w-4 rounded border-[#d1d5db]" />
              Visa info om Bovaros bostadskö
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
              <input type="checkbox" name="isActive" defaultChecked={portal?.is_active ?? false} className="h-4 w-4 rounded border-[#d1d5db]" />
              Portalen är publik
            </label>
            <div className="md:col-span-2">
              <Button type="submit">Spara portal</Button>
            </div>
          </form>
        </Card>
      )}
    </LandlordShell>
  )
}
