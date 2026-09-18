import type { Account, Budget, Category, Debt, Goal, Income, Transaction } from './types'

export type NewBudgetInput = {
  name: string
  kind: Category['kind']
  limitAmount: number
}

export type TransactionPatch = Partial<Omit<Transaction, 'id'>>
export type NewDebtInput = Omit<Debt, 'id'>
export type NewGoalInput = Omit<Goal, 'id' | 'achievedAt'> & { achievedAt?: string | null }
export type GoalPatch = Partial<Omit<Goal, 'id'>>
export type DebtPatch = Partial<Omit<Debt, 'id'>>

// Any real backend (self-hosted Supabase, eventually) implements this same
// interface. Swapping lib/data.ts to point at a supabase.ts implementation
// is the only change the rest of the app should ever need.
export interface DataSource {
  getAccounts(): Promise<Account[]>
  getCategories(): Promise<Category[]>
  getTransactions(): Promise<Transaction[]>
  getBudgets(): Promise<Budget[]>
  getIncome(): Promise<Income | null>
  addTransaction(input: Omit<Transaction, 'id'>): Promise<Transaction>
  /** Soft-deletes a transaction (sets deleted_at); it disappears from lists but stays recoverable. */
  deleteTransaction(transactionId: string): Promise<void>
  /** Edits any subset of a transaction's fields and returns the updated row. */
  updateTransaction(transactionId: string, patch: TransactionPatch): Promise<Transaction>
  updateBudgetLimit(budgetId: string, limitAmount: number): Promise<Budget>
  updateIncome(monthlyAmount: number): Promise<Income>
  /** Creates a category and its monthly budget in one step. */
  addBudget(input: NewBudgetInput): Promise<{ category: Category; budget: Budget }>
  /**
   * Removes a budget. The category is removed too when nothing else refers
   * to it; if transactions still point at it, the category is kept.
   * Resolves with whether the category was removed.
   */
  deleteBudget(budgetId: string): Promise<{ categoryRemoved: boolean }>
  getDebts(): Promise<Debt[]>
  addDebt(input: NewDebtInput): Promise<Debt>
  updateDebt(debtId: string, patch: DebtPatch): Promise<Debt>
  deleteDebt(debtId: string): Promise<void>
  getGoals(): Promise<Goal[]>
  addGoal(input: NewGoalInput): Promise<Goal>
  updateGoal(goalId: string, patch: GoalPatch): Promise<Goal>
  deleteGoal(goalId: string): Promise<void>
}
