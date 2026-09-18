import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

type AuthState = {
  session: Session | null
  loading: boolean
  /** True while the user is completing a "forgot password" flow. */
  recovering: boolean
  finishRecovery: () => void
}

const RESET_PATH = '/reset-password'

const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
  recovering: false,
  finishRecovery: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  // Landing on the reset path means we arrived from the emailed link; the
  // PASSWORD_RECOVERY event below covers the case where Supabase tells us
  // explicitly. Either is enough to show the new-password screen.
  const [recovering, setRecovering] = useState(() => window.location.pathname === RESET_PATH)

  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
    })

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [])

  function finishRecovery() {
    setRecovering(false)
    if (window.location.pathname === RESET_PATH) window.history.replaceState({}, '', '/')
  }

  return (
    <AuthContext.Provider value={{ session, loading, recovering, finishRecovery }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
