export type Account = {
  id: string
  name: string
  kind: 'checking' | 'savings' | 'credit' | 'cash' | 'ewallet'
}

export type Category = {
  id: string
  name: string
  color: 'pine' | 'rust' | 'muted'
  kind: 'expense' | 'savings'
}

export type Transaction = {
  id: string
  accountId: string
  categoryId: string
  amount: number // positive = income, negative = expense
  note: string
  occurredAt: string // ISO date
}

export type Budget = {
  id: string
  categoryId: string
  limitAmount: number
  period: 'monthly'
}

export type Income = {
  id: string
  monthlyAmount: number
}

export type Goal = {
  id: string
  name: string
  /** A goal is money to save up; a want is a thing to buy. Same mechanics, different framing. */
  kind: 'goal' | 'want'
  targetAmount: number
  savedAmount: number
  /** Set aside each month; counts toward the paycheck allocation. 0 if not planned. */
  monthlyContribution: number
  /** ISO date to have it by, or null. */
  targetDate: string | null
  note: string
  /** True: the set-aside is part of the Savings budget. False: extra money from the paycheck. */
  fundedFromSavings: boolean
  /** When it was reached or bought; null while still active. */
  achievedAt: string | null
}

export type Debt = {
  id: string
  name: string
  /** What is still owed right now. */
  balance: number
  /** What was borrowed originally; lets the UI show payoff progress. */
  originalAmount: number
  /** Fixed amount paid toward this debt each month. */
  monthlyPayment: number
  /** Annual interest rate in percent, e.g. 24 for 24% p.a. 0 for interest-free. */
  interestRate: number
  /** Day of month the payment is due (1–31), or null if not tracked. */
  dueDay: number | null
}
