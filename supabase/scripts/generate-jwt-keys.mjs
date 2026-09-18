// One-time setup helper: generates a fresh JWT_SECRET and the two long-lived
// HS256 API keys (anon / service_role) that GoTrue, PostgREST, and Realtime
// all trust once configured with the same secret. Run with plain Node
// (no dependencies) and paste the output into supabase/.env.
//
//   node scripts/generate-jwt-keys.mjs
import { randomBytes, createHmac } from 'node:crypto'

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function signJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const encodedHeader = base64url(JSON.stringify(header))
  const encodedPayload = base64url(JSON.stringify(payload))
  const signature = base64url(
    createHmac('sha256', secret).update(`${encodedHeader}.${encodedPayload}`).digest()
  )
  return `${encodedHeader}.${encodedPayload}.${signature}`
}

const jwtSecret = randomBytes(32).toString('hex')
const secretKeyBase = randomBytes(48).toString('base64')

const now = Math.floor(Date.now() / 1000)
const tenYears = 10 * 365 * 24 * 60 * 60

const anonKey = signJwt({ role: 'anon', iss: 'ledger-self-hosted', iat: now, exp: now + tenYears }, jwtSecret)
const serviceRoleKey = signJwt(
  { role: 'service_role', iss: 'ledger-self-hosted', iat: now, exp: now + tenYears },
  jwtSecret
)

console.log(`JWT_SECRET=${jwtSecret}`)
console.log(`ANON_KEY=${anonKey}`)
console.log(`SERVICE_ROLE_KEY=${serviceRoleKey}`)
console.log(`SECRET_KEY_BASE=${secretKeyBase}`)
console.log(`POSTGRES_PASSWORD=${randomBytes(24).toString('hex')}`)
