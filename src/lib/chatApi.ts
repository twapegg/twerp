import { getAccessToken, supabase } from './supabaseClient'
import type { ChatMessage, PendingAction } from './chatTypes'
import type { Transaction } from './types'

// Point the app at an n8n instance with one setting: VITE_N8N_BASE_URL
// (e.g. https://n8n.example.com or https://you.app.n8n.cloud). The three
// webhook paths are fixed by the workflow JSON under n8n/workflows. The
// per-webhook VITE_N8N_*_WEBHOOK_URL variables still work as overrides.
const BASE_URL = (import.meta.env.VITE_N8N_BASE_URL ?? '').replace(/\/+$/, '')
const webhook = (override: string | undefined, path: string) => override || (BASE_URL ? `${BASE_URL}/webhook/${path}` : '')
const CHAT_WEBHOOK_URL = webhook(import.meta.env.VITE_N8N_CHAT_WEBHOOK_URL, 'ledger-chat')
const CONFIRM_WEBHOOK_URL = webhook(import.meta.env.VITE_N8N_CONFIRM_WEBHOOK_URL, 'ledger-chat-confirm')
const QUICKADD_WEBHOOK_URL = webhook(import.meta.env.VITE_N8N_QUICKADD_WEBHOOK_URL, 'ledger-quickadd')
const SHARED_SECRET = import.meta.env.VITE_N8N_SHARED_SECRET ?? ''

function requireUrl(url: string): string {
  if (!url) throw new Error('No n8n URL configured. Set VITE_N8N_BASE_URL in .env.local and restart the dev server.')
  return url
}

/**
 * POSTs JSON to an n8n webhook. Every call carries the signed-in user's
 * Supabase access token; the workflows verify it against Supabase Auth
 * before touching anything, so the static shared secret (which ships in
 * the public JS bundle) is not what protects the data.
 */
async function postWebhook(url: string, body: unknown, label: string): Promise<string> {
  const token = await getAccessToken()
  if (!token) throw new Error('You are signed out. Sign in again to use the assistant.')
  const res = await fetch(requireUrl(url), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Ledger-Secret': SHARED_SECRET,
    },
    body: JSON.stringify(body),
  })
  if (res.status === 401 || res.status === 403) throw new Error('The assistant rejected your session. Sign out and back in, then try again.')
  if (!res.ok) throw new Error(`${label} request failed: ${res.status}`)
  // n8n answers 200 with an empty body when the workflow errors before its
  // "Respond to Webhook" node (e.g. the model node has no API key yet).
  const raw = await res.text()
  if (!raw.trim()) throw new Error(`The ${label.toLowerCase()} workflow ran but returned nothing. Check its execution log in n8n.`)
  return raw
}

const mapMessage = (r: any): ChatMessage => ({
  id: r.id,
  role: r.role,
  content: r.content,
  createdAt: r.created_at,
})
const mapPendingAction = (r: any): PendingAction => ({
  id: r.id,
  kind: r.kind,
  summary: typeof r.summary === 'string' && r.summary.trim() ? r.summary : 'Proposed change (no description given)',
  // The chat workflow's response omits status; anything it returns is by definition still pending.
  status: r.status ?? 'pending',
})

// n8n emits one empty item when a query matches no rows, so a reply with no
// proposals used to arrive as `[{}]` and render as a blank confirm card.
const isRealAction = (r: any) => Boolean(r && typeof r.id === 'string' && r.id)

export async function getChatHistory(sessionId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map(mapMessage)
}

export async function getPendingActions(sessionId: string): Promise<PendingAction[]> {
  const { data, error } = await supabase
    .from('pending_actions')
    .select('*')
    .eq('session_id', sessionId)
    .eq('status', 'pending')
  if (error) throw new Error(error.message)
  return (data ?? []).filter(isRealAction).map(mapPendingAction)
}

export async function sendChatMessage(
  sessionId: string,
  message: string
): Promise<{ reply: string; pendingActions: PendingAction[] }> {
  const raw = await postWebhook(CHAT_WEBHOOK_URL, { sessionId, message }, 'Chat')
  const data = JSON.parse(raw)
  return { reply: data.reply ?? '', pendingActions: (data.pendingActions ?? []).filter(isRealAction).map(mapPendingAction) }
}

export async function confirmPendingAction(
  pendingActionId: string,
  decision: 'confirm' | 'cancel'
): Promise<{ status: string }> {
  const raw = await postWebhook(CONFIRM_WEBHOOK_URL, { pendingActionId, decision }, 'Confirm')
  const data = JSON.parse(raw)
  return { status: typeof data.status === 'string' ? data.status : 'failed' }
}

export type QuickAddRequest = {
  text: string
  today: string
  defaultAccountId: string
  accounts: { id: string; name: string }[]
  categories: { id: string; name: string }[]
}

export type QuickAddResult = {
  transaction: Omit<Transaction, 'id'>
  confidence: 'high' | 'low'
  explanation: string
}

/**
 * Single fast model call: turns one line of text into transaction fields. The
 * workflow has no database access; the caller saves the row itself.
 */
export async function parseQuickAdd(input: QuickAddRequest): Promise<QuickAddResult> {
  const raw = await postWebhook(QUICKADD_WEBHOOK_URL, input, 'Quick-add')
  const data = JSON.parse(raw)
  if (!data.ok) throw new Error(data.error || 'Could not understand that.')
  return { transaction: data.transaction, confidence: data.confidence, explanation: data.explanation ?? '' }
}
