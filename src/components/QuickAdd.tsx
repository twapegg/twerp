import { useState } from 'react'
import type { Account, Category, Transaction } from '../lib/types'
import { parseQuickAdd } from '../lib/chatApi'
import { data } from '../lib/data'
import { todayIso } from '../lib/dates'
import Widget from './Widget'
import Icon from './Icon'

const fmt = (n: number) =>
  Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

type Added = {
  transaction: Transaction
  explanation: string
  confidence: 'high' | 'low'
  undone: boolean
}

/**
 * One-line natural-language entry. The text goes to a small n8n workflow that
 * makes a single model call and returns structured fields; the app then saves
 * the row itself and offers Undo. No confirm step: undo is one click and the
 * delete is a soft delete, so nothing is lost if the model guessed wrong.
 */
export default function QuickAdd({
  accounts,
  categories,
  onChanged,
  onManual,
}: {
  accounts: Account[]
  categories: Category[]
  onChanged: () => void
  onManual: () => void
}) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recent, setRecent] = useState<Added[]>([])

  const defaultAccount = accounts.find((a) => /gcash/i.test(a.name)) ?? accounts[0]
  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]))
  const accountById = Object.fromEntries(accounts.map((a) => [a.id, a]))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || busy || !defaultAccount) return
    setBusy(true)
    setError(null)
    try {
      const parsed = await parseQuickAdd({
        text: trimmed,
        today: todayIso(),
        defaultAccountId: defaultAccount.id,
        accounts: accounts.map((a) => ({ id: a.id, name: a.name })),
        categories: categories.map((c) => ({ id: c.id, name: c.name })),
      })
      const created = await data.addTransaction(parsed.transaction)
      setRecent((prev) => [{ transaction: created, explanation: parsed.explanation, confidence: parsed.confidence, undone: false }, ...prev].slice(0, 3))
      setText('')
      onChanged()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(/Failed to fetch|NetworkError/i.test(msg) ? 'Could not reach the assistant. Check that the ledger-quickadd workflow is active.' : msg)
    } finally {
      setBusy(false)
    }
  }

  async function undo(id: string) {
    try {
      await data.deleteTransaction(id)
      setRecent((prev) => prev.map((r) => (r.transaction.id === id ? { ...r, undone: true } : r)))
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <Widget
      icon="sparkle"
      eyebrow="New"
      title="Add a transaction"
      style={{ animationDelay: '60ms' }}
      action={
        <button type="button" onClick={onManual} className="btn btn-ghost btn-sm -mr-2">
          Manual entry
        </button>
      }
    >
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          className="field flex-1"
          placeholder={`Try "bought McDonald's for 399" or "grab to work 132 on ${defaultAccount?.name ?? 'GCash'}"`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={busy}
          autoFocus
        />
        <button type="submit" disabled={busy || !text.trim()} className="btn btn-primary shrink-0">
          {busy ? (
            <span className="flex items-center gap-1 px-2">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/80" style={{ animationDelay: `${i * 120}ms` }} />
              ))}
            </span>
          ) : (
            <>
              <Icon name="sparkle" className="h-4 w-4" strokeWidth={2.2} />
              Add
            </>
          )}
        </button>
      </form>

      {(recent.length > 0 || error) && (
        <div className="mt-4 flex flex-col gap-2">
          {error && (
            <p className="rounded-[20px] bg-rust-light px-3.5 py-2 text-xs text-rust ring-1 ring-inset ring-rust/30">{error}</p>
          )}
          {recent.map(({ transaction: t, explanation, confidence, undone }) => {
            const cat = categoryById[t.categoryId]?.name ?? 'Unknown'
            const acc = accountById[t.accountId]?.name ?? ''
            return (
              <div
                key={t.id}
                className={`flex items-center gap-3 rounded-[22px] px-3.5 py-2.5 text-sm ring-1 ring-inset ${
                  undone ? 'bg-ink/[0.04] text-muted ring-ink/10' : 'bg-mint-light ring-mint/25'
                }`}
              >
                <span className={`glass-badge h-6 w-6 shrink-0 ${undone ? 'text-muted' : 'text-mint'}`}>
                  <Icon name={undone ? 'trash' : 'check'} className="h-3.5 w-3.5" strokeWidth={2.2} />
                </span>
                <div className="min-w-0 flex-1 leading-snug">
                  <p className={undone ? 'line-through' : ''}>
                    <span className="font-medium">{t.amount < 0 ? '−' : '+'}₱{fmt(t.amount)}</span>
                    <span className="mx-1.5 opacity-50">·</span>
                    {t.note}
                    <span className="mx-1.5 opacity-50">·</span>
                    <span className="text-muted">{cat}{acc ? ` · ${acc}` : ''}</span>
                  </p>
                  {!undone && (confidence === 'low' || explanation) && (
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {confidence === 'low' ? 'Not sure about this one. ' : ''}
                      {explanation}
                    </p>
                  )}
                  {undone && <p className="mt-0.5 text-xs">Removed.</p>}
                </div>
                {!undone && (
                  <button type="button" onClick={() => undo(t.id)} className="btn btn-glass btn-sm shrink-0">
                    Undo
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Widget>
  )
}
