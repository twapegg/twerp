import { useEffect, useState } from 'react'
import { data } from '../lib/data'
import { todayIso } from '../lib/dates'
import type { Account, Category, Transaction } from '../lib/types'
import type { TransactionPatch } from '../lib/dataSource'
import TransactionRow from '../components/TransactionRow'
import Widget from '../components/Widget'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import Icon from '../components/Icon'
import QuickAdd from '../components/QuickAdd'

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [note, setNote] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [isExpense, setIsExpense] = useState(true)
  const [manual, setManual] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([data.getTransactions(), data.getCategories(), data.getAccounts()])
      .then(([tx, cat, acc]) => {
        if (cancelled) return
        setTransactions(tx)
        setCategories(cat)
        setAccounts(acc)
        setCategoryId(cat[0]?.id ?? '')
        setAccountId(acc[0]?.id ?? '')
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

  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]))

  async function refreshTransactions() {
    try {
      setTransactions(await data.getTransactions())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function handleUpdate(id: string, patch: TransactionPatch) {
    const updated = await data.updateTransaction(id, patch)
    setTransactions((prev) =>
      prev
        .map((t) => (t.id === id ? updated : t))
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    )
  }

  async function handleDelete(id: string) {
    await data.deleteTransaction(id)
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(amount)
    if (!note.trim() || !categoryId || !accountId || !Number.isFinite(parsed) || parsed === 0) return

    try {
      const created = await data.addTransaction({
        accountId,
        categoryId,
        amount: isExpense ? -Math.abs(parsed) : Math.abs(parsed),
        note: note.trim(),
        occurredAt: todayIso(),
      })

      setTransactions((prev) => [created, ...prev])
      setNote('')
      setAmount('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  if (loading) return <p className="px-1 text-sm text-muted">Loading…</p>

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Transactions" subtitle="Everything that's moved through your accounts." />
      {error && (
        <p className="rounded-[22px] bg-rust-light px-4 py-2.5 text-sm text-rust ring-1 ring-inset ring-rust/20">
          Something went wrong: {error}
        </p>
      )}

      {!manual ? (
        <QuickAdd
          accounts={accounts}
          categories={categories}
          onChanged={refreshTransactions}
          onManual={() => setManual(true)}
        />
      ) : (
      <Widget
        icon="plus"
        eyebrow="New"
        title="Add a transaction"
        style={{ animationDelay: '60ms' }}
        action={
          <button type="button" onClick={() => setManual(false)} className="btn btn-ghost btn-sm -mr-2">
            Quick add
          </button>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-5 gap-3">
            <input
              className="field col-span-2"
              placeholder="What was it for?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <input
              className="field"
              placeholder="0.00"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <select className="field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select className="field" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 flex items-center justify-between">
            {/* Segmented expense / income toggle */}
            <div className="track flex h-9 p-1" role="radiogroup" aria-label="Transaction type">
              {[
                { label: 'Expense', value: true },
                { label: 'Income', value: false },
              ].map((opt) => {
                const active = isExpense === opt.value
                return (
                  <button
                    key={opt.label}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setIsExpense(opt.value)}
                    className={`rounded-full px-4 text-xs font-medium transition-all duration-200 ease-spring ${
                      active ? 'glass-pill text-ink' : 'text-muted hover:text-ink'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
            <button type="submit" className="btn btn-primary">
              <Icon name="plus" className="h-4 w-4" strokeWidth={2.4} />
              Add transaction
            </button>
          </div>
        </form>
      </Widget>
      )}

      <Widget
        icon="list"
        eyebrow="History"
        title="All transactions"
        style={{ animationDelay: '120ms' }}
        action={<span className="text-xs tabular text-muted">{transactions.length}</span>}
      >
        <div className="flex flex-col">
          {transactions.map((t) => (
            <TransactionRow
              key={t.id}
              transaction={t}
              category={categoryById[t.categoryId]}
              categories={categories}
              accounts={accounts}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
          {transactions.length === 0 && <EmptyState title="Nothing here yet" hint="Add your first transaction above." />}
        </div>
      </Widget>
    </div>
  )
}
