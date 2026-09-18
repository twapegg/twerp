import { useState } from 'react'
import type { Debt } from '../lib/types'
import type { DebtPatch, NewDebtInput } from '../lib/dataSource'
import Widget from './Widget'
import Icon from './Icon'
import EmptyState from './EmptyState'

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
/** Whole pesos: the debt card is dense, and centavos add nothing there. */
const fmt0 = (n: number) => Math.round(n).toLocaleString('en-US')

const ordinal = (day: number) => {
  const mod100 = day % 100
  if (mod100 >= 11 && mod100 <= 13) return `${day}th`
  switch (day % 10) {
    case 1:
      return `${day}st`
    case 2:
      return `${day}nd`
    case 3:
      return `${day}rd`
    default:
      return `${day}th`
  }
}

/**
 * Months until a debt is cleared at the current payment, compounding the
 * annual rate monthly. Returns null when the payment does not even cover the
 * interest, so the balance never shrinks.
 */
export function monthsToPayoff(debt: Debt): number | null {
  if (debt.balance <= 0) return 0
  if (debt.monthlyPayment <= 0) return null
  const r = debt.interestRate / 100 / 12
  if (r === 0) return Math.ceil(debt.balance / debt.monthlyPayment)
  if (debt.monthlyPayment <= debt.balance * r) return null
  return Math.ceil(-Math.log(1 - (r * debt.balance) / debt.monthlyPayment) / Math.log(1 + r))
}

function horizonLabel(months: number | null) {
  if (months === null) return 'not at this pace'
  if (months === 0) return 'paid off'
  if (months === 1) return '1 mo'
  if (months < 24) return `${months} mo`
  const years = Math.floor(months / 12)
  const rest = months % 12
  return rest === 0 ? `${years}y` : `${years}y ${rest}m`
}

function payoffLabel(months: number | null) {
  if (months === null) return 'Covers interest only'
  if (months === 0) return 'Paid off'
  if (months === 1) return 'Clears next month'
  return `~${horizonLabel(months)} left`
}

type DraftDebt = {
  name: string
  balance: string
  originalAmount: string
  monthlyPayment: string
  interestRate: string
  dueDay: string
}

const emptyDraft: DraftDebt = { name: '', balance: '', originalAmount: '', monthlyPayment: '', interestRate: '', dueDay: '' }

const draftFrom = (d: Debt): DraftDebt => ({
  name: d.name,
  balance: String(d.balance),
  originalAmount: String(d.originalAmount),
  monthlyPayment: String(d.monthlyPayment),
  interestRate: String(d.interestRate),
  dueDay: d.dueDay === null ? '' : String(d.dueDay),
})

/** Validates a draft; returns null if any required field is missing or malformed. */
function parseDraft(draft: DraftDebt): NewDebtInput | null {
  const name = draft.name.trim()
  const balance = parseFloat(draft.balance)
  const monthlyPayment = parseFloat(draft.monthlyPayment)
  const originalRaw = draft.originalAmount.trim()
  const originalAmount = originalRaw === '' ? balance : parseFloat(originalRaw)
  const rateRaw = draft.interestRate.trim()
  const interestRate = rateRaw === '' ? 0 : parseFloat(rateRaw)
  const dueRaw = draft.dueDay.trim()
  const dueDay = dueRaw === '' ? null : parseInt(dueRaw, 10)

  if (!name) return null
  if ([balance, monthlyPayment, originalAmount, interestRate].some((n) => Number.isNaN(n) || n < 0)) return null
  if (dueDay !== null && (Number.isNaN(dueDay) || dueDay < 1 || dueDay > 31)) return null

  // What was borrowed can never be less than what is still owed.
  return { name, balance, originalAmount: Math.max(originalAmount, balance), monthlyPayment, interestRate, dueDay }
}

