export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string
  title: string
  description?: string
}) {
  return (
    <div className="max-w-2xl">
      {eyebrow ? (
        <div className="mb-3 inline-flex rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[#8a5d00]">
          {eyebrow}
        </div>
      ) : null}
      <h2 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">{title}</h2>
      {description ? <p className="mt-4 text-base leading-7 text-[var(--muted)]">{description}</p> : null}
    </div>
  )
}
