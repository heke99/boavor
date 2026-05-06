import Link from 'next/link'

export default function NotFound() {
  return (
    <section className="container-shell py-24 text-center">
      <h1 className="text-5xl font-semibold">Sidan hittades inte</h1>
      <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">
        Det du söker finns inte här just nu. Gå tillbaka till Bovaro och fortsätt därifrån.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white"
      >
        Till startsidan
      </Link>
    </section>
  )
}
