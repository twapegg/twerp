import { useState } from 'react'
import type { Goal } from '../lib/types'
import type { GoalPatch, NewGoalInput } from '../lib/dataSource'
import { formatMonth, parseIsoDate } from '../lib/dates'
import Widget from './Widget'
import Icon from './Icon'
import EmptyState from './EmptyState'
import DateField from './DateField'

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtShort = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 })

const remainingOf = (g: Goal) => Math.max(0, g.targetAmount - g.savedAmount)
const pctOf = (g: Goal) => (g.targetAmount > 0 ? Math.min(100, Math.round((g.savedAmount / g.targetAmount) * 100)) : 0)

/** Whole months from today until an ISO date, never below 1 so per-month math stays sane. */
function monthsUntil(iso: string): number {
  const now = new Date()
  const then = parseIsoDate(iso) ?? now
  const months = (then.getFullYear() - now.getFullYear()) * 12 + (then.getMonth() - now.getMonth()) + (then.getDate() >= now.getDate() ? 0 : -1)
  return Math.max(1, months)
}

const monthsLabel = (m: number) => (m === 1 ? '1 month' : m < 24 ? `${m} months` : `${Math.floor(m / 12)} yr${m % 12 ? ` ${m % 12} mo` : ''}`)

const dateLabel = formatMonth

/** One line of guidance under each goal: when it lands at the current pace, or what pace the date needs. */
function paceLabel(g: Goal): { text: string; warn: boolean } {
  const remaining = remainingOf(g)
  if (remaining === 0) return { text: 'Fully funded', warn: false }
  if (g.targetDate) {
    const months = monthsUntil(g.targetDate)
    const needed = remaining / months
    if (g.monthlyContribution <= 0) return { text: `Needs ₱${fmtShort(needed)} / mo to make ${dateLabel(g.targetDate)}`, warn: true }
    const short = g.monthlyContribution < needed - 0.005
    return short
      ? { text: `₱${fmtShort(needed - g.monthlyContribution)} / mo short of ${dateLabel(g.targetDate)}`, warn: true }
      : { text: `On track for ${dateLabel(g.targetDate)}`, warn: false }
  }
  if (g.monthlyContribution <= 0) return { text: 'No monthly set-aside yet', warn: false }
  return { text: `~${monthsLabel(Math.ceil(remaining / g.monthlyContribution))} at this pace`, warn: false }
}

type Draft = {
  name: string
  kind: Goal['kind']
  targetAmount: string
  savedAmount: string
  monthlyContribution: string
  targetDate: string
  note: string
  fundedFromSavings: boolean
}

const emptyDraft: Draft = { name: '', kind: 'goal', targetAmount: '', savedAmount: '', monthlyContribution: '', targetDate: '', note: '', fundedFromSavings: true }

const draftFrom = (g: Goal): Draft => ({
  name: g.name,
  kind: g.kind,
  targetAmount: String(g.targetAmount),
  savedAmount: String(g.savedAmount),
  monthlyContribution: String(g.monthlyContribution),
  targetDate: g.targetDate ?? '',
  note: g.note,
  fundedFromSavings: g.fundedFromSavings,
})

function parseDraft(d: Draft): NewGoalInput | null {
  const name = d.name.trim()
  const targetAmount = parseFloat(d.targetAmount)
  const savedAmount = d.savedAmount.trim() === '' ? 0 : parseFloat(d.savedAmount)
  const monthlyContribution = d.monthlyContribution.trim() === '' ? 0 : parseFloat(d.monthlyContribution)
  const targetDate = d.targetDate.trim() === '' ? null : d.targetDate
  if (!name) return null
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) return null
  if ([savedAmount, monthlyContribution].some((n) => !Number.isFinite(n) || n < 0)) return null
  if (targetDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return null
  return { name, kind: d.kind, targetAmount, savedAmount, monthlyContribution, targetDate, note: d.note.trim(), fundedFromSavings: d.fundedFromSavings }
}

