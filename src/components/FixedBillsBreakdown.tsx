import type { Budget, Category } from '../lib/types'
import Widget from './Widget'

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function FixedBillsBreakdown({
  budgets,
  categories,
  income,
  style,
}: {
  budgets: Budget[]
  categories: Category[]
  income: number
  style?: React.CSSProperties
}) {
  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]))

  const rows = budgets
    .filter((b) => categoryById[b.categoryId]?.kind === 'expense')
    .map((b) => ({ name: categoryById[b.categoryId]?.name ?? 'Unknown', amount: b.limitAmount }))
    .sort((a, b) => b.amount - a.amount)

  const max = rows.length ? Math.max(...rows.map((r) => r.amount)) : 0
  const total = rows.reduce((s, r) => s + r.amount, 0)

  return (
    <Widget
      icon="arrowDown"
      eyebrow="Monthly"
      title="Bills"
      className="flex h-full flex-col"
      style={style}
      action={rows.length > 0 ? <span className="text-xs tabular text-muted"><span className="text-ink">₱{fmt(total)}</span> / mo</span> : undefined}
    >
      {rows.length === 0 && <p className="text-sm text-muted">No expense limits yet. Add categories under Limits below.</p>}
      {/* flex-1 + justify-between: rows spread to fill whatever height the neighbouring card sets. */}
      <div className="flex flex-1 flex-col justify-between gap-3">
        {rows.map((r) => {
          const pctOfMax = (r.amount / max) * 100
          const pctOfIncome = income > 0 ? (r.amount / income) * 100 : 0
          return (
            <div key={r.name} className="flex items-center gap-4">
              <span className="w-32 shrink-0 truncate text-sm font-medium">{r.name}</span>
              <div className="track h-4 flex-1">
                <div className="fill bg-chart-rose" style={{ width: `${pctOfMax}%` }} />
              </div>
              <span className="w-40 shrink-0 whitespace-nowrap text-right text-xs tabular text-muted">
                <span className="text-ink">₱{fmt(r.amount)}</span>
                <span className="mx-1.5 opacity-50">·</span>
                {pctOfIncome.toFixed(1)}% of pay
              </span>
            </div>
          )
        })}
      </div>
    </Widget>
  )
}
