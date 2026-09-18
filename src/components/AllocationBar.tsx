import Widget from './Widget'

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

type Segment = {
  label: string
  amount: number
  displayAmount: number
  colorClass: string
}

export default function AllocationBar({
  income,
  fixedBills,
  savings,
  debts = 0,
  goals = 0,
  savingsEarmarked = 0,
}: {
  income: number
  fixedBills: number
  savings: number
  /** Sum of monthly debt payments. */
  debts?: number
  /** Monthly goal set-asides that are extra, on top of savings. */
  goals?: number
  /** Part of the savings figure already earmarked for goals funded from savings. */
  savingsEarmarked?: number
}) {
  const buffer = income - fixedBills - savings - debts - goals
  const overCommitted = buffer < 0

  const segments: Segment[] = [
    { label: 'Bills', amount: fixedBills, displayAmount: fixedBills, colorClass: 'bg-chart-rose' },
    { label: 'Debts', amount: debts, displayAmount: debts, colorClass: 'bg-chart-violet' },
    { label: 'Savings', amount: savings, displayAmount: savings, colorClass: 'bg-chart-cyan' },
    { label: 'Goals', amount: goals, displayAmount: goals, colorClass: 'bg-mint' },
    { label: 'Buffer', amount: Math.max(0, buffer), displayAmount: buffer, colorClass: 'bg-chart-amber' },
  ].filter((seg) => (seg.label !== 'Debts' || debts > 0) && (seg.label !== 'Goals' || goals > 0))

  const total = income > 0 ? income : segments.reduce((s, seg) => s + seg.amount, 0) || 1

  return (
    <Widget
      icon="stack"
      eyebrow="Paycheck"
      title="Allocation"
      action={<span className="text-xs tabular text-muted">₱{fmt(income)} / mo</span>}
    >
      <div className="track flex h-7 w-full gap-[3px] p-[3px]">
        {segments.map((seg) => {
          const pct = (seg.amount / total) * 100
          if (pct <= 0) return null
          return (
            <div
              key={seg.label}
              className={`fill rounded-full ${seg.colorClass}`}
              style={{ width: `calc(${pct}% - 2px)` }}
              title={`${seg.label}: ₱${fmt(seg.displayAmount)}`}
            />
          )
        })}
      </div>

      <div className="mt-4 grid gap-3" style={{ gridTemplateColumns: `repeat(${segments.length}, minmax(0, 1fr))` }}>
        {segments.map((seg) => (
          <div key={seg.label} className="rounded-[24px] bg-ink/[0.05] px-4 py-3.5 ring-1 ring-inset ring-ink/[0.06]">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${seg.colorClass} shadow-[0_0_8px_currentColor]`} />
              <span className="text-xs text-muted">{seg.label}</span>
            </div>
            <p className={`mt-1.5 text-sm tabular ${seg.displayAmount < 0 ? 'text-rust' : 'text-ink'}`}>
              ₱{fmt(seg.displayAmount)}
            </p>
          </div>
        ))}
      </div>

      {savingsEarmarked > savings + 0.005 && (
        <p className="mt-4 rounded-[24px] bg-chart-amber/[0.14] px-4 py-3 text-sm text-ink ring-1 ring-inset ring-chart-amber/30">
          Goals funded from savings need ₱{fmt(savingsEarmarked)} a month, but the Savings budget is ₱{fmt(savings)}. Raise the
          Savings limit or switch a goal to extra.
        </p>
      )}

      {overCommitted && (
        <p className="mt-4 rounded-[24px] bg-rust-light px-4 py-3 text-sm text-rust ring-1 ring-inset ring-rust/20">
          {debts > 0 || goals > 0 ? 'Bills, debt payments, savings and goals' : 'Bills + savings'} exceed the paycheck by ₱
          {fmt(Math.abs(buffer))}. There is no buffer left this month.
        </p>
      )}
    </Widget>
  )
}
