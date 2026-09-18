import { useEffect, useState } from 'react'
import { data } from '../lib/data'
import type { Goal, Income } from '../lib/types'
import type { GoalPatch, NewGoalInput } from '../lib/dataSource'
import GoalsPanel from '../components/GoalsPanel'
import PageHeader from '../components/PageHeader'

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [income, setIncome] = useState<Income | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([data.getGoals(), data.getIncome()])
      .then(([g, inc]) => {
        setGoals(g)
        setIncome(inc)
        setLoading(false)
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e))
        setLoading(false)
      })
  }, [])

  if (loading) return <p className="px-1 text-sm text-muted">Loading…</p>

  async function handleAdd(input: NewGoalInput) {
    const created = await data.addGoal(input)
    setGoals((prev) => [...prev, created])
  }

  async function handleUpdate(id: string, patch: GoalPatch) {
    const updated = await data.updateGoal(id, patch)
    setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)))
  }

  async function handleDelete(id: string) {
    await data.deleteGoal(id)
    setGoals((prev) => prev.filter((g) => g.id !== id))
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Goals" subtitle="What you're saving for, and how close you are." />
      {error && <p className="text-sm text-rust">Something went wrong: {error}</p>}
      <GoalsPanel
        goals={goals}
        income={income?.monthlyAmount ?? null}
        onAdd={handleAdd}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onError={setError}
        style={{ animationDelay: '80ms' }}
      />
    </div>
  )
}
