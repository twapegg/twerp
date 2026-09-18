// Pushes n8n/workflows/*.json to a live n8n instance through its public API.
//
//   node n8n/scripts/push-workflows.mjs            # push all three
//   node n8n/scripts/push-workflows.mjs ledger-chat # push one
//
// Reads N8N_API_URL and N8N_API_KEY from .env.local (never VITE_-prefixed, so
// they stay out of the browser bundle). Workflows are matched by name; the
// credentials already attached on the live copy are carried over node by
// node, because the JSON in the repo deliberately contains none.
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const env = Object.fromEntries(
  readFileSync(join(root, '.env.local'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()])
)
const base = (env.N8N_API_URL || env.VITE_N8N_BASE_URL || '').replace(/\/+$/, '')
const key = env.N8N_API_KEY
if (!base || !key) {
  console.error('Set N8N_API_URL and N8N_API_KEY in .env.local first.')
  process.exit(1)
}

const api = async (path, init = {}) => {
  const res = await fetch(`${base}/api/v1${path}`, {
    ...init,
    headers: { 'X-N8N-API-KEY': key, 'Content-Type': 'application/json', ...(init.headers || {}) },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${path} -> ${res.status}: ${text.slice(0, 300)}`)
  return text ? JSON.parse(text) : null
}

const only = process.argv[2]
const dir = join(root, 'n8n', 'workflows')
const files = readdirSync(dir).filter((f) => f.endsWith('.json') && (!only || f === `${only}.json`))
if (!files.length) {
  console.error(`No workflow file matches "${only}" in ${dir}`)
  process.exit(1)
}

const live = (await api('/workflows?limit=250')).data
for (const file of files) {
  const local = JSON.parse(readFileSync(join(dir, file), 'utf8'))
  const target = live.find((w) => w.name === local.name)
  if (!target) {
    console.log(`skip ${file}: no live workflow named "${local.name}" (import it once by hand, then re-run)`)
    continue
  }
  const current = await api(`/workflows/${target.id}`)
  const credsByNode = Object.fromEntries(current.nodes.map((n) => [n.name, n.credentials]).filter(([, c]) => c))
  const nodes = local.nodes.map((n) => (credsByNode[n.name] ? { ...n, credentials: credsByNode[n.name] } : n))
  const missing = nodes.filter((n) => /postgres|lmChat|webhook$/i.test(n.type) && !n.credentials).map((n) => n.name)
  const body = { name: local.name, nodes, connections: local.connections, settings: local.settings || current.settings || { executionOrder: 'v1' } }
  const updated = await api(`/workflows/${target.id}`, { method: 'PUT', body: JSON.stringify(body) })
  console.log(`pushed ${file} -> ${target.id} (${updated.nodes.length} nodes, active=${updated.active})`)
  if (missing.length) console.log(`  attach credentials in the n8n UI for: ${missing.join(', ')}`)
}
