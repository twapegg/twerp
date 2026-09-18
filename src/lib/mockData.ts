import type { DataSource } from './dataSource'
import type { Account, Budget, Category, Debt, Goal, Income, Transaction } from './types'

const accounts: Account[] = [
  { id: 'acc-checking', name: 'Everyday checking', kind: 'checking' },
  { id: 'acc-savings', name: 'Savings', kind: 'savings' },
  { id: 'acc-credit', name: 'Credit card', kind: 'credit' },
]

const categories: Category[] = [
  { id: 'cat-income', name: 'Income', color: 'pine', kind: 'expense' },
  { id: 'cat-groceries', name: 'Groceries', color: 'muted', kind: 'expense' },
  { id: 'cat-dining', name: 'Dining out', color: 'rust', kind: 'expense' },
  { id: 'cat-transport', name: 'Transport', color: 'muted', kind: 'expense' },
  { id: 'cat-subs', name: 'Subscriptions', color: 'muted', kind: 'expense' },
  { id: 'cat-fun', name: 'Fun money', color: 'rust', kind: 'expense' },
]

let income: Income = { id: 'income-1', monthlyAmount: 3200 }

let transactions: Transaction[] = [
  { id: 't1', accountId: 'acc-checking', categoryId: 'cat-income', amount: 3200, note: 'Salary', occurredAt: '2026-07-01' },
  { id: 't2', accountId: 'acc-checking', categoryId: 'cat-groceries', amount: -84.5, note: 'Robinsons Supermarket', occurredAt: '2026-07-02' },
  { id: 't3', accountId: 'acc-credit', categoryId: 'cat-dining', amount: -18.75, note: 'Coffee & lunch', occurredAt: '2026-07-03' },
  { id: 't4', accountId: 'acc-checking', categoryId: 'cat-subs', amount: -12.99, note: 'Cloud storage', occurredAt: '2026-07-04' },
  { id: 't5', accountId: 'acc-credit', categoryId: 'cat-transport', amount: -22.0, note: 'Grab rides', occurredAt: '2026-07-05' },
  { id: 't6', accountId: 'acc-checking', categoryId: 'cat-fun', amount: -45.0, note: 'Movie night', occurredAt: '2026-07-05' },
  { id: 't7', accountId: 'acc-credit', categoryId: 'cat-groceries', amount: -37.2, note: 'Market run', occurredAt: '2026-07-06' },
]

let budgets: Budget[] = [
  { id: 'b1', categoryId: 'cat-groceries', limitAmount: 400, period: 'monthly' },
  { id: 'b2', categoryId: 'cat-dining', limitAmount: 150, period: 'monthly' },
  { id: 'b3', categoryId: 'cat-transport', limitAmount: 120, period: 'monthly' },
  { id: 'b4', categoryId: 'cat-subs', limitAmount: 60, period: 'monthly' },
  { id: 'b5', categoryId: 'cat-fun', limitAmount: 150, period: 'monthly' },
]

let goals: Goal[] = []

let debts: Debt[] = [
  { id: 'd1', name: 'Laptop instalment', balance: 18000, originalAmount: 36000, monthlyPayment: 3000, interestRate: 0, dueDay: 15 },
  { id: 'd2', name: 'Credit card', balance: 9450, originalAmount: 12000, monthlyPayment: 2500, interestRate: 36, dueDay: 28 },
]

const delay = <T,>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 120))

export const mockDataSource: DataSource = {
  async getAccounts() {
    return delay(accounts)
  },
  async getCategories() {
    return delay(categories)
  },
  async getTransactions() {
    return delay([...transactions].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)))
  },
  async getBudgets() {
    return delay(budgets)
  },
  async addTransaction(input) {
    const created: Transaction = { ...input, id: `t${transactions.length + 1}-${Date.now()}` }
    transactions = [created, ...transactions]
    return delay(created)
  },
  async updateTransaction(transactionId, patch) {
    transactions = transactions.map((t) => (t.id === transactionId ? { ...t, ...patch } : t))
    return delay(transactions.find((t) => t.id === transactionId)!)
  },
  async deleteTransaction(transactionId) {
    transactions = transactions.filter((t) => t.id !== transactionId)
    await delay(undefined)
  },
  async updateBudgetLimit(budgetId, limitAmount) {
    budgets = budgets.map((b) => (b.id === budgetId ? { ...b, limitAmount } : b))
    const updated = budgets.find((b) => b.id === budgetId)!
    return delay(updated)
  },
  async getIncome() {
    return delay(income)
  },
  async updateIncome(monthlyAmount) {
    income = { ...income, monthlyAmount }
    return delay(income)
  },
  async addBudget(input) {
    const category: Category = {
      id: `cat-${Date.now()}`,
      name: input.name,
      kind: input.kind,
      color: input.kind === 'savings' ? 'pine' : 'muted',
    }
    categories.push(category)
    const budget: Budget = { id: `b-${Date.now()}`, categoryId: category.id, limitAmount: input.limitAmount, period: 'monthly' }
    budgets = [...budgets, budget]
    return delay({ category, budget })
  },
  async deleteBudget(budgetId) {
    const budget = budgets.find((b) => b.id === budgetId)
    budgets = budgets.filter((b) => b.id !== budgetId)
    if (!budget) return delay({ categoryRemoved: false })
    const inUse = transactions.some((t) => t.categoryId === budget.categoryId)
    if (!inUse) {
      const idx = categories.findIndex((c) => c.id === budget.categoryId)
      if (idx >= 0) categories.splice(idx, 1)
    }
    return delay({ categoryRemoved: !inUse })
  },
  async getDebts() {
    return delay(debts)
  },
  async addDebt(input) {
    const created: Debt = { ...input, id: `d-${Date.now()}` }
    debts = [...debts, created]
    return delay(created)
  },
  async updateDebt(debtId, patch) {
    debts = debts.map((d) => (d.id === debtId ? { ...d, ...patch } : d))
    const updated = debts.find((d) => d.id === debtId)
    if (!updated) throw new Error('Debt not found')
    return delay(updated)
  },
  async deleteDebt(debtId) {
    debts = debts.filter((d) => d.id !== debtId)
    return delay(undefined)
  },
  async getGoals() {
    return delay(goals)
  },
  async addGoal(input) {
    const created: Goal = { achievedAt: null, ...input, id: `g-${Date.now()}` }
    goals = [...goals, created]
    return delay(created)
  },
  async updateGoal(goalId, patch) {
    goals = goals.map((g) => (g.id === goalId ? { ...g, ...patch } : g))
    const updated = goals.find((g) => g.id === goalId)
    if (!updated) throw new Error('Goal not found')
    return delay(updated)
  },
  async deleteGoal(goalId) {
    goals = goals.filter((g) => g.id !== goalId)
    return delay(undefined)
  },
}
