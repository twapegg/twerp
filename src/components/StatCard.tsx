import Icon, { type IconName } from './Icon'

const toneText = {
  ink: 'text-ink',
  pine: 'text-pine',
  mint: 'text-mint',
  rust: 'text-rust',
} as const

const toneBadge = {
  ink: '',
  pine: 'text-pine',
  mint: 'text-mint',
  rust: 'text-rust',
} as const

export default function StatCard({
  label,
  amount,
  tone = 'ink',
  icon,
  hint,
  delay = 0,
}: {
  label: string
  amount: number
  tone?: keyof typeof toneText
  icon?: IconName
  hint?: string
  delay?: number
}) {
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return (
    <div
      className="glass glass-hover rise flex min-h-[148px] flex-col justify-between rounded-tile p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <p className="eyebrow">{label}</p>
        {icon && (
          <span className={`glass-badge ${toneBadge[tone]}`}>
            <Icon name={icon} className="h-[15px] w-[15px]" strokeWidth={2.1} />
          </span>
        )}
      </div>
      <div>
        <p className={`text-[28px] font-medium leading-none tabular ${toneText[tone]}`}>
          <span className="mr-0.5 text-[20px] opacity-70">{amount < 0 ? '−' : ''}₱</span>
          {formatted}
        </p>
        {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
      </div>
    </div>
  )
}
