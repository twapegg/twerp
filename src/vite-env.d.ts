/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** n8n base URL, no trailing slash. The three webhook paths hang off it. */
  readonly VITE_N8N_BASE_URL?: string
  /** Static shared secret sent as X-Ledger-Secret; the webhooks also check the user's session token. */
  readonly VITE_N8N_SHARED_SECRET?: string
  /** Optional per-webhook overrides when the paths differ from n8n/workflows. */
  readonly VITE_N8N_CHAT_WEBHOOK_URL?: string
  readonly VITE_N8N_CONFIRM_WEBHOOK_URL?: string
  readonly VITE_N8N_QUICKADD_WEBHOOK_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
