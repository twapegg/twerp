# Twerp — personal budgeting app: build spec

> Historical document: this is the plan the app was built from. The current
> setup (hosted Supabase project, hosted n8n, member-only RLS, Liquid Glass
> UI) is described in `README.md`, `supabase/README.md` and `n8n/README.md`.

## Context

Personal, single-user budgeting app. Not published, not multi-tenant — built
for one person's own finances, running on their own infrastructure. No app
store distribution; accessed as a web app from a phone and a laptop.

**Existing infrastructure:** the owner already runs an n8n instance on a VPS,
reverse-proxied through Caddy, on a subdomain of `awesomate.ai`
(e.g. `barrebody.awesomate.ai` for another project). This app should follow
the same pattern on a new subdomain: `budget.awesomate.ai`.

## Current state (starting point)

A working Vite + React + TypeScript frontend already exists with:

- Three routed pages: Dashboard, Transactions, Budgets
- A `DataSource` interface (`src/lib/dataSource.ts`) with methods:
  `getAccounts`, `getCategories`, `getTransactions`, `getBudgets`,
  `addTransaction`, `updateBudgetLimit`
- A mock, in-memory implementation of that interface (`src/lib/mockData.ts`)
  wired up via `src/lib/data.ts`
- Tailwind CSS with a custom "ledger" visual style (Fraunces display font,
  IBM Plex Sans/Mono, paper/pine/rust color tokens — see
  `tailwind.config.js`)
- Types in `src/lib/types.ts`: `Account`, `Category`, `Transaction`, `Budget`

**This structure should be preserved.** The `DataSource` interface is the
seam between frontend and backend — new work plugs into it rather than
rewriting the UI layer.

## Goal of this build

Replace the mock data source with a real, self-hosted backend, add
authentication, deploy it publicly on the owner's existing VPS, and layer in
recurring-transaction automation via the existing n8n instance.

## Tech stack (target end state)

- **Frontend:** Vite + React + TypeScript + Tailwind (existing, keep as is)
- **Backend:** Self-hosted Supabase (Postgres + GoTrue auth + PostgREST +
  Realtime), deployed via Docker Compose on the existing VPS
- **Reverse proxy:** Caddy (matching the existing n8n setup), automatic HTTPS
- **Automation:** n8n (existing instance) for scheduled/recurring logic
- **Client library:** `@supabase/supabase-js` for auth, queries, and Realtime
  subscriptions

## Phase 1 — Postgres schema + self-hosted Supabase

Deploy self-hosted Supabase via Docker Compose on the VPS. Create the
following schema (single-user, so no row-level multi-tenancy needed, but
enable RLS anyway scoped to `auth.uid()` for defense in depth):

```sql
create table accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('checking', 'savings', 'credit', 'cash')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null check (color in ('pine', 'rust', 'muted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete restrict,
  category_id uuid not null references categories(id) on delete restrict,
  amount numeric(12,2) not null,
  note text not null default '',
  occurred_at date not null,
  is_recurring boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table budgets (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  limit_amount numeric(12,2) not null,
  period text not null default 'monthly' check (period in ('monthly')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on transactions (occurred_at desc);
create index on transactions (category_id);
```

Add a trigger to auto-update `updated_at` on every row update (needed later
for last-write-wins sync logic):

```sql
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_accounts_updated_at before update on accounts
  for each row execute function set_updated_at();
create trigger trg_categories_updated_at before update on categories
  for each row execute function set_updated_at();
create trigger trg_transactions_updated_at before update on transactions
  for each row execute function set_updated_at();
create trigger trg_budgets_updated_at before update on budgets
  for each row execute function set_updated_at();
```

Enable RLS on all four tables, with policies scoped to authenticated users
only (single user, so "authenticated" is a sufficient check — no per-row
ownership column needed):

```sql
alter table accounts enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;

create policy "authenticated full access" on accounts
  for all using (auth.role() = 'authenticated');
-- repeat identical policy for categories, transactions, budgets
```

**Acceptance criteria:**
- Supabase stack runs via `docker compose up` on the VPS
- Schema above is applied via a migration file, not applied by hand
- Can query all four tables via the PostgREST endpoint with a valid JWT

## Phase 2 — Supabase-backed DataSource + auth

- Create `src/lib/supabaseData.ts` implementing the existing `DataSource`
  interface (same method signatures as `mockData.ts`), backed by
  `@supabase/supabase-js` queries against the schema above
- Update `src/lib/data.ts` to import `supabaseData` instead of `mockData` —
  this should be the *only* change needed outside the new file
- Add a minimal login screen (email + password via Supabase Auth — this is a
  single-user app, so no signup flow, no password reset UI needed; the one
  user account is created directly in Supabase)
- Gate the existing routes behind an authenticated session check

**Acceptance criteria:**
- App is unusable without logging in
- All existing UI functionality (view transactions, add transaction, edit
  budget limit) works identically against real Postgres data instead of
  mock data
- Refreshing the page preserves the session (no re-login needed every visit)

## Phase 3 — Deploy publicly

- Build the frontend (`npm run build`) and serve the static output via Caddy
  on `budget.awesomate.ai`, following the existing pattern used for the n8n
  subdomain
- Add a `try_files {path} /index.html` fallback in the Caddy config since
  this is a client-side-routed SPA
- Point the Supabase instance's PostgREST endpoint at a subpath or separate
  subdomain (e.g. `budget-api.awesomate.ai`) also fronted by Caddy with
  HTTPS
- Since this exposes real financial data to the public internet, add one of:
  Cloudflare Access in front of the subdomain, an IP allowlist, or HTTP
  basic auth at the Caddy layer as a second gate in front of the app-level
  login

**Acceptance criteria:**
- App loads over HTTPS at `budget.awesomate.ai` from an external network
- Direct navigation to `/transactions` (not just `/`) works on reload
- Unauthenticated requests to the API are rejected

## Phase 4 — n8n recurring transactions

Using the existing n8n instance:

- A scheduled workflow (daily cron trigger) that inserts recurring
  transactions (rent, subscriptions) into the `transactions` table when
  their due date arrives, using n8n's Postgres node against the Supabase
  database directly
- A monthly workflow that resets/rolls over budget tracking at the start of
  each period (exact behavior — reset vs. carry-over of unspent amounts — is
  a decision to confirm with the app owner before building)
- Optional: a notification workflow (Telegram or email) that fires when a
  category's spend crosses its budget limit

**Acceptance criteria:**
- A test recurring transaction appears in the app the day it's scheduled,
  without manual intervention
- Workflow failures are visible in n8n's execution log (no silent failures)

## Explicit non-goals for this build

- No multi-user support, no signup flow, no password reset UI
- No native mobile app — web app only
- No offline/PWA support yet (deferred to a later phase, once the backend is
  stable — will use IndexedDB + a sync queue against `updated_at` timestamps
  when it happens)
- No payment/bank-account integration (Plaid, etc.) — all entry is manual

## Conventions to preserve

- Keep the `DataSource` interface as the frontend/backend seam — don't let
  Supabase-specific code leak into components or pages
- Keep the existing visual system (Tailwind tokens in `tailwind.config.js`,
  Fraunces/Plex fonts) — this spec is about backend/infra, not a redesign
- SQL schema changes go through migration files, not ad hoc changes via the
  Supabase dashboard, so the schema stays reproducible