function DebtFields({
  draft,
  onChange,
  autoFocusName = false,
}: {
  draft: DraftDebt
  onChange: (next: DraftDebt) => void
  autoFocusName?: boolean
}) {
  const set = (key: keyof DraftDebt) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...draft, [key]: e.target.value })
  return (
    <div className="grid grid-cols-6 gap-3">
      <label className="col-span-6 flex flex-col gap-1">
        <span className="eyebrow pl-3">Name</span>
        <input autoFocus={autoFocusName} className="field" placeholder="e.g. Car loan" value={draft.name} onChange={set('name')} />
      </label>
      <label className="col-span-2 flex flex-col gap-1">
        <span className="eyebrow pl-3">Owed now</span>
        <input className="field" placeholder="0.00" inputMode="decimal" value={draft.balance} onChange={set('balance')} />
      </label>
      <label className="col-span-2 flex flex-col gap-1">
        <span className="eyebrow pl-3">Borrowed</span>
        <input className="field" placeholder="Same" inputMode="decimal" value={draft.originalAmount} onChange={set('originalAmount')} />
      </label>
      <label className="col-span-2 flex flex-col gap-1">
        <span className="eyebrow pl-3">Per month</span>
        <input className="field" placeholder="0.00" inputMode="decimal" value={draft.monthlyPayment} onChange={set('monthlyPayment')} />
      </label>
      <label className="col-span-3 flex flex-col gap-1">
        <span className="eyebrow pl-3">Rate % per year</span>
        <input className="field" placeholder="0" inputMode="decimal" value={draft.interestRate} onChange={set('interestRate')} />
      </label>
      <label className="col-span-3 flex flex-col gap-1">
        <span className="eyebrow pl-3">Due day</span>
        <input className="field" placeholder="e.g. 15" inputMode="numeric" value={draft.dueDay} onChange={set('dueDay')} />
      </label>
    </div>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-ink/[0.05] px-3 py-2 ring-1 ring-inset ring-ink/[0.06]">
      <p className="text-[11px] leading-tight text-muted">{label}</p>
      <p className="mt-0.5 text-[13px] leading-tight tabular text-ink">{value}</p>
    </div>
  )
}

/**
 * The Debts section of the Budgets page: every loan and card balance with
 * its payoff progress, plus the add / edit / remove flows. Data changes go
 * back up through the callbacks so the page stays the single owner of state.
 */
