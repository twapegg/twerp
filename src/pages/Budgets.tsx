import { useEffect, useState } from 'react'
import { data } from '../lib/data'
import { isCurrentMonth } from '../lib/dates'
import type { Budget, Category, Debt, Goal, Income, Transaction } from '../lib/types'
import type { DebtPatch, NewDebtInput } from '../lib/dataSource'
import BudgetBar from '../components/BudgetBar'
import AllocationBar from '../components/AllocationBar'
import FixedBillsBreakdown from '../components/FixedBillsBreakdown'
import DebtsPanel from '../components/DebtsPanel'
import Widget from '../components/Widget'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import Icon from '../components/Icon'

export default function Budgets() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [income, setIncome] = useState<Income | null>(null)
  const [debts, setDebts] = useState<Debt[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Inline limit editing
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftLimit, setDraftLimit] = useState('')

  // Customize mode: add / remove categories
  const [customizing, setCustomizing] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newKind, setNewKind] = useState<Category['kind']>('expense')
  const [newLimit, setNewLimit] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([data.getBudgets(), data.getCategories(), data.getTransactions(), data.getIncome(), data.getDebts(), data.getGoals()])
      .then(([bud, cat, tx, inc, dbt, gls]) => {
        if (cancelled) return
        setBudgets(bud)
        setCategories(cat)
        setTransactions(tx)
        setIncome(inc)
        setDebts(dbt)
        setGoals(gls)
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

  if (loading) return <p className="px-1 text-sm text-muted">Loading…</p>

  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]))
  // Limits are monthly, so only this month's spending counts against them.
  const monthTx = transactions.filter((t) => isCurrentMonth(t.occurredAt))
  const spentByCategory = (categoryId: string) =>
    monthTx
      .filter((t) => t.categoryId === categoryId && t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const fixedBillsTotal = budgets
    .filter((b) => categoryById[b.categoryId]?.kind === 'expense')
    .reduce((sum, b) => sum + b.limitAmount, 0)
  const savingsTotal = budgets
    .filter((b) => categoryById[b.categoryId]?.kind === 'savings')
    .reduce((sum, b) => sum + b.limitAmount, 0)
  const debtPaymentsTotal = debts.reduce((sum, d) => sum + d.monthlyPayment, 0)
  const activeGoals = goals.filter((g) => !g.achievedAt)
  const goalsExtraTotal = activeGoals.filter((g) => !g.fundedFromSavings).reduce((sum, g) => sum + g.monthlyContribution, 0)
  const goalsFromSavingsTotal = activeGoals.filter((g) => g.fundedFromSavings).reduce((sum, g) => sum + g.monthlyContribution, 0)

  function startEdit(b: Budget) {
    setEditingId(b.id)
    setDraftLimit(String(b.limitAmount))
  }

  async function saveEdit(b: Budget) {
    const parsed = parseFloat(draftLimit)
    if (!Number.isNaN(parsed)) {
      try {
        const updated = await data.updateBudgetLimit(b.id, parsed)
        setBudgets((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    }
    setEditingId(null)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    const parsed = parseFloat(newLimit)
    if (!name || Number.isNaN(parsed) || parsed < 0) return
    setAdding(true)
    try {
      const { category, budget } = await data.addBudget({ name, kind: newKind, limitAmount: parsed })
      setCategories((prev) => [...prev, category])
      setBudgets((prev) => [...prev, budget])
      setNewName('')
      setNewLimit('')
      setNewKind('expense')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(b: Budget) {
    setBusyId(b.id)
    try {
      const { categoryRemoved } = await data.deleteBudget(b.id)
      setBudgets((prev) => prev.filter((x) => x.id !== b.id))
      if (categoryRemoved) setCategories((prev) => prev.filter((c) => c.id !== b.categoryId))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
      setRemovingId(null)
    }
  }

  async function handleAddDebt(input: NewDebtInput) {
    const created = await data.addDebt(input)
    setDebts((prev) => [...prev, created])
  }

  async function handleUpdateDebt(id: string, patch: DebtPatch) {
    const updated = await data.updateDebt(id, patch)
    setDebts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
  }

  async function handleDeleteDebt(id: string) {
    await data.deleteDebt(id)
    setDebts((prev) => prev.filter((d) => d.id !== id))
  }

  const sortedBudgets = [...budgets].sort((a, b) => {
    const ka = categoryById[a.categoryId]?.kind ?? 'expense'
    const kb = categoryById[b.categoryId]?.kind ?? 'expense'
    if (ka !== kb) return ka === 'expense' ? -1 : 1
    return b.limitAmount - a.limitAmount
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Budgets" subtitle="Monthly limits by category." />
      {error && (
        <p className="rounded-[22px] bg-rust-light px-4 py-2.5 text-sm text-rust ring-1 ring-inset ring-rust/20">
          Something went wrong: {error}
        </p>
      )}

      {income && (
        <AllocationBar
          income={income.monthlyAmount}
          fixedBills={fixedBillsTotal}
          savings={savingsTotal}
          debts={debtPaymentsTotal}
          goals={goalsExtraTotal}
          savingsEarmarked={goalsFromSavingsTotal}
        />
      )}

      <div className="grid grid-cols-2 gap-4">
        <DebtsPanel
          debts={debts}
          income={income?.monthlyAmount ?? null}
          onAdd={handleAddDebt}
          onUpdate={handleUpdateDebt}
          onDelete={handleDeleteDebt}
          onError={setError}
          style={{ animationDelay: '80ms' }}
        />
        <FixedBillsBreakdown
          budgets={budgets}
          categories={categories}
          income={income?.monthlyAmount ?? 0}
          style={{ animationDelay: '100ms' }}
        />
      </div>

      <Widget
        icon="stack"
        eyebrow="Limits"
        title="All categories"
        style={{ animationDelay: '120ms' }}
        action={
          <button
            onClick={() => {
              setCustomizing((v) => !v)
              setRemovingId(null)
            }}
            className={`btn btn-sm ${customizing ? 'btn-primary' : 'btn-glass'}`}
            aria-pressed={customizing}
          >
            <Icon name={customizing ? 'check' : 'sliders'} className="h-3.5 w-3.5" strokeWidth={2.2} />
            {customizing ? 'Done' : 'Customize'}
          </button>
        }
      >
        <div className="flex flex-col gap-5">
          {sortedBudgets.map((b) => {
            const category = categoryById[b.categoryId]
            const isRemoving = removingId === b.id
            const busy = busyId === b.id
            return (
              <div key={b.id} className="flex items-center gap-4">
                {customizing && (
                  <span
                    className={`glass-badge h-7 w-7 shrink-0 text-[10px] font-semibold uppercase tracking-wide ${
                      category?.kind === 'savings' ? 'text-pine' : 'text-muted'
                    }`}
                    title={category?.kind === 'savings' ? 'Savings' : 'Expense'}
                  >
                    {category?.kind === 'savings' ? 'S' : 'E'}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <BudgetBar
                    name={category?.name ?? 'Unknown'}
                    spent={spentByCategory(b.categoryId)}
                    limit={b.limitAmount}
                  />
                </div>

                {isRemoving ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">Remove?</span>
                    <button onClick={() => handleRemove(b)} disabled={busy} className="btn btn-sm bg-rust text-onaccent">
                      <Icon name="trash" className="h-3.5 w-3.5" strokeWidth={2.1} />
                      {busy ? 'Removing…' : 'Yes, remove'}
                    </button>
                    <button onClick={() => setRemovingId(null)} disabled={busy} className="btn btn-glass btn-sm">
                      Keep
                    </button>
                  </div>
                ) : editingId === b.id ? (
                  <form
                    className="flex items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      saveEdit(b)
                    }}
                  >
                    <input
                      autoFocus
                      className="field w-28"
                      inputMode="decimal"
                      value={draftLimit}
                      onChange={(e) => setDraftLimit(e.target.value)}
                      onKeyDown={(e) => e.key === 'Escape' && setEditingId(null)}
                    />
                    <button type="submit" className="btn btn-primary btn-sm">
                      <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.4} />
                      Save
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={() => startEdit(b)} className="btn btn-glass btn-sm">
                      <Icon name="pencil" className="h-3.5 w-3.5" strokeWidth={2} />
                      Edit limit
                    </button>
                    {customizing && (
                      <button
                        onClick={() => setRemovingId(b.id)}
                        className="btn btn-ghost h-8 w-8 rounded-full p-0 text-rust hover:bg-rust-light hover:text-rust"
                        aria-label={`Remove ${category?.name ?? 'category'}`}
                      >
                        <Icon name="trash" className="h-4 w-4" strokeWidth={2} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {budgets.length === 0 && <EmptyState title="No budgets yet" hint="Use Customize to add your first category." />}

          {customizing && (
            <form
              onSubmit={handleAdd}
              className="mt-1 flex flex-col gap-3 rounded-[26px] bg-ink/[0.04] p-4 ring-1 ring-inset ring-ink/[0.06]"
            >
              <div className="flex items-center gap-2.5">
                <span className="glass-badge text-mint">
                  <Icon name="plus" className="h-[15px] w-[15px]" strokeWidth={2.4} />
                </span>
                <div className="leading-tight">
                  <p className="eyebrow">New</p>
                  <p className="text-[15px] font-semibold tracking-tight">Add a category</p>
                </div>
              </div>
              <div className="grid grid-cols-6 gap-3">
                <input
                  className="field col-span-3"
                  placeholder="Name, e.g. Electricity"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <input
                  className="field col-span-1"
                  placeholder="0.00"
                  inputMode="decimal"
                  value={newLimit}
                  onChange={(e) => setNewLimit(e.target.value)}
                />
                <div className="track col-span-2 flex h-[42px] p-1" role="radiogroup" aria-label="Category kind">
                  {(
                    [
                      { label: 'Expense', value: 'expense' },
                      { label: 'Savings', value: 'savings' },
                    ] as { label: string; value: Category['kind'] }[]
                  ).map((opt) => {
                    const active = newKind === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setNewKind(opt.value)}
                        className={`flex-1 rounded-full text-xs font-medium transition-all duration-200 ease-spring ${
                          active ? 'glass-pill text-ink' : 'text-muted hover:text-ink'
                        }`}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted">
                  Expense limits count toward fixed bills. Savings targets count toward savings.
                </p>
                <button type="submit" disabled={adding || !newName.trim() || !newLimit} className="btn btn-primary btn-sm">
                  <Icon name="plus" className="h-3.5 w-3.5" strokeWidth={2.4} />
                  {adding ? 'Adding…' : 'Add category'}
                </button>
              </div>
            </form>
          )}
        </div>
      </Widget>

    </div>
  )
}
