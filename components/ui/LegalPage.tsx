type LegalSection = {
  title: string
  body: string[]
}

type LegalPageProps = {
  title: string
  description: string
  updatedAt: string
  sections: LegalSection[]
}

export function LegalPage({ title, description, updatedAt, sections }: LegalPageProps) {
  return (
    <section className="bg-[#f6f7fb] py-14 md:py-20">
      <div className="container-shell">
        <div className="mx-auto max-w-4xl rounded-[36px] border border-[#e5e7eb] bg-white p-6 shadow-[0_22px_70px_rgba(15,23,42,0.07)] md:p-10">
          <div className="border-b border-[#e5e7eb] pb-8">
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[#5b3df5]">Bovaro</div>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-[#111827] md:text-5xl">{title}</h1>
            <p className="mt-4 text-base leading-8 text-[#5b6475]">{description}</p>
            <p className="mt-4 text-sm font-medium text-[#6b7280]">Senast uppdaterad: {updatedAt}</p>
          </div>

          <div className="mt-8 space-y-8">
            {sections.map((section, index) => (
              <section key={section.title}>
                <h2 className="text-xl font-semibold text-[#111827]">
                  {index + 1}. {section.title}
                </h2>
                <div className="mt-3 space-y-3 text-sm leading-7 text-[#374151] md:text-[15px]">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
