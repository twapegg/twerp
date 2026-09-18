import type { DataSource } from './dataSource'
import type { Account, Budget, Category, Debt, Goal, Income, Transaction } from './types'
import { supabase } from './supabaseClient'

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message)
  if (data === null) throw new Error('Supabase returned no data')
  return data
}

const mapAccount = (r: any): Account => ({ id: r.id, name: r.name, kind: r.kind })
const mapCategory = (r: any): Category => ({ id: r.id, name: r.name, color: r.color, kind: r.kind })
const mapIncome = (r: any): Income => ({ id: r.id, monthlyAmount: Number(r.monthly_amount) })
const mapTransaction = (r: any): Transaction => ({
  id: r.id,
  accountId: r.account_id,
  categoryId: r.category_id,
  amount: Number(r.amount),
  note: r.note,
  occurredAt: r.occurred_at,
})
const mapBudget = (r: any): Budget => ({
  id: r.id,
  categoryId: r.category_id,
  limitAmount: Number(r.limit_amount),
  period: r.period,
})
const mapDebt = (r: any): Debt => ({
  id: r.id,
  name: r.name,
  balance: Number(r.balance),
  originalAmount: Number(r.original_amount),
  monthlyPayment: Number(r.monthly_payment),
  interestRate: Number(r.interest_rate),
  dueDay: r.due_day === null || r.due_day === undefined ? null : Number(r.due_day),
})

const mapGoal = (r: any): Goal => ({
  id: r.id,
  name: r.name,
  kind: r.kind,
  targetAmount: Number(r.target_amount),
  savedAmount: Number(r.saved_amount),
  monthlyContribution: Number(r.monthly_contribution),
  targetDate: r.target_date ?? null,
  note: r.note ?? '',
  fundedFromSavings: Boolean(r.funded_from_savings),
  achievedAt: r.achieved_at ?? null,
})

const goalRow = (g: Partial<Omit<Goal, 'id'>>) => {
  const row: Record<string, unknown> = {}
  if (g.name !== undefined) row.name = g.name
  if (g.kind !== undefined) row.kind = g.kind
  if (g.targetAmount !== undefined) row.target_amount = g.targetAmount
  if (g.savedAmount !== undefined) row.saved_amount = g.savedAmount
  if (g.monthlyContribution !== undefined) row.monthly_contribution = g.monthlyContribution
  if (g.targetDate !== undefined) row.target_date = g.targetDate
  if (g.note !== undefined) row.note = g.note
  if (g.fundedFromSavings !== undefined) row.funded_from_savings = g.fundedFromSavings
  if (g.achievedAt !== undefined) row.achieved_at = g.achievedAt
  return row
}

// Debt fields are camelCase in the app and snake_case in Postgres; only
// keys actually present in the patch are sent so partial updates stay partial.
const debtRow = (d: Partial<Omit<Debt, 'id'>>) => {
  const row: Record<string, unknown> = {}
  if (d.name !== undefined) row.name = d.name
  if (d.balance !== undefined) row.balance = d.balance
  if (d.originalAmount !== undefined) row.original_amount = d.originalAmount
  if (d.monthlyPayment !== undefined) row.monthly_payment = d.monthlyPayment
  if (d.interestRate !== undefined) row.interest_rate = d.interestRate
  if (d.dueDay !== undefined) row.due_day = d.dueDay
  return row
}

