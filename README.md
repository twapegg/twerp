# Twerp

Personal budgeting app for one person: accounts, transactions, monthly budgets,
debts and savings goals, plus **Twerp**, a chat assistant that can answer
questions about your money and propose changes you confirm with one tap.

- **Frontend:** Vite + React + TypeScript + Tailwind, deployed as a static site.
- **Database + auth:** a [Supabase](https://supabase.com) project (Postgres,
  row-level security, email/password login).
- **Assistant:** three small [n8n](https://n8n.io) workflows that call a Claude
  model through OpenRouter. The chat can only *propose* writes; a second,
  human-confirmed workflow is the only thing that mutates data.

## Repo layout

| Path | What it is |
| --- | --- |
| `src/` | The app. `lib/dataSource.ts` is the seam between UI and backend; `lib/supabaseData.ts` implements it. |
| `supabase/migrations/` | Numbered SQL migrations. Apply them in order to any Supabase project. |
| `supabase/cloud/schema.sql` | Migrations 0001 to 0007 concatenated, for bootstrapping a fresh project in one go. Apply `0008` after. |
| `supabase/` (compose files) | An optional self-hosted Supabase stack for offline development. |
| `n8n/workflows/` | Importable workflow JSON for the assistant. `n8n/README.md` explains them. |
| `start-twerp*.bat` | Windows helpers to start the dev server (and, for `-local`, the Docker stack). |

## Run it locally

```bash
npm install
cp .env.local.example .env.local   # then fill in the values
npm run dev
```

The dev server listens on http://localhost:5173 and on your LAN address.
`npm run typecheck` runs the TypeScript compiler; `npm run build` writes a
production bundle to `dist/`.

## Setting up the backend

1. **Create a Supabase project.** In the SQL editor run
   `supabase/cloud/schema.sql`, then `supabase/migrations/0008_owner_only_access.sql`.
2. **Create your login user** under Authentication → Users ("Add user", with
   "auto confirm"). Then run the one-line insert from the header of
   `0008_owner_only_access.sql` so that user becomes a member. The app refuses
   every other account, even one that manages to sign up.
3. **Turn off self-signup**: Authentication → Sign In / Providers → Email →
   disable "Allow new users to sign up". The anon key ships in the browser
   bundle, so anyone can *try* to register; this stops them at the door.
4. **Allow the password-reset redirect**: Authentication → URL Configuration →
   add `https://<your-domain>/reset-password` (and the localhost variant for
   dev) to the redirect allow list, and set the Site URL to your domain.
5. **Import the n8n workflows** and create their credentials as described in
   `n8n/README.md`. Point `VITE_N8N_BASE_URL` at that instance.

## Deploying the frontend

`npm run build` produces a plain static site. Any static host works; the only
requirement is that unknown paths fall back to `index.html`, because routing is
client-side.

- **Vercel:** `vercel.json` already contains the rewrite and security headers.
- **Netlify / Cloudflare Pages:** `public/_redirects` and `public/_headers`
  are copied into `dist/` by the build.
- **Your own nginx / Caddy:** add a `try_files $uri /index.html` (nginx) or
  `try_files {path} /index.html` (Caddy) fallback.

Set the four `VITE_*` variables in the host's environment settings; they are
baked in at build time. Never put a service-role key or database password in
a `VITE_*` variable.

## Security model, in short

- Every table has row-level security. Policies allow access only to users
  listed in `app_members` (migration 0008); the `anon` role has no table grants.
- The browser talks to n8n with the user's Supabase session token in the
  `Authorization` header. Each workflow verifies that token against Supabase
  Auth before doing anything, so knowing the webhook URL (or the static
  `X-Ledger-Secret`, which is visible in the bundle) is not enough.
- The assistant model never writes to the database directly. It inserts rows
  into `pending_actions`; the confirm workflow claims a row atomically, checks
  it has not expired, and only then applies it.
- Secrets live in `.env.local` and `supabase/.env`, both git-ignored. The
  committed `.env.local.example` and `supabase/.env.example` hold placeholders.

## Original build spec

`SPEC.md` is the plan this was built from. Some details there (the local
Docker stack as the production target, the earlier visual style) have since
changed; this README describes the current state.
