export function ActivitySection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="min-w-0 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h2 className="font-ledger text-[17px] font-semibold text-[var(--color-ink)]">{title}</h2>
      <div className="mt-4 grid min-w-0 gap-4">{children}</div>
    </section>
  )
}