export default function DebtsPanel({
  debts,
  income,
  onAdd,
  onUpdate,
  onDelete,
  onError,
  style,
}: {
  debts: Debt[]
  income: number | null
  onAdd: (input: NewDebtInput) => Promise<void>
  onUpdate: (id: string, patch: DebtPatch) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onError: (message: string) => void
  style?: React.CSSProperties
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [newDraft, setNewDraft] = useState<DraftDebt>(emptyDraft)
  const [adding, setAdding] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<DraftDebt>(emptyDraft)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const totalBalance = debts.reduce((sum, d) => sum + d.balance, 0)
  const totalPayment = debts.reduce((sum, d) => sum + d.monthlyPayment, 0)
  const pctOfPay = income && income > 0 ? (totalPayment / income) * 100 : null

  const horizons = debts.map(monthsToPayoff)
  const debtFreeIn = horizons.some((m) => m === null) ? null : Math.max(0, ...(horizons as number[]))

  const sorted = [...debts].sort((a, b) => b.balance - a.balance)

  const report = (e: unknown) => onError(e instanceof Error ? e.message : String(e))

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const input = parseDraft(newDraft)
    if (!input) return
    setAdding(true)
    try {
      await onAdd(input)
      setNewDraft(emptyDraft)
      setShowAdd(false)
    } catch (err) {
      report(err)
    } finally {
      setAdding(false)
    }
  }

  function startEdit(d: Debt) {
    setRemovingId(null)
    setEditingId(d.id)
    setEditDraft(draftFrom(d))
  }

  async function saveEdit(d: Debt) {
    const input = parseDraft(editDraft)
    if (!input) return
    setBusyId(d.id)
    try {
      await onUpdate(d.id, input)
      setEditingId(null)
    } catch (err) {
      report(err)
    } finally {
      setBusyId(null)
    }
  }

  async function handleRemove(d: Debt) {
    setBusyId(d.id)
    try {
      await onDelete(d.id)
    } catch (err) {
      report(err)
    } finally {
      setBusyId(null)
      setRemovingId(null)
    }
  }

  return (
    <Widget
      icon="card"
      eyebrow="Owed"
      title="Debts"
      style={style}
      action={
        <div className="flex items-center gap-3">
          {debts.length > 0 && (
            <span className="text-xs tabular text-muted">
              <span className="text-ink">₱{fmt0(totalPayment)}</span>/mo
              {pctOfPay !== null && (
                <>
                  <span className="mx-1.5 opacity-50">·</span>
                  {Math.round(pctOfPay)}% of pay
                </>
              )}
            </span>
          )}
          <button
            onClick={() => setShowAdd((v) => !v)}
            className={`btn btn-sm ${showAdd ? 'btn-primary' : 'btn-glass'}`}
            aria-pressed={showAdd}
          >
            <Icon name={showAdd ? 'close' : 'plus'} className="h-3.5 w-3.5" strokeWidth={2.4} />
            {showAdd ? 'Cancel' : 'Add debt'}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {sorted.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <Summary label="Owed" value={`₱${fmt0(totalBalance)}`} />
            <Summary label="Per month" value={`₱${fmt0(totalPayment)}`} />
            <Summary label="Debt-free in" value={horizonLabel(debtFreeIn)} />
          </div>
        )}

        {sorted.map((d) => {
          const paid = Math.max(0, d.originalAmount - d.balance)
          const pct = d.originalAmount > 0 ? Math.min(100, Math.round((paid / d.originalAmount) * 100)) : 0
          const months = monthsToPayoff(d)
          const stalled = months === null
          const isRemoving = removingId === d.id
          const busy = busyId === d.id
          const meta = [
            d.dueDay !== null ? `due ${ordinal(d.dueDay)}` : null,
            d.interestRate > 0 ? `${d.interestRate}%` : null,
          ]
            .filter(Boolean)
            .join(' · ')

          if (editingId === d.id) {
            return (
              <form
                key={d.id}
                onSubmit={(e) => {
                  e.preventDefault()
                  saveEdit(d)
                }}
                onKeyDown={(e) => e.key === 'Escape' && setEditingId(null)}
                className="flex flex-col gap-3 rounded-[26px] bg-ink/[0.04] p-4 ring-1 ring-inset ring-ink/[0.06]"
              >
                <DebtFields draft={editDraft} onChange={setEditDraft} />
                <div className="flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setEditingId(null)} disabled={busy} className="btn btn-glass btn-sm">
                    Cancel
                  </button>
                  <button type="submit" disabled={busy || !parseDraft(editDraft)} className="btn btn-primary btn-sm">
                    <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.4} />
                    {busy ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </form>
            )
          }

          return (
            <div key={d.id} className="flex flex-col gap-1">
              {/* Line 1: name + meta on the left, compact actions on the right */}
              <div className="flex items-center justify-between gap-3">
                <p
                  className="min-w-0 truncate text-sm font-medium"
                  title={`Borrowed ₱${fmt(d.originalAmount)}, ₱${fmt(d.balance)} still owed, ₱${fmt(d.monthlyPayment)} a month${d.interestRate > 0 ? ` at ${d.interestRate}% p.a.` : ''}`}
                >
                  {d.name}
                  {meta && <span className="ml-2 text-xs font-normal text-muted">{meta}</span>}
                </p>
                {isRemoving ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted">Remove?</span>
                    <button onClick={() => handleRemove(d)} disabled={busy} className="btn btn-sm bg-rust text-onaccent">
                      {busy ? 'Removing…' : 'Yes'}
                    </button>
                    <button onClick={() => setRemovingId(null)} disabled={busy} className="btn btn-glass btn-sm">
                      Keep
                    </button>
                  </div>
                ) : (
                  <div className="flex shrink-0 items-center gap-1">
                    <button onClick={() => startEdit(d)} className="btn btn-ghost h-7 w-7 rounded-full p-0" aria-label={`Edit ${d.name}`} title="Edit">
                      <Icon name="pencil" className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null)
                        setRemovingId(d.id)
                      }}
                      className="btn btn-ghost h-7 w-7 rounded-full p-0 text-muted hover:bg-rust-light hover:text-rust"
                      aria-label={`Remove ${d.name}`}
                      title="Remove"
                    >
                      <Icon name="trash" className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>
                )}
              </div>

              {/* Line 2: payoff progress */}
              <div className="track h-1.5 w-full">
                <div className={`fill ${stalled ? 'bg-rust' : 'bg-chart-violet'}`} style={{ width: `${pct}%` }} />
              </div>

              {/* Line 3: the numbers, owed on the left, pace on the right */}
              <div className="flex items-baseline justify-between gap-3 text-xs text-muted">
                <span className="truncate">
                  <span className="tabular text-ink">₱{fmt0(d.balance)}</span> left
                  <span className="mx-1.5 opacity-50">·</span>
                  {pct}%
                </span>
                <span className={`shrink-0 ${stalled ? 'text-rust' : ''}`}>
                  <span className="tabular text-ink">₱{fmt0(d.monthlyPayment)}</span>/mo
                  <span className="mx-1.5 opacity-50">·</span>
                  {payoffLabel(months)}
                </span>
              </div>
            </div>
          )
        })}

        {debts.length === 0 && !showAdd && (
          <EmptyState
            mood="proud"
            fill={0.9}
            title="No debts tracked"
            hint="Add a loan or card balance to see how its payments affect your paycheck."
          />
        )}

        {showAdd && (
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
                <p className="text-[15px] font-semibold tracking-tight">Add a debt</p>
              </div>
            </div>
            <DebtFields draft={newDraft} onChange={setNewDraft} autoFocusName />
            <div className="flex items-start justify-between gap-4">
              <p className="text-xs text-muted">
                Monthly payments count toward your paycheck allocation. Leave Borrowed blank if it matches what you owe.
              </p>
              <button type="submit" disabled={adding || !parseDraft(newDraft)} className="btn btn-primary btn-sm shrink-0">
                <Icon name="plus" className="h-3.5 w-3.5" strokeWidth={2.4} />
                {adding ? 'Adding…' : 'Add debt'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Widget>
  )
}
