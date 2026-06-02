import { Metadata } from 'next'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'

export const metadata: Metadata = {
  title: 'Återställ lösenord | Bovaro',
  description: 'Återställ lösenordet till ditt Bovaro-konto på ett säkert sätt.',
  robots: { index: false, follow: false },
}

export default function ResetPasswordPage() {
  return (
    <section className="bg-[#f6f7fb] py-14 md:py-20">
      <div className="container-shell">
        <div className="mx-auto max-w-md">
          <ResetPasswordForm />
        </div>
      </div>
    </section>
  )
}
