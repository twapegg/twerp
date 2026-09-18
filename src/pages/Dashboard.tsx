import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { data } from '../lib/data'
import { isCurrentMonth } from '../lib/dates'
import type { Account, Budget, Category, Transaction } from '../lib/types'
import StatCard from '../components/StatCard'
import BudgetBar from '../components/BudgetBar'
import TransactionRow from '../components/TransactionRow'
import Widget from '../components/Widget'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import AccountFlow from '../components/AccountFlow'

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([data.getTransactions(), data.getCategories(), data.getBudgets(), data.getAccounts()])
      .then(([tx, cat, bud, acc]) => {
        if (cancelled) return
        setTransactions(tx)
        setCategories(cat)
        setBudgets(bud)
        setAccounts(acc)
        setLoading(false)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) return <p className="text-sm text-rust">Something went wrong: {error}</p>
  if (loading) return <p className="px-1 text-sm text-muted">Loading…</p>

  // Every figure on this page is "this month"; the recent list below is the only place older rows show.
  const monthTx = transactions.filter((t) => isCurrentMonth(t.occurredAt))
  const income = monthTx.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
  const expenses = monthTx.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)
  const balance = income + expenses
  const savedPct = income > 0 ? Math.round((balance / income) * 100) : 0

  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]))
  const spentByCategory = (categoryId: string) =>
    monthTx
      .filter((t) => t.categoryId === categoryId && t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  // Only show accounts that actually moved money this month.
  const activeAccounts = accounts.filter((a) => monthTx.some((t) => t.accountId === a.id))

  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" subtitle={`Where things stand in ${monthLabel}.`} />

      {/* Stat widgets */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Balance"
          amount={balance}
          tone={balance >= 0 ? 'mint' : 'rust'}
          icon="scale"
          hint={income > 0 ? `${savedPct}% of income kept` : undefined}
          delay={40}
        />
        <StatCard label="Income" amount={income} tone="pine" icon="arrowUp" hint="This month" delay={80} />
        <StatCard label="Spent" amount={expenses} icon="arrowDown" hint={`${monthTx.filter((t) => t.amount < 0).length} transactions`} delay={120} />
      </div>

      {/* Per-account flow: where GCash / BPI money is going */}
      {activeAccounts.length > 0 && (
        <div className={`grid gap-4 ${activeAccounts.length === 1 ? 'grid-cols-1' : activeAccounts.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {activeAccounts.map((a, i) => (
            <AccountFlow key={a.id} account={a} transactions={monthTx} categories={categories} delay={140 + i * 40} />
          ))}
        </div>
      )}

      {/* Content widgets */}
      <div className="grid grid-cols-5 gap-4">
        <Widget
          icon="chart"
          eyebrow="This month"
          title="Budgets"
          className="col-span-2"
          style={{ animationDelay: '160ms' }}
          action={
            <Link to="/budgets" className="btn btn-ghost btn-sm -mr-2">
              See all
            </Link>
          }
        >
          <div className="flex flex-col gap-4">
            {budgets.map((b) => (
              <BudgetBar
                key={b.id}
                name={categoryById[b.categoryId]?.name ?? 'Unknown'}
                spent={spentByCategory(b.categoryId)}
                limit={b.limitAmount}
              />
            ))}
            {budgets.length === 0 && <EmptyState title="No budgets yet" hint="Set monthly limits on the Budgets page." />}
          </div>
        </Widget>

        <Widget
          icon="list"
          eyebrow="Activity"
          title="Recent transactions"
          className="col-span-3"
          style={{ animationDelay: '200ms' }}
          action={
            <Link to="/transactions" className="btn btn-ghost btn-sm -mr-2">
              See all
            </Link>
          }
        >
          <div className="flex flex-col">
            {transactions.slice(0, 6).map((t) => (
              <TransactionRow key={t.id} transaction={t} category={categoryById[t.categoryId]} />
            ))}
            {transactions.length === 0 && <EmptyState title="Nothing here yet" hint="Add a transaction and it will show up here." />}
          </div>
        </Widget>
      </div>
    </div>
  )
}
