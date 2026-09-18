import { useState } from 'react'
import type { Account, Category, Transaction } from '../lib/types'
import Icon from './Icon'

const fmt = (n: number) =>
  Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const MAX_SLICES = 4

const KIND_LABEL: Record<Account['kind'], string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit: 'Credit card',
  cash: 'Cash',
  ewallet: 'E-wallet',
}

/**
 * Brand palettes matched against the account name. The tile is painted like
 * the physical card: a solid brand gradient with white print and the bank's
 * logo in the corner. Logos live in /public/logos and are served as-is.
 */
type Brand = { match: RegExp; from: string; to: string; logo?: string }

const BRANDS: Brand[] = [
  { match: /gcash/i, from: '#1972F9', to: '#0B2757', logo: '/logos/gcash.svg' },
  { match: /\bbpi\b|bank of the philippine/i, from: '#C4161C', to: '#6E0A0E', logo: '/logos/bpi.svg' },
]
const NEUTRAL: Brand = { match: /$^/, from: '#2E4C8F', to: '#101828' }
const brandFor = (name: string) => BRANDS.find((b) => b.match.test(name)) ?? NEUTRAL

/** White at stepping opacity so the bar stays legible on any brand colour. */
const SLICE_ALPHA = [0.95, 0.72, 0.52, 0.36]
const sliceColor = (i: number, isOther: boolean) =>
  isOther ? 'rgba(255,255,255,0.18)' : `rgba(255,255,255,${SLICE_ALPHA[Math.min(i, SLICE_ALPHA.length - 1)]})`

/**
 * Per-account money-flow card: what came in, what went out, what's left,
 * and a stacked bar of the categories the outflow went to.
 */
export default function AccountFlow({
  account,
  transactions,
  categories,
  delay = 0,
}: {
  account: Account
  transactions: Transaction[]
  categories: Category[]
  delay?: number
}) {
  const brand = brandFor(account.name)
  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]))
  const mine = transactions.filter((t) => t.accountId === account.id)

  const moneyIn = mine.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const moneyOut = mine.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const net = moneyIn - moneyOut

  const outByCategory = new Map<string, number>()
  for (const t of mine) {
    if (t.amount >= 0) continue
    outByCategory.set(t.categoryId, (outByCategory.get(t.categoryId) ?? 0) + Math.abs(t.amount))
  }
  const ranked = [...outByCategory.entries()]
    .map(([id, amount]) => ({ name: categoryById[id]?.name ?? 'Unknown', amount, other: false }))
    .sort((a, b) => b.amount - a.amount)
  const head = ranked.slice(0, MAX_SLICES)
  const tail = ranked.slice(MAX_SLICES)
  const slices =
    tail.length > 0
      ? [...head, { name: 'Other', amount: tail.reduce((s, r) => s + r.amount, 0), other: true }]
      : head

  return (
    <section
      className="rise relative isolate overflow-hidden rounded-tile p-5 text-white"
      style={{
        animationDelay: `${delay}ms`,
        background: `linear-gradient(135deg, ${brand.from} 0%, ${brand.to} 100%)`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.28), 0 24px 60px -24px ${brand.to}CC, 0 2px 8px rgba(16,24,40,0.10)`,
      }}
    >
      {/* Soft highlight like light catching the card's top edge */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: 'radial-gradient(80% 60% at 10% 0%, rgba(255,255,255,0.22), transparent 60%)' }}
      />

      <header className="mb-4 flex items-center gap-3">
        <BrandMark logo={brand.logo} name={account.name} />
        <div className="min-w-0 leading-tight">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/65">{KIND_LABEL[account.kind] ?? account.kind}</p>
          <h2 className="truncate text-[15px] font-semibold tracking-tight">{account.name}</h2>
        </div>
      </header>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Figure label="In" amount={moneyIn} sign="+" />
        <Figure label="Out" amount={moneyOut} sign="−" />
        <Figure label="Net" amount={net} sign={net < 0 ? '−' : ''} dim={net < 0} />
      </div>

      {slices.length > 0 ? (
        <>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-black/20">
            {slices.map((s, i) => (
              <div
                key={s.name}
                className="h-full"
                style={{ width: `${(s.amount / moneyOut) * 100}%`, background: sliceColor(i, s.other) }}
                title={`${s.name} · ₱${fmt(s.amount)}`}
              />
            ))}
          </div>
          <ul className="mt-3 flex flex-col gap-1.5">
            {slices.map((s, i) => (
              <li key={s.name} className="flex items-center gap-2.5 text-xs">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: sliceColor(i, s.other) }} />
                <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
                <span className="shrink-0 tabular text-white/75">
                  ₱{fmt(s.amount)}
                  <span className="ml-1.5 text-white/50">{Math.round((s.amount / moneyOut) * 100)}%</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm text-white/70">No spending from this account yet.</p>
      )}
    </section>
  )
}

/** The bank's logo on a white chip, like the reference; falls back to a wallet icon if the file is missing. */
function BrandMark({ logo, name }: { logo?: string; name: string }) {
  const [failed, setFailed] = useState(false)
  if (logo && !failed) {
    return (
      <span className="inline-flex h-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white px-2 py-1.5 shadow-sm">
        <img src={logo} alt={`${name} logo`} className="h-full w-auto max-w-[96px] object-contain" onError={() => setFailed(true)} />
      </span>
    )
  }
  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/18 ring-1 ring-white/30">
      <Icon name="wallet" className="h-[16px] w-[16px]" strokeWidth={2} />
    </span>
  )
}

function Figure({ label, amount, sign, dim = false }: { label: string; amount: number; sign: string; dim?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/65">{label}</p>
      <p className={`mt-1 text-[17px] font-medium leading-none tabular ${dim ? 'text-white/80' : 'text-white'}`}>
        <span className="mr-0.5 text-[13px] opacity-70">{sign}₱</span>
        {fmt(amount)}
      </p>
    </div>
  )
}
