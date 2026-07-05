'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Building2, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

type AccountType = 'private' | 'company'
type RegisterStatus = 'idle' | 'loading' | 'success' | 'error'

type RegisterErrors = Partial<Record<string, string>>

const inputClass =
  'h-14 rounded-2xl border border-[#d7dbe7] bg-white px-4 text-[15px] text-[#111827] placeholder:text-[#7a8396]'

const labelClass = 'mb-2 block text-sm font-semibold text-[#111827]'

function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

function validateOrganizationNumber(value: string) {
  const digits = onlyDigits(value)
  return digits.length === 10
}

function createSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function ErrorText({ errors, id }: { errors: RegisterErrors; id: string }) {
  if (!errors[id]) return null
  return <p className="mt-2 text-sm font-medium text-[#dc2626]">{errors[id]}</p>
}

export function RegisterForm() {
  const [accountType, setAccountType] = useState<AccountType>('private')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<RegisterStatus>('idle')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<RegisterErrors>({})

  const isCompany = accountType === 'company'

  const submitLabel = useMemo(() => {
    if (status === 'loading') return 'Skapar konto...'
    return isCompany ? 'Skapa företagskonto' : 'Skapa privatkonto'
  }, [isCompany, status])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setStatus('idle')
    setMessage('')

    const formData = new FormData(form)
    const nextErrors: RegisterErrors = {}

    const email = String(formData.get('email') ?? '').trim().toLowerCase()
    const password = String(formData.get('password') ?? '')
    const confirmPassword = String(formData.get('confirmPassword') ?? '')
    const phone = String(formData.get('phone') ?? '').trim()
    const termsAccepted = formData.get('termsAccepted') === 'on'
    const privacyAccepted = formData.get('privacyAccepted') === 'on'

    if (!email || !email.includes('@')) nextErrors.email = 'Ange en giltig e-postadress.'
    if (!phone) nextErrors.phone = 'Ange telefonnummer.'
    if (password.length < 8) nextErrors.password = 'Lösenordet måste vara minst 8 tecken.'
    if (password !== confirmPassword) nextErrors.confirmPassword = 'Lösenorden matchar inte.'
    if (!termsAccepted) nextErrors.termsAccepted = 'Du måste acceptera allmänna villkor.'
    if (!privacyAccepted) nextErrors.privacyAccepted = 'Du måste läsa och acceptera integritetspolicyn.'

    if (isCompany) {
      const companyName = String(formData.get('companyName') ?? '').trim()
      const organizationNumber = String(formData.get('organizationNumber') ?? '').trim()
      const contactFirstName = String(formData.get('contactFirstName') ?? '').trim()
      const contactLastName = String(formData.get('contactLastName') ?? '').trim()
      const advertiserTermsAccepted = formData.get('advertiserTermsAccepted') === 'on'
      const representativeConfirmed = formData.get('representativeConfirmed') === 'on'

      if (!companyName) nextErrors.companyName = 'Ange företagsnamn.'
      if (!validateOrganizationNumber(organizationNumber)) {
        nextErrors.organizationNumber = 'Ange organisationsnummer med 10 siffror.'
      }
      if (!contactFirstName) nextErrors.contactFirstName = 'Ange kontaktpersonens förnamn.'
      if (!contactLastName) nextErrors.contactLastName = 'Ange kontaktpersonens efternamn.'
      if (!advertiserTermsAccepted) nextErrors.advertiserTermsAccepted = 'Du måste acceptera annonsörsvillkoren.'
      if (!representativeConfirmed) nextErrors.representativeConfirmed = 'Du måste intyga att du får företräda företaget.'
    } else {
      const firstName = String(formData.get('firstName') ?? '').trim()
      const lastName = String(formData.get('lastName') ?? '').trim()

      if (!firstName) nextErrors.firstName = 'Ange förnamn.'
      if (!lastName) nextErrors.lastName = 'Ange efternamn.'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const supabase = createSupabaseBrowserClient()
    if (!supabase) {
      setStatus('error')
      setMessage('Supabase är inte konfigurerat. Kontrollera dina miljövariabler.')
      return
    }

    setStatus('loading')

    const firstName = isCompany
      ? String(formData.get('contactFirstName') ?? '').trim()
      : String(formData.get('firstName') ?? '').trim()
    const lastName = isCompany
      ? String(formData.get('contactLastName') ?? '').trim()
      : String(formData.get('lastName') ?? '').trim()

    const companyName = String(formData.get('companyName') ?? '').trim()
    const organizationNumber = String(formData.get('organizationNumber') ?? '').trim()
    const companySlug = companyName ? `${createSlug(companyName)}-${Date.now().toString(36)}` : null

    const onboardingPath = isCompany ? '/dashboard/listings?onboarding=1' : '/dashboard/profile?onboarding=1'

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(onboardingPath)}`,
        data: {
          account_type: accountType,
          first_name: firstName,
          last_name: lastName,
          phone,
          city: String(formData.get('city') ?? '').trim(),
          preferred_listing_intent: String(formData.get('preferredListingIntent') ?? 'both'),
          marketing_consent: formData.get('marketingConsent') === 'on',
          terms_accepted: true,
          privacy_accepted: true,
          advertiser_terms_accepted: isCompany,
          representative_confirmed: isCompany,
          company_name: companyName || null,
          company_slug: companySlug,
          organization_number: organizationNumber || null,
          company_email: String(formData.get('companyEmail') ?? email).trim().toLowerCase(),
          company_phone: String(formData.get('companyPhone') ?? phone).trim(),
          company_legal_form: String(formData.get('legalForm') ?? 'ab'),
          company_business_purpose: String(formData.get('businessPurpose') ?? 'rent_and_sale'),
          terms_version: '2026-05-09',
          privacy_version: '2026-05-09',
          advertiser_terms_version: '2026-05-09',
        },
      },
    })

    if (error) {
      setStatus('error')
      setMessage(error.message)
      return
    }

    setStatus('success')
    setMessage('Kontot är skapat. Kontrollera din e-post om verifiering krävs, annars kan du logga in direkt.')
    form.reset()
  }

  return (
    <div className="rounded-[36px] border border-[#e8ebf3] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-8 lg:p-10">
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setAccountType('private')}
          className={`rounded-3xl border p-5 text-left transition ${
            accountType === 'private'
              ? 'border-[#5b3df5] bg-[#f4f2ff] shadow-[0_16px_38px_rgba(91,61,245,0.12)]'
              : 'border-[#e5e7eb] bg-white hover:border-[#c7ccda]'
          }`}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#111827] text-white">
            <UserRound size={20} />
          </div>
          <div className="mt-4 text-lg font-semibold text-[#111827]">Privatperson</div>
          <p className="mt-2 text-sm leading-6 text-[#5b6475]">
            Sök, köp, hyr eller lägg senare upp en egen bostad.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setAccountType('company')}
          className={`rounded-3xl border p-5 text-left transition ${
            accountType === 'company'
              ? 'border-[#5b3df5] bg-[#f4f2ff] shadow-[0_16px_38px_rgba(91,61,245,0.12)]'
              : 'border-[#e5e7eb] bg-white hover:border-[#c7ccda]'
          }`}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#5b3df5] text-white">
            <Building2 size={20} />
          </div>
          <div className="mt-4 text-lg font-semibold text-[#111827]">Företag</div>
          <p className="mt-2 text-sm leading-6 text-[#5b6475]">
            För bolag som vill publicera och hantera bostäder professionellt.
          </p>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        <div>
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#5b3df5]">
            <Mail size={15} /> Konto
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className={labelClass}>E-post</label>
              <Input name="email" type="email" autoComplete="email" placeholder="namn@email.se" className={inputClass} />
              <ErrorText errors={errors} id="email" />
            </div>
            <div>
              <label className={labelClass}>Lösenord</label>
              <div className="relative">
                <Input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Minst 8 tecken"
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6b7280]"
                  aria-label={showPassword ? 'Dölj lösenord' : 'Visa lösenord'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <ErrorText errors={errors} id="password" />
            </div>
            <div>
              <label className={labelClass}>Bekräfta lösenord</label>
              <Input
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Upprepa lösenord"
                className={inputClass}
              />
              <ErrorText errors={errors} id="confirmPassword" />
            </div>
          </div>
        </div>

        {isCompany ? (
          <div>
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#5b3df5]">
              <Building2 size={15} /> Företagsuppgifter
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className={labelClass}>Företagsnamn</label>
                <Input name="companyName" placeholder="Exempel AB" className={inputClass} />
                <ErrorText errors={errors} id="companyName" />
              </div>
              <div>
                <label className={labelClass}>Organisationsnummer</label>
                <Input name="organizationNumber" placeholder="559000-0000" className={inputClass} />
                <ErrorText errors={errors} id="organizationNumber" />
              </div>
              <div>
                <label className={labelClass}>Företagsmejl</label>
                <Input name="companyEmail" type="email" placeholder="info@foretag.se" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Telefonnummer</label>
                <Input name="companyPhone" placeholder="08-000 00 00" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Bolagsform</label>
                <Select name="legalForm" defaultValue="ab" className={inputClass}>
                  <option value="ab">Aktiebolag</option>
                  <option value="enskild_firma">Enskild firma</option>
                  <option value="other">Annat</option>
                </Select>
              </div>
              <div>
                <label className={labelClass}>Användning</label>
                <Select name="businessPurpose" defaultValue="rent_and_sale" className={inputClass}>
                  <option value="rent">Hyra ut bostäder</option>
                  <option value="sale">Sälja bostäder</option>
                  <option value="rent_and_sale">Både hyra ut och sälja</option>
                  <option value="property_management">Förvalta bostäder</option>
                </Select>
              </div>
              <div>
                <label className={labelClass}>Kontaktperson förnamn</label>
                <Input name="contactFirstName" placeholder="Förnamn" className={inputClass} />
                <ErrorText errors={errors} id="contactFirstName" />
              </div>
              <div>
                <label className={labelClass}>Kontaktperson efternamn</label>
                <Input name="contactLastName" placeholder="Efternamn" className={inputClass} />
                <ErrorText errors={errors} id="contactLastName" />
              </div>
              <div>
                <label className={labelClass}>Kontaktperson telefon</label>
                <Input name="phone" placeholder="070-000 00 00" className={inputClass} />
                <ErrorText errors={errors} id="phone" />
              </div>
              <div>
                <label className={labelClass}>Stad</label>
                <Input name="city" placeholder="Stockholm" className={inputClass} />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#5b3df5]">
              <UserRound size={15} /> Privatperson
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className={labelClass}>Förnamn</label>
                <Input name="firstName" autoComplete="given-name" placeholder="Förnamn" className={inputClass} />
                <ErrorText errors={errors} id="firstName" />
              </div>
              <div>
                <label className={labelClass}>Efternamn</label>
                <Input name="lastName" autoComplete="family-name" placeholder="Efternamn" className={inputClass} />
                <ErrorText errors={errors} id="lastName" />
              </div>
              <div>
                <label className={labelClass}>Telefonnummer</label>
                <Input name="phone" autoComplete="tel" placeholder="070-000 00 00" className={inputClass} />
                <ErrorText errors={errors} id="phone" />
              </div>
              <div>
                <label className={labelClass}>Stad</label>
                <Input name="city" placeholder="Stockholm" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Jag är främst intresserad av</label>
                <Select name="preferredListingIntent" defaultValue="both" className={inputClass}>
                  <option value="rent">Hyra</option>
                  <option value="buy">Köpa</option>
                  <option value="both">Båda</option>
                </Select>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-3xl border border-[#e5e7eb] bg-[#f8fafc] p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#5b3df5]">
            <ShieldCheck size={15} /> Villkor och samtycken
          </div>

          <div className="space-y-4 text-sm leading-6 text-[#374151]">
            <label className="flex gap-3">
              <input name="termsAccepted" type="checkbox" className="mt-1 h-4 w-4 accent-[#5b3df5]" />
              <span>
                Jag accepterar Bovaros{' '}
                <Link href="/terms" className="font-semibold text-[#5b3df5] hover:underline" target="_blank">
                  allmänna villkor
                </Link>
                .
              </span>
            </label>
            <ErrorText errors={errors} id="termsAccepted" />

            <label className="flex gap-3">
              <input name="privacyAccepted" type="checkbox" className="mt-1 h-4 w-4 accent-[#5b3df5]" />
              <span>
                Jag har läst Bovaros{' '}
                <Link href="/privacy" className="font-semibold text-[#5b3df5] hover:underline" target="_blank">
                  integritetspolicy
                </Link>
                .
              </span>
            </label>
            <ErrorText errors={errors} id="privacyAccepted" />

            {!isCompany ? (
              <p className="rounded-2xl bg-[#eef2ff] px-4 py-3 text-xs leading-5 text-[#3730a3]">
                Identitetsverifiering med personnummer görs separat efter registreringen och krävs först när du ska
                skicka en bostadsansökan.
              </p>
            ) : (
              <>
                <label className="flex gap-3">
                  <input name="advertiserTermsAccepted" type="checkbox" className="mt-1 h-4 w-4 accent-[#5b3df5]" />
                  <span>
                    Jag accepterar Bovaros{' '}
                    <Link href="/advertiser-terms" className="font-semibold text-[#5b3df5] hover:underline" target="_blank">
                      annonsörsvillkor
                    </Link>
                    .
                  </span>
                </label>
                <ErrorText errors={errors} id="advertiserTermsAccepted" />

                <label className="flex gap-3">
                  <input name="representativeConfirmed" type="checkbox" className="mt-1 h-4 w-4 accent-[#5b3df5]" />
                  <span>Jag intygar att jag har rätt att företräda företaget.</span>
                </label>
                <ErrorText errors={errors} id="representativeConfirmed" />
              </>
            )}

            <label className="flex gap-3">
              <input name="marketingConsent" type="checkbox" className="mt-1 h-4 w-4 accent-[#5b3df5]" />
              <span>Jag vill få relevanta bostadstips och produktnyheter via e-post. Valfritt.</span>
            </label>
          </div>
        </div>

        {message ? (
          <div
            className={`rounded-2xl p-4 text-sm font-medium ${
              status === 'success' ? 'bg-[#ecfdf3] text-[#166534]' : 'bg-[#fef2f2] text-[#b91c1c]'
            }`}
          >
            {message}
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={status === 'loading'}
          className="h-14 w-full rounded-2xl bg-[#5b3df5] !text-white hover:bg-[#4c31d8]"
        >
          {status === 'success' ? <CheckCircle2 size={18} className="mr-2" /> : <LockKeyhole size={18} className="mr-2" />}
          {submitLabel}
        </Button>

        <p className="text-center text-sm text-[#6b7280]">
          Har du redan konto?{' '}
          <Link href="/login" className="font-semibold text-[#5b3df5] hover:underline">
            Logga in
          </Link>
        </p>
      </form>
    </div>
  )
}
