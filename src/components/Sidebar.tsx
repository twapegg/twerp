import { NavLink } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Icon, { type IconName } from './Icon'
import ThemeToggle from './ThemeToggle'
import Twerp from './Twerp'

const links: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Dashboard', icon: 'home' },
  { to: '/transactions', label: 'Transactions', icon: 'list' },
  { to: '/budgets', label: 'Budgets', icon: 'chart' },
  { to: '/goals', label: 'Goals', icon: 'flag' },
]

export default function Sidebar() {
  return (
    <aside className="glass rise sticky top-4 flex h-[calc(100vh-2rem)] w-60 shrink-0 flex-col self-start rounded-tile p-4">
      {/* App identity */}
      <div className="mb-8 flex items-center gap-3 px-2 pt-1">
        <Twerp size={42} fill={0.62} title="Twerp" animate={false} />
        <div className="leading-tight">
          <p className="font-display text-[17px] font-semibold tracking-tight">Twerp</p>
          <p className="text-[11px] text-muted">Personal finance</p>
        </div>
      </div>

      {/* Navigation: active item is a raised glass pill */}
      <nav className="flex flex-col gap-1.5">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-full px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ease-spring active:scale-[0.98] ${
                isActive
                  ? 'glass-pill text-ink'
                  : 'text-muted hover:bg-ink/[0.05] hover:text-ink'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  name={link.icon}
                  className={`h-[18px] w-[18px] ${isActive ? 'text-pine' : ''}`}
                  strokeWidth={isActive ? 2.1 : 1.8}
                />
                {link.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-2">
        <ThemeToggle />
        <button onClick={() => supabase.auth.signOut()} className="btn btn-ghost justify-start px-3.5">
          <Icon name="logout" className="h-[18px] w-[18px]" />
          Log out
        </button>
      </div>
    </aside>
  )
}
