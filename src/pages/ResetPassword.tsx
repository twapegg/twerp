import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Icon from '../components/Icon'
import Twerp from '../components/Twerp'

/**
 * Shown after the user clicks the password-reset link from their email.
 * Supabase has already exchanged the link for a session by the time we render,
 * so all that's left is to set the new password on that session.
 */
export default function ResetPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) return setError('Use at least 8 characters.')
    if (password !== confirm) return setError('Those two passwords do not match.')
    setSubmitting(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    setSubmitting(false)
    if (error) return setError(error.message)
    setDone(true)
    setTimeout(onDone, 1200)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="glass rise w-full max-w-sm rounded-tile p-8">
        <div className="mb-7 flex flex-col items-center text-center">
          <Twerp size={84} fill={0.6} className="mb-3" />
          <h1 className="font-display text-[28px] font-bold tracking-tight">New password</h1>
          <p className="mt-1 text-sm text-muted">Pick something you will remember this time.</p>
        </div>

        {done ? (
          <p className="rounded-[22px] bg-mint-light px-4 py-2.5 text-center text-sm text-mint ring-1 ring-inset ring-mint/20">
            Password updated. Taking you in…
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <input
              type="password"
              autoComplete="new-password"
              className="field"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <input
              type="password"
              autoComplete="new-password"
              className="field"
              placeholder="Repeat it"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {error && (
              <p className="rounded-[22px] bg-rust-light px-4 py-2.5 text-sm text-rust ring-1 ring-inset ring-rust/20">{error}</p>
            )}
            <button type="submit" disabled={submitting} className="btn btn-primary mt-2 w-full py-2.5">
              <Icon name="check" className="h-4 w-4" strokeWidth={2.2} />
              {submitting ? 'Saving…' : 'Set new password'}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
