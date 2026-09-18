import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Icon from '../components/Icon'
import Twerp from '../components/Twerp'

type Mode = 'signin' | 'forgot'

export default function Login({ notice, onNoticeSeen }: { notice?: string; onNoticeSeen?: () => void }) {
  const [mode, setMode] = useState<Mode>(notice ? 'forgot' : 'signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setSent(false)
    onNoticeSeen?.()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    if (mode === 'forgot') {
      // Supabase emails a link that lands on /reset-password with a session;
      // AuthContext spots that path and App shows the new-password screen.
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) setError(error.message)
      else setSent(true)
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }
    setSubmitting(false)
  }

  const forgot = mode === 'forgot'

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="glass rise w-full max-w-sm rounded-tile p-8">
        <div className="mb-7 flex flex-col items-center text-center">
          <Twerp size={84} fill={0.6} className="mb-3" />
          <h1 className="font-display text-[28px] font-bold tracking-tight">Twerp</h1>
          <p className="mt-1 text-sm text-muted">
            {forgot ? 'We will email you a link to set a new password.' : 'Sign in to your account'}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {notice && forgot && !sent && (
            <p className="rounded-[22px] bg-chart-amber/[0.14] px-4 py-2.5 text-sm text-ink ring-1 ring-inset ring-chart-amber/30">{notice}</p>
          )}
          <input
            type="email"
            autoComplete="email"
            className="field"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={sent}
          />
          {!forgot && (
            <input
              type="password"
              autoComplete="current-password"
              className="field"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          {error && (
            <p className="rounded-[22px] bg-rust-light px-4 py-2.5 text-sm text-rust ring-1 ring-inset ring-rust/20">{error}</p>
          )}
          {sent ? (
            <p className="rounded-[22px] bg-mint-light px-4 py-2.5 text-sm text-mint ring-1 ring-inset ring-mint/20">
              Check your inbox for a reset link. It opens this app on a new-password screen.
            </p>
          ) : (
            <button type="submit" disabled={submitting || !email} className="btn btn-primary mt-2 w-full py-2.5">
              <Icon name={forgot ? 'send' : 'lock'} className="h-4 w-4" strokeWidth={2} />
              {submitting ? (forgot ? 'Sending…' : 'Signing in…') : forgot ? 'Send reset link' : 'Sign in'}
            </button>
          )}
          <button
            type="button"
            onClick={() => switchMode(forgot ? 'signin' : 'forgot')}
            className="btn btn-ghost btn-sm mx-auto mt-1 text-muted"
          >
            {forgot ? 'Back to sign in' : 'Forgot password?'}
          </button>
        </div>
      </form>
    </div>
  )
}