export const supabaseData: DataSource = {
  async getAccounts() {
    const res = await supabase.from('accounts').select('*')
    return unwrap(res).map(mapAccount)
  },
  async getCategories() {
    const res = await supabase.from('categories').select('*')
    return unwrap(res).map(mapCategory)
  },
  async getTransactions() {
    const res = await supabase
      .from('transactions')
      .select('*')
      .is('deleted_at', null)
      .order('occurred_at', { ascending: false })
    return unwrap(res).map(mapTransaction)
  },
  async getBudgets() {
    const res = await supabase.from('budgets').select('*')
    return unwrap(res).map(mapBudget)
  },
  async getIncome() {
    const { data, error } = await supabase.from('income').select('*').limit(1).maybeSingle()
    if (error) throw new Error(error.message)
    return data ? mapIncome(data) : null
  },
  async addTransaction(input) {
    const res = await supabase
      .from('transactions')
      .insert({
        account_id: input.accountId,
        category_id: input.categoryId,
        amount: input.amount,
        note: input.note,
        occurred_at: input.occurredAt,
      })
      .select()
      .single()
    return mapTransaction(unwrap(res))
  },
  async updateTransaction(transactionId, patch) {
    const row: Record<string, unknown> = {}
    if (patch.accountId !== undefined) row.account_id = patch.accountId
    if (patch.categoryId !== undefined) row.category_id = patch.categoryId
    if (patch.amount !== undefined) row.amount = patch.amount
    if (patch.note !== undefined) row.note = patch.note
    if (patch.occurredAt !== undefined) row.occurred_at = patch.occurredAt
    const res = await supabase.from('transactions').update(row).eq('id', transactionId).select().single()
    return mapTransaction(unwrap(res))
  },
  async deleteTransaction(transactionId) {
    const { error } = await supabase
      .from('transactions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', transactionId)
    if (error) throw new Error(error.message)
  },
  async updateBudgetLimit(budgetId, limitAmount) {
    const res = await supabase
      .from('budgets')
      .update({ limit_amount: limitAmount })
      .eq('id', budgetId)
      .select()
      .single()
    return mapBudget(unwrap(res))
  },
  async updateIncome(monthlyAmount) {
    const existing = await supabase.from('income').select('id').limit(1).maybeSingle()
    if (existing.error) throw new Error(existing.error.message)

    const res = existing.data
      ? await supabase
          .from('income')
          .update({ monthly_amount: monthlyAmount })
          .eq('id', existing.data.id)
          .select()
          .single()
      : await supabase.from('income').insert({ monthly_amount: monthlyAmount }).select().single()
    return mapIncome(unwrap(res))
  },
  async addBudget(input) {
    const catRes = await supabase
      .from('categories')
      .insert({ name: input.name, kind: input.kind, color: input.kind === 'savings' ? 'pine' : 'muted' })
      .select()
      .single()
    const category = mapCategory(unwrap(catRes))

    const budRes = await supabase
      .from('budgets')
      .insert({ category_id: category.id, limit_amount: input.limitAmount, period: 'monthly' })
      .select()
      .single()
    if (budRes.error) {
      // Roll back the orphan category so a failed insert leaves nothing behind.
      await supabase.from('categories').delete().eq('id', category.id)
      throw new Error(budRes.error.message)
    }
    return { category, budget: mapBudget(unwrap(budRes)) }
  },
  async deleteBudget(budgetId) {
    const existing = await supabase.from('budgets').select('category_id').eq('id', budgetId).single()
    const categoryId: string = unwrap(existing).category_id

    const del = await supabase.from('budgets').delete().eq('id', budgetId)
    if (del.error) throw new Error(del.error.message)

    const { count, error: countError } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', categoryId)
    if (countError) throw new Error(countError.message)
    if ((count ?? 0) > 0) return { categoryRemoved: false }

    const catDel = await supabase.from('categories').delete().eq('id', categoryId)
    if (catDel.error) throw new Error(catDel.error.message)
    return { categoryRemoved: true }
  },
  async getDebts() {
    const res = await supabase.from('debts').select('*').order('created_at', { ascending: true })
    return unwrap(res).map(mapDebt)
  },
  async addDebt(input) {
    const res = await supabase.from('debts').insert(debtRow(input)).select().single()
    return mapDebt(unwrap(res))
  },
  async updateDebt(debtId, patch) {
    const res = await supabase.from('debts').update(debtRow(patch)).eq('id', debtId).select().single()
    return mapDebt(unwrap(res))
  },
  async deleteDebt(debtId) {
    const res = await supabase.from('debts').delete().eq('id', debtId)
    if (res.error) throw new Error(res.error.message)
  },
  async getGoals() {
    const res = await supabase.from('goals').select('*').order('created_at', { ascending: true })
    return unwrap(res).map(mapGoal)
  },
  async addGoal(input) {
    const res = await supabase.from('goals').insert(goalRow(input)).select().single()
    return mapGoal(unwrap(res))
  },
  async updateGoal(goalId, patch) {
    const res = await supabase.from('goals').update(goalRow(patch)).eq('id', goalId).select().single()
    return mapGoal(unwrap(res))
  },
  async deleteGoal(goalId) {
    const res = await supabase.from('goals').delete().eq('id', goalId)
    if (res.error) throw new Error(res.error.message)
  },
}
