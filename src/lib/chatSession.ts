const STORAGE_KEY = 'ledger-chat-session-id'

export function getOrCreateSessionId(): string {
  const existing = localStorage.getItem(STORAGE_KEY)
  if (existing) return existing
  const created = crypto.randomUUID()
  localStorage.setItem(STORAGE_KEY, created)
  return created
}
