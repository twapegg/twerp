# The assistant: three n8n workflows

The app never calls a model directly. Three small n8n workflows do, and they
are the only server-side code in the project. The JSON under `workflows/` is
portable: import it into any n8n (self-hosted or cloud), attach credentials,
activate, and point the app's `VITE_N8N_BASE_URL` at that instance.

| Workflow | Webhook path | What it does |
| --- | --- | --- |
| `ledger-chat` | `POST /webhook/ledger-chat` | Stores the user's message, loads a snapshot of their data in one query, asks the model (Claude via OpenRouter), stores the reply, returns it with any proposals. |
| `ledger-chat-confirm` | `POST /webhook/ledger-chat-confirm` | Applies or cancels one proposal. The only workflow that writes to real tables. |
| `ledger-quickadd` | `POST /webhook/ledger-quickadd` | Turns one line of text into transaction fields with a single Haiku call. No database access; the app saves the row and offers Undo. |

## Every request is authenticated twice

1. **Header Auth** on each Webhook node checks `X-Ledger-Secret`. This value
   ships inside the browser bundle, so treat it as a nuisance filter, not a
   secret.
2. **Verify session** (the first node after every webhook) sends the
   `Authorization: Bearer <token>` header the app attaches to
   `GET <supabase-url>/auth/v1/user`. Supabase Auth answers 200 only for a
   live session of this project; anything else gets a `401` from n8n before
   any other node runs. This is what actually protects the data.

If you move to a different Supabase project, update the URL and `apikey`
(anon key) on each workflow's **Verify session** node.

## Credentials to create

| Name in the JSON | Type | Value |
| --- | --- | --- |
| Ledger Webhook Secret | Header Auth | name `X-Ledger-Secret`, value = your `VITE_N8N_SHARED_SECRET` |
| Ledger Postgres | Postgres | the Supabase database. Use the session pooler host (`aws-0-<region>.pooler.supabase.com`, user `postgres.<ref>`) with SSL on. If n8n rejects the pooler's certificate chain, paste Supabase's CA certificate (Project Settings → Database) into the credential rather than disabling verification. |
| OpenRouter account | OpenRouter | your API key |

Attach them: Postgres to every Postgres / Postgres Tool node, Header Auth to
each Webhook node, OpenRouter to each chat-model node.

Webhook CORS: each Webhook node has "Allowed Origins" under its options. Set it
to your deployed origin (for example `https://twerp.example.com`) rather than
`*` once you know it.

## How the guardrail works

The chat model has read-only tools plus three `propose_*` tools. A proposal is
a row in `pending_actions` with `status = 'pending'` and a 15-minute
`expires_at`. Confirming runs

```sql
update pending_actions set status = 'confirmed', confirmed_at = now()
where id = $1 and status = 'pending' and expires_at > now()
returning id, kind, payload
```

so a double click, a stale card, or a replayed request finds no row and does
nothing. Only after that claim succeeds does the matching insert / update /
soft-delete run.

## Working on the workflows

- Prompts and system messages go through the Agent node's template, where
  `{` and `}` are variables. Build prompt text in a Code node and strip braces
  (`ledger-chat` and `ledger-quickadd` already do this).
- When a Postgres node needs several query parameters, use one array
  expression, `={{ [ a, b, c ] }}`. A comma-separated string is split on
  commas inside the values.
- The chat workflow answers the webhook *before* it writes the assistant
  message and attaches proposals, so replies feel faster; a failure in those
  last nodes shows up in the n8n execution log, not in the app.
- Keep `workflows/*.json` in sync with the live instance. To push the repo
  copies to a running n8n (matched by workflow name, credentials carried over
  from the live copy), set `N8N_API_URL` and `N8N_API_KEY` in `.env.local` and
  run `node n8n/scripts/push-workflows.mjs`. The export must not contain
  credentials (the files here don't).

## Local n8n for offline work

`docker-compose.yml` runs n8n at `http://localhost:5678` on the same Docker
network as the local Supabase stack in `../supabase`, so its Postgres node can
reach `db:5432` by container name. Import the JSON, create the same
credentials against the local stack, and set `VITE_N8N_BASE_URL=http://localhost:5678`.
