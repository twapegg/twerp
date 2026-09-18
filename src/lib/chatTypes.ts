export type ChatRole = 'user' | 'assistant'

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  createdAt: string
}

export type PendingActionStatus = 'pending' | 'confirmed' | 'cancelled' | 'expired' | 'failed'

export type PendingAction = {
  id: string
  kind: 'add_transaction' | 'update_budget' | 'delete_transaction'
  summary: string
  status: PendingActionStatus
}
