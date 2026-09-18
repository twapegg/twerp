import { useState } from 'react'
import type { Account, Category, Transaction } from '../lib/types'
import type { TransactionPatch } from '../lib/dataSource'
import { formatDay } from '../lib/dates'
import Icon from './Icon'
import DateField from './DateField'

const chipTone: Record<Category['color'], string> = {
  pine: 'bg-pine-light text-pine ring-pine/25',
  rust: 'bg-rust-light text-rust ring-rust/25',
  muted: 'bg-ink/[0.06] text-muted ring-ink/10',
}

const fmt = (n: number) =>
  Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * One transaction. Read-only by default (Dashboard). When `onUpdate` /
 * `onDelete` are supplied along with the category and account lists
 * (Transactions page), hovering reveals Edit and Delete, and Edit turns the
 * row into an inline form.
 */
export default function TransactionRow({
  transaction,
  category,
  categories,
  accounts,
  onUpdate,
  onDelete,
}: {
  transaction: Transaction
  category: Category | undefined
  categories?: Category[]
  accounts?: Account[]
  onUpdate?: (id: string, patch: TransactionPatch) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}) {
  const [mode, setMode] = useState<'view' | 'edit' | 'confirm-delete'>('view')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const editable = Boolean(onUpdate && categories && accounts)
  const isIncome = transaction.amount >= 0
  const dateLabel = formatDay(transaction.occurredAt)
  const initial = (category?.name ?? '?').charAt(0).toUpperCase()
  const tone = category ? chipTone[category.color] : chipTone.muted

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      setMode('view')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (mode === 'edit' && editable) {
    return (
      <EditForm
        transaction={transaction}
        categories={categories!}
        accounts={accounts!}
        busy={busy}
        error={error}
        onCancel={() => {
          setError(null)
          setMode('view')
        }}
        onSave={(patch) => run(() => onUpdate!(transaction.id, patch))}
      />
    )
  }

  return (
    <div className="group -mx-2 flex items-center justify-between gap-4 rounded-full px-3 py-2.5 transition-colors duration-150 hover:bg-ink/[0.05]">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1 ring-inset ${tone}`}>
          {initial}
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-medium">{transaction.note}</p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {category?.name ?? 'Uncategorized'}
            <span className="mx-1.5 opacity-50">·</span>
            {dateLabel}
            {error && <span className="ml-2 text-rust">{error}</span>}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {mode === 'confirm-delete' ? (
          <>
            <span className="text-xs text-muted">Delete this?</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => onDelete!(transaction.id))}
              className="btn btn-sm bg-rust text-white hover:brightness-110"
            >
              {busy ? 'Deleting…' : 'Delete'}
            </button>
            <button type="button" disabled={busy} onClick={() => setMode('view')} className="btn btn-glass btn-sm">
              Keep
            </button>
          </>
        ) : (
          <>
            {editable && (
              <span className="flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
                <button
                  type="button"
                  onClick={() => setMode('edit')}
                  className="btn btn-ghost h-8 w-8 rounded-full p-0"
                  aria-label="Edit transaction"
                  title="Edit"
                >
                  <Icon name="pencil" className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => setMode('confirm-delete')}
                    className="btn btn-ghost h-8 w-8 rounded-full p-0 text-muted hover:text-rust"
                    aria-label="Delete transaction"
                    title="Delete"
                  >
                    <Icon name="trash" className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                )}
              </span>
            )}
            <span className={`text-sm tabular ${isIncome ? 'text-mint' : 'text-ink'}`}>
              {isIncome ? '+' : '−'}₱{fmt(transaction.amount)}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

function EditForm({
  transaction,
  categories,
  accounts,
  busy,
  error,
  onCancel,
  onSave,
}: {
  transaction: Transaction
  categories: Category[]
  accounts: Account[]
  busy: boolean
  error: string | null
  onCancel: () => void
  onSave: (patch: TransactionPatch) => void
}) {
  const [note, setNote] = useState(transaction.note)
  const [amount, setAmount] = useState(String(Math.abs(transaction.amount)))
  const [isExpense, setIsExpense] = useState(transaction.amount < 0)
  const [categoryId, setCategoryId] = useState(transaction.categoryId)
  const [accountId, setAccountId] = useState(transaction.accountId)
  const [occurredAt, setOccurredAt] = useState(transaction.occurredAt)

  const parsed = parseFloat(amount)
  const valid = note.trim().length > 0 && Number.isFinite(parsed) && parsed > 0 && /^\d{4}-\d{2}-\d{2}$/.test(occurredAt)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || busy) return
    onSave({
      note: note.trim(),
      amount: isExpense ? -Math.abs(parsed) : Math.abs(parsed),
      categoryId,
      accountId,
      occurredAt,
    })
  }

  return (
    <form onSubmit={submit} className="-mx-2 my-1 rounded-[26px] bg-ink/[0.04] px-3 py-3 ring-1 ring-inset ring-ink/10">
      <div className="grid grid-cols-6 gap-2">
        <input className="field col-span-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" autoFocus />
        <input
          className="field"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
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
        <DateField value={occurredAt} onChange={setOccurredAt} allowClear={false} />
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-3">
        <div className="track flex h-8 p-1" role="radiogroup" aria-label="Transaction type">
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
                className={`rounded-full px-3 text-xs font-medium transition-all duration-200 ease-spring ${
                  active ? 'glass-pill text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-rust">{error}</span>}
          <button type="button" onClick={onCancel} disabled={busy} className="btn btn-glass btn-sm">
            Cancel
          </button>
          <button type="submit" disabled={busy || !valid} className="btn btn-primary btn-sm">
            <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.4} />
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </form>
  )
}
