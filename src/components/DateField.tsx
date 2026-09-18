import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const pad = (n: number) => String(n).padStart(2, '0')
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fromIso = (iso: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** Six weeks of days covering the given month, starting on Sunday, so the grid never jumps height. */
function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const start = new Date(year, month, 1 - first.getDay())
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
}

/**
 * A date input that looks like the rest of the form. The trigger is a `.field`
 * showing the chosen date; clicking it opens a small glass calendar. Value is
 * an ISO date string or '' for none. Replaces <input type="date">, whose popup
 * cannot be themed.
 */
export default function DateField({
  value,
  onChange,
  placeholder = 'Pick a date',
  allowClear = true,
  className = '',
}: {
  value: string
  onChange: (iso: string) => void
  placeholder?: string
  allowClear?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = fromIso(value)
  const today = new Date()
  const [view, setView] = useState(() => {
    const base = selected ?? today
    return { year: base.getFullYear(), month: base.getMonth() }
  })
  const rootRef = useRef<HTMLDivElement>(null)

  // Reopen on the selected month, not wherever the user last browsed.
  useEffect(() => {
    if (open) {
      const base = selected ?? today
      setView({ year: base.getFullYear(), month: base.getMonth() })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function shift(delta: number) {
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  function pick(d: Date) {
    onChange(toIso(d))
    setOpen(false)
  }

  const label = selected ? selected.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
  const days = monthGrid(view.year, view.month)

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`field flex items-center justify-between gap-2 text-left ${label ? 'text-ink' : 'text-muted/75'}`}
      >
        <span className="truncate">{label || placeholder}</span>
        <Icon name="calendar" className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.9} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose a date"
          className="glass glass-blur pop absolute left-0 top-[calc(100%+8px)] z-50 w-[292px] rounded-[26px] p-4"
        >
          {/* Month header */}
          <div className="mb-3 flex items-center justify-between">
            <p className="pl-1 text-sm font-semibold tracking-tight">
              {MONTHS[view.month]} <span className="text-muted">{view.year}</span>
            </p>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => shift(-1)} className="btn btn-ghost h-8 w-8 rounded-full p-0" aria-label="Previous month">
                <Icon name="chevronLeft" className="h-4 w-4" strokeWidth={2} />
              </button>
              <button type="button" onClick={() => shift(1)} className="btn btn-ghost h-8 w-8 rounded-full p-0" aria-label="Next month">
                <Icon name="chevronRight" className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 gap-1 px-0.5">
            {WEEKDAYS.map((w) => (
              <span key={w} className="py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted">
                {w}
              </span>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1 px-0.5">
            {days.map((d) => {
              const inMonth = d.getMonth() === view.month
              const isSel = selected ? sameDay(d, selected) : false
              const isToday = sameDay(d, today)
              return (
                <button
                  key={toIso(d)}
                  type="button"
                  onClick={() => pick(d)}
                  aria-pressed={isSel}
                  aria-label={d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  className={`relative h-9 w-9 rounded-full text-sm tabular transition-all duration-150 ease-spring active:scale-95 ${
                    isSel
                      ? 'bg-blue text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]'
                      : inMonth
                        ? 'text-ink hover:bg-ink/[0.07]'
                        : 'text-muted/50 hover:bg-ink/[0.05] hover:text-muted'
                  }`}
                >
                  {d.getDate()}
                  {isToday && !isSel && <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-pine" />}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between border-t border-ink/10 pt-3">
            {allowClear ? (
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setOpen(false)
                }}
                disabled={!value}
                className="btn btn-ghost btn-sm text-muted"
              >
                Clear
              </button>
            ) : (
              <span />
            )}
            <button type="button" onClick={() => pick(today)} className="btn btn-glass btn-sm">
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
