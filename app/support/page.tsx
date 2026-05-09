import Link from 'next/link'
import { Mail, ShieldCheck } from 'lucide-react'

export default function SupportPage() {
  return (
    <section className="bg-[#f6f7fb] py-14 md:py-20">
      <div className="container-shell">
        <div className="mx-auto max-w-3xl rounded-[36px] border border-[#e5e7eb] bg-white p-8 shadow-[0_22px_70px_rgba(15,23,42,0.07)] md:p-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#5b3df5]">
            <ShieldCheck size={24} />
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-[-0.03em] text-[#111827]">Support och kontakt</h1>
          <p className="mt-4 text-base leading-8 text-[#5b6475]">
            Här kan användare kontakta Bovaro kring konto, personuppgifter, annonser, ansökningar eller företagsverifiering.
          </p>
          <div className="mt-8 rounded-3xl bg-[#f8fafc] p-5">
            <div className="flex items-center gap-3 text-[#111827]">
              <Mail size={20} />
              <div>
                <div className="font-semibold">E-post</div>
                <p className="text-sm text-[#5b6475]">Lägg in er riktiga supportadress innan lansering.</p>
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3 text-sm font-semibold">
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
    </section>
  )
}
