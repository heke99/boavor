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
    <div className="max-w-3xl">
      {eyebrow ? (
        <div className="mb-4 inline-flex rounded-full border border-[#fed7aa] bg-[#fff7ed] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#9a5b00] shadow-sm">
          {eyebrow}
        </div>
      ) : null}
      <h2 className="text-3xl font-semibold tracking-[-0.035em] text-[var(--foreground)] md:text-5xl">{title}</h2>
      {description ? <p className="mt-5 text-base leading-8 text-[var(--muted)] md:text-lg">{description}</p> : null}
    </div>
  )
}
