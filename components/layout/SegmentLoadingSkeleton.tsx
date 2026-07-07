/** Shared loading skeleton for the dashboard/landlord/admin segments. */
export function SegmentLoadingSkeleton() {
  return (
    <section className="container-shell py-12">
      <div className="rounded-[32px] border border-[#e8ebf3] bg-white p-8 shadow-sm">
        <div className="h-5 w-40 animate-pulse rounded-full bg-[#e8ebf3]" />
        <div className="mt-6 h-10 max-w-xl animate-pulse rounded-2xl bg-[#eef0f6]" />
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="h-32 animate-pulse rounded-3xl bg-[#f3f4f6]" />
          <div className="h-32 animate-pulse rounded-3xl bg-[#f3f4f6]" />
          <div className="h-32 animate-pulse rounded-3xl bg-[#f3f4f6]" />
        </div>
      </div>
    </section>
  )
}
