const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function BudgetBar({
  name,
  spent,
  limit,
}: {
  name: string
  spent: number
  limit: number
}) {
  const ratio = limit > 0 ? spent / limit : 0
  const pct = Math.min(100, Math.round(ratio * 100))
  const over = spent > limit
  const near = !over && ratio >= 0.85
  const fillColor = over ? 'bg-rust' : near ? 'bg-chart-amber' : 'bg-pine'

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="truncate text-sm font-medium">{name}</span>
        <span className="shrink-0 text-xs tabular text-muted">
          <span className={over ? 'text-rust' : 'text-ink'}>₱{fmt(spent)}</span>
          <span className="mx-1 opacity-60">/</span>₱{fmt(limit)}
        </span>
      </div>
      <div className="track h-2 w-full">
        <div className={`fill ${fillColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