function GoalFields({ draft, onChange, autoFocusName = false }: { draft: Draft; onChange: (next: Draft) => void; autoFocusName?: boolean }) {
  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...draft, [key]: e.target.value })
  return (
    <div className="grid grid-cols-12 gap-3">
      <label className="col-span-4 flex flex-col gap-1">
        <span className="eyebrow pl-3">Name</span>
        <input autoFocus={autoFocusName} className="field" placeholder="e.g. Japan trip, new laptop" value={draft.name} onChange={set('name')} />
      </label>
      <div className="col-span-2 flex flex-col gap-1">
        <span className="eyebrow pl-3">Type</span>
        <div className="track flex h-[42px] p-1" role="radiogroup" aria-label="Goal type">
          {(
            [
              { label: 'Goal', value: 'goal' },
              { label: 'Want', value: 'want' },
            ] as { label: string; value: Goal['kind'] }[]
          ).map((opt) => {
            const active = draft.kind === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange({ ...draft, kind: opt.value })}
                className={`flex-1 rounded-full text-xs font-medium transition-all duration-200 ease-spring ${active ? 'glass-pill text-ink' : 'text-muted hover:text-ink'}`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>
      <label className="col-span-2 flex flex-col gap-1">
        <span className="eyebrow pl-3">Target</span>
        <input className="field" placeholder="0.00" inputMode="decimal" value={draft.targetAmount} onChange={set('targetAmount')} />
      </label>
      <label className="col-span-2 flex flex-col gap-1">
        <span className="eyebrow pl-3">Saved so far</span>
        <input className="field" placeholder="0.00" inputMode="decimal" value={draft.savedAmount} onChange={set('savedAmount')} />
      </label>
      <label className="col-span-2 flex flex-col gap-1">
        <span className="eyebrow pl-3">Per month</span>
        <input className="field" placeholder="0.00" inputMode="decimal" value={draft.monthlyContribution} onChange={set('monthlyContribution')} />
      </label>
      <div className="col-span-4 flex flex-col gap-1">
        <span className="eyebrow pl-3">Monthly amount comes from</span>
        <div className="track flex h-[42px] p-1" role="radiogroup" aria-label="Funding source">
          {[
            { label: 'Savings budget', value: true },
            { label: 'Extra from paycheck', value: false },
          ].map((opt) => {
            const active = draft.fundedFromSavings === opt.value
            return (
              <button
                key={opt.label}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange({ ...draft, fundedFromSavings: opt.value })}
                className={`flex-1 rounded-full text-xs font-medium transition-all duration-200 ease-spring ${active ? 'glass-pill text-ink' : 'text-muted hover:text-ink'}`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>
      {/* A div, not a label: a label would re-dispatch popover clicks onto the trigger button. */}
      <div className="col-span-3 flex flex-col gap-1">
        <span className="eyebrow pl-3">By when (optional)</span>
        <DateField value={draft.targetDate} onChange={(iso) => onChange({ ...draft, targetDate: iso })} placeholder="No deadline" />
      </div>
      <label className="col-span-5 flex flex-col gap-1">
        <span className="eyebrow pl-3">Note (optional)</span>
        <input className="field" placeholder="Why this matters, or a link" value={draft.note} onChange={set('note')} />
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

const kindChip: Record<Goal['kind'], string> = {
  goal: 'bg-pine-light text-pine ring-pine/25',
  want: 'bg-chart-amber/[0.14] text-chart-amber ring-chart-amber/30',
}

/**
 * Goals & wants: what is being saved toward, how far along each is, and the
 * add-funds / edit / remove flows. State lives in the page; changes flow up
 * through the callbacks, same as DebtsPanel.
 */
export default function GoalsPanel({
  goals,
  income,
  onAdd,
  onUpdate,
  onDelete,
  onError,
  style,
}: {
  goals: Goal[]
  income: number | null
  onAdd: (input: NewGoalInput) => Promise<void>
  onUpdate: (id: string, patch: GoalPatch) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onError: (message: string) => void
  style?: React.CSSProperties
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [newDraft, setNewDraft] = useState<Draft>(emptyDraft)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft)
  const [fundingId, setFundingId] = useState<string | null>(null)
  const [fundAmount, setFundAmount] = useState('')
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [showReached, setShowReached] = useState(false)

  const active = goals.filter((g) => !g.achievedAt).sort((a, b) => pctOf(b) - pctOf(a))
  const reached = goals.filter((g) => g.achievedAt).sort((a, b) => (b.achievedAt ?? '').localeCompare(a.achievedAt ?? ''))

  const totalTarget = active.reduce((s, g) => s + g.targetAmount, 0)
  const totalSaved = active.reduce((s, g) => s + g.savedAmount, 0)
  const totalMonthly = active.reduce((s, g) => s + g.monthlyContribution, 0)
  const fromSavings = active.filter((g) => g.fundedFromSavings).reduce((s, g) => s + g.monthlyContribution, 0)
  const extra = totalMonthly - fromSavings
  const pctOfPay = income && income > 0 && extra > 0 ? (extra / income) * 100 : null

  const report = (e: unknown) => onError(e instanceof Error ? e.message : String(e))

  async function withBusy(id: string, fn: () => Promise<void>) {
    setBusyId(id)
    try {
      await fn()
    } catch (e) {
      report(e)
    } finally {
      setBusyId(null)
    }
  }

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

  function closeInline() {
    setEditingId(null)
    setFundingId(null)
    setRemovingId(null)
  }

  function startEdit(g: Goal) {
    closeInline()
    setEditingId(g.id)
    setEditDraft(draftFrom(g))
  }

  function startFund(g: Goal) {
    closeInline()
    setFundingId(g.id)
    setFundAmount(g.monthlyContribution > 0 ? String(g.monthlyContribution) : '')
  }

  async function saveEdit(g: Goal) {
    const input = parseDraft(editDraft)
    if (!input) return
    await withBusy(g.id, async () => {
      // Editing the target above what's saved reopens a reached goal; saving past the target closes it.
      const achievedAt = input.savedAmount >= input.targetAmount ? g.achievedAt ?? new Date().toISOString() : null
      await onUpdate(g.id, { ...input, achievedAt })
      setEditingId(null)
    })
  }

  async function addFunds(g: Goal) {
    const amt = parseFloat(fundAmount)
    if (!Number.isFinite(amt) || amt <= 0) return
    await withBusy(g.id, async () => {
      const savedAmount = g.savedAmount + amt
      const achievedAt = savedAmount >= g.targetAmount ? new Date().toISOString() : null
      await onUpdate(g.id, { savedAmount, achievedAt })
      setFundingId(null)
      setFundAmount('')
    })
  }

  const markReached = (g: Goal) => withBusy(g.id, () => onUpdate(g.id, { achievedAt: new Date().toISOString() }))
  const reopen = (g: Goal) => withBusy(g.id, () => onUpdate(g.id, { achievedAt: null }))
  const remove = (g: Goal) => withBusy(g.id, async () => {
    await onDelete(g.id)
    setRemovingId(null)
  })

  return (
    <Widget
      icon="flag"
      eyebrow="Saving for"
      title="Goals & wants"
      style={style}
      action={
        <div className="flex items-center gap-3">
          {active.length > 0 && totalMonthly > 0 && (
            <span className="text-xs tabular text-muted">
              <span className="text-ink">₱{fmt(totalMonthly)}</span> / mo
              {fromSavings > 0 && (
                <>
                  <span className="mx-1.5 opacity-50">·</span>₱{fmt(fromSavings)} from savings
                </>
              )}
              {pctOfPay !== null && (
                <>
                  <span className="mx-1.5 opacity-50">·</span>
                  {pctOfPay.toFixed(1)}% of pay extra
                </>
              )}
            </span>
          )}
          <button onClick={() => setShowAdd((v) => !v)} className={`btn btn-sm ${showAdd ? 'btn-primary' : 'btn-glass'}`} aria-pressed={showAdd}>
            <Icon name={showAdd ? 'close' : 'plus'} className="h-3.5 w-3.5" strokeWidth={2.4} />
            {showAdd ? 'Cancel' : 'Add goal'}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {active.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <Summary label="Set aside so far" value={`₱${fmt(totalSaved)}`} />
            <Summary label="Still to save" value={`₱${fmt(Math.max(0, totalTarget - totalSaved))}`} />
            <Summary label="Overall progress" value={totalTarget > 0 ? `${Math.round((totalSaved / totalTarget) * 100)}%` : '—'} />
          </div>
        )}

        {active.map((g) => {
          const pct = pctOf(g)
          const pace = paceLabel(g)
          const busy = busyId === g.id
          const funded = remainingOf(g) === 0

          if (editingId === g.id) {
            return (
              <form
                key={g.id}
                onSubmit={(e) => {
                  e.preventDefault()
                  saveEdit(g)
                }}
                onKeyDown={(e) => e.key === 'Escape' && setEditingId(null)}
                className="flex flex-col gap-3 rounded-[26px] bg-ink/[0.04] p-4 ring-1 ring-inset ring-ink/[0.06]"
              >
                <GoalFields draft={editDraft} onChange={setEditDraft} />
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
            <div key={g.id} className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium">{g.name}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${kindChip[g.kind]}`}>
                      {g.kind}
                    </span>
                    {g.monthlyContribution > 0 && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => withBusy(g.id, () => onUpdate(g.id, { fundedFromSavings: !g.fundedFromSavings }))}
                        title={
                          g.fundedFromSavings
                            ? 'Taken from the Savings budget. Click to make it extra from the paycheck.'
                            : 'Extra from the paycheck. Click to take it from the Savings budget.'
                        }
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset transition-colors ${
                          g.fundedFromSavings
                            ? 'bg-chart-cyan/[0.14] text-chart-cyan ring-chart-cyan/30 hover:bg-chart-cyan/[0.22]'
                            : 'bg-ink/[0.05] text-muted ring-ink/10 hover:bg-ink/[0.09]'
                        }`}
                      >
                        {g.fundedFromSavings ? 'from savings' : 'extra'}
                      </button>
                    )}
                    {g.note && <span className="truncate text-xs text-muted">{g.note}</span>}
                  </div>
                  <span className="shrink-0 text-xs tabular text-muted">
                    <span className="text-ink">₱{fmt(g.savedAmount)}</span>
                    <span className="mx-1 opacity-60">of</span>₱{fmt(g.targetAmount)}
                  </span>
                </div>
                <div className="track h-2 w-full">
                  <div className={`fill ${funded ? 'bg-mint' : g.kind === 'want' ? 'bg-chart-amber' : 'bg-pine'}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1.5 flex items-baseline justify-between gap-3 text-xs text-muted">
                  <span>
                    {pct}% there
                    {g.monthlyContribution > 0 && (
                      <>
                        <span className="mx-1.5 opacity-50">·</span>
                        <span className="tabular">₱{fmt(g.monthlyContribution)}</span> / mo
                      </>
                    )}
                  </span>
                  <span className={pace.warn ? 'text-chart-amber' : ''}>{pace.text}</span>
                </div>
              </div>

              {removingId === g.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">Remove?</span>
                  <button onClick={() => remove(g)} disabled={busy} className="btn btn-sm bg-rust text-onaccent">
                    <Icon name="trash" className="h-3.5 w-3.5" strokeWidth={2.1} />
                    {busy ? 'Removing…' : 'Yes, remove'}
                  </button>
                  <button onClick={() => setRemovingId(null)} disabled={busy} className="btn btn-glass btn-sm">
                    Keep
                  </button>
                </div>
              ) : fundingId === g.id ? (
                <form
                  className="flex items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    addFunds(g)
                  }}
                  onKeyDown={(e) => e.key === 'Escape' && setFundingId(null)}
                >
                  <input
                    autoFocus
                    className="field w-28"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={fundAmount}
                    onChange={(e) => setFundAmount(e.target.value)}
                  />
                  <button type="submit" disabled={busy || !(parseFloat(fundAmount) > 0)} className="btn btn-primary btn-sm">
                    <Icon name="plus" className="h-3.5 w-3.5" strokeWidth={2.4} />
                    {busy ? 'Adding…' : 'Add'}
                  </button>
                  <button type="button" onClick={() => setFundingId(null)} disabled={busy} className="btn btn-glass btn-sm">
                    Cancel
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  {funded ? (
                    <button onClick={() => markReached(g)} disabled={busy} className="btn btn-primary btn-sm">
                      <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.4} />
                      {g.kind === 'want' ? 'Bought it' : 'Reached'}
                    </button>
                  ) : (
                    <button onClick={() => startFund(g)} className="btn btn-glass btn-sm">
                      <Icon name="plus" className="h-3.5 w-3.5" strokeWidth={2.4} />
                      Add funds
                    </button>
                  )}
                  <button onClick={() => startEdit(g)} className="btn btn-ghost h-8 w-8 rounded-full p-0" aria-label={`Edit ${g.name}`} title="Edit">
                    <Icon name="pencil" className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => {
                      closeInline()
                      setRemovingId(g.id)
                    }}
                    className="btn btn-ghost h-8 w-8 rounded-full p-0 text-rust hover:bg-rust-light hover:text-rust"
                    aria-label={`Remove ${g.name}`}
                    title="Remove"
                  >
                    <Icon name="trash" className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {goals.length === 0 && !showAdd && (
          <EmptyState mood="proud" fill={0.9} title="Nothing you're saving for yet" hint="Add a goal or a want and track how close you are each month." />
        )}

        {showAdd && (
          <form onSubmit={handleAdd} className="mt-1 flex flex-col gap-3 rounded-[26px] bg-ink/[0.04] p-4 ring-1 ring-inset ring-ink/[0.06]">
            <div className="flex items-center gap-2.5">
              <span className="glass-badge text-mint">
                <Icon name="plus" className="h-[15px] w-[15px]" strokeWidth={2.4} />
              </span>
              <div className="leading-tight">
                <p className="eyebrow">New</p>
                <p className="text-[15px] font-semibold tracking-tight">Add a goal or want</p>
              </div>
            </div>
            <GoalFields draft={newDraft} onChange={setNewDraft} autoFocusName />
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-muted">
                A goal is something to save up (emergency fund, a trip). A want is a thing to buy. Savings budget means the monthly amount is already inside your Savings limit. Extra adds it on top in the paycheck allocation.
              </p>
              <button type="submit" disabled={adding || !parseDraft(newDraft)} className="btn btn-primary btn-sm shrink-0">
                <Icon name="plus" className="h-3.5 w-3.5" strokeWidth={2.4} />
                {adding ? 'Adding…' : 'Add'}
              </button>
            </div>
          </form>
        )}

        {reached.length > 0 && (
          <div className="border-t border-ink/10 pt-4">
            <button onClick={() => setShowReached((v) => !v)} className="btn btn-ghost btn-sm -ml-2 text-muted">
              <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.2} />
              {reached.length} reached {showReached ? '· hide' : '· show'}
            </button>
            {showReached && (
              <div className="mt-3 flex flex-col gap-2.5">
                {reached.map((g) => {
                  const busy = busyId === g.id
                  return (
                    <div key={g.id} className="flex items-center gap-3 text-sm text-muted">
                      <span className="glass-badge h-6 w-6 shrink-0 text-mint">
                        <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.2} />
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        <span className="text-ink">{g.name}</span>
                        <span className="mx-1.5 opacity-50">·</span>₱{fmt(g.targetAmount)}
                        <span className="mx-1.5 opacity-50">·</span>
                        {g.achievedAt ? new Date(g.achievedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                      </span>
                      <button onClick={() => reopen(g)} disabled={busy} className="btn btn-glass btn-sm">
                        Reopen
                      </button>
                      <button
                        onClick={() => remove(g)}
                        disabled={busy}
                        className="btn btn-ghost h-8 w-8 rounded-full p-0 text-rust hover:bg-rust-light hover:text-rust"
                        aria-label={`Remove ${g.name}`}
                      >
                        <Icon name="trash" className="h-4 w-4" strokeWidth={2} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Widget>
  )
}
