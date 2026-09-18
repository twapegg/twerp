import { useEffect, useState } from 'react'
import Icon, { type IconName } from './Icon'

type Theme = 'light' | 'dark' | 'system'
const STORAGE_KEY = 'twerp-theme'

function readTheme(): Theme {
  try {
    const t = localStorage.getItem(STORAGE_KEY)
    if (t === 'light' || t === 'dark') return t
  } catch {
    /* storage unavailable */
  }
  return 'system'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') delete root.dataset.theme
  else root.dataset.theme = theme
  try {
    if (theme === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* storage unavailable */
  }
}

const options: { value: Theme; icon: IconName; label: string }[] = [
  { value: 'light', icon: 'sun', label: 'Light' },
  { value: 'dark', icon: 'moon', label: 'Dark' },
  { value: 'system', icon: 'auto', label: 'Match system' },
]

/** Segmented light / dark / system control. */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return (
    <div className="track flex h-10 p-1" role="radiogroup" aria-label="Appearance">
      {options.map((opt) => {
        const active = theme === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.label}
            title={opt.label}
            onClick={() => setTheme(opt.value)}
            className={`flex flex-1 items-center justify-center rounded-full transition-all duration-200 ease-spring ${
              active ? 'glass-pill text-pine' : 'text-muted hover:text-ink'
            }`}
          >
            <Icon name={opt.icon} className="h-4 w-4" strokeWidth={active ? 2.2 : 1.9} />
          </button>
        )
      })}
    </div>
  )
}
