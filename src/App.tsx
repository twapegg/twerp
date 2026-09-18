import { Navigate, Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Budgets from './pages/Budgets'
import Goals from './pages/Goals'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import ChatBubble from './components/ChatBubble'
import { AuthProvider, useAuth } from './lib/AuthContext'

function AuthGate() {
  const { session, loading, recovering, finishRecovery } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="glass-pill rounded-full px-5 py-2.5 text-sm text-muted">Loading…</div>
      </div>
    )
  }
  if (recovering && session) return <ResetPassword onDone={finishRecovery} />
  if (!session) {
    return (
      <Login
        notice={recovering ? 'That reset link is invalid or has expired. Request a new one below.' : undefined}
        onNoticeSeen={finishRecovery}
      />
    )
  }

  return (
    <div className="flex min-h-screen gap-5 p-4">
      <Sidebar />
      <main className="min-w-0 flex-1 px-2 py-4 pr-4">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/goals" element={<Goals />} />
          {/* Anything else (old links, a finished /reset-password) goes home instead of rendering blank. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <ChatBubble />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}
