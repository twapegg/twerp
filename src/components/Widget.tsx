import type { ReactNode } from 'react'
import Icon, { type IconName } from './Icon'

/**
 * A Liquid Glass widget tile. Mirrors the iOS / macOS widget anatomy:
 * a small squircle icon badge, an uppercase eyebrow label, an optional
 * title, and an optional trailing action, above whatever content sits
 * inside the pane.
 */
export default function Widget({
  eyebrow,
  title,
  icon,
  action,
  padded = true,
  hover = false,
  className = '',
  style,
  children,
}: {
  eyebrow?: string
  title?: string
  icon?: IconName
  action?: ReactNode
  padded?: boolean
  hover?: boolean
  className?: string
  style?: React.CSSProperties
  children: ReactNode
}) {
  const hasHeader = eyebrow || title || icon || action

  return (
    <section
      className={`glass rise rounded-tile ${hover ? 'glass-hover' : ''} ${padded ? 'p-5' : ''} ${className}`}
      style={style}
    >
      {hasHeader && (
        <header className={`flex items-start justify-between gap-3 ${padded ? 'mb-4' : 'px-5 pt-5 pb-3'}`}>
          <div className="flex min-w-0 items-center gap-2.5">
            {icon && (
              <span className="glass-badge shrink-0">
                <Icon name={icon} className="h-[15px] w-[15px]" strokeWidth={2} />
              </span>
            )}
            <div className="min-w-0 leading-tight">
              {eyebrow && <p className="eyebrow">{eyebrow}</p>}
              {title && <h2 className="truncate text-[15px] font-semibold tracking-tight text-ink">{title}</h2>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {children}
    </section>
  )
}
