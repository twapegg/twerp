# Database

The schema lives in `migrations/`, one numbered file per change. Every change
goes through a migration file, never a dashboard edit, so any Supabase project
can be rebuilt from this folder.

| File | Adds |
| --- | --- |
| `0001_init_schema.sql` | accounts, categories, transactions, budgets; `updated_at` triggers; RLS |
| `0002_chat_and_pending_actions.sql` | chat transcript, propose-then-confirm queue, soft delete on transactions |
| `0003_income_and_category_kind.sql` | monthly paycheck figure, expense vs savings categories |
| `0004_account_kind_ewallet.sql` | e-wallet account kind |
| `0005_debts.sql` | debts |
| `0006_goals.sql` | goals and wants |
| `0007_goal_funding_source.sql` | whether a goal's set-aside comes out of the Savings budget |
| `0008_owner_only_access.sql` | `app_members` allow-list; RLS policies restricted to members; `anon` grants removed |

`cloud/schema.sql` is 0001 to 0007 concatenated for bootstrapping a fresh
project in one paste. Run `0008` right after it, then add your user to
`app_members` (the insert is in that file's header comment).

## Applying a new migration to the hosted project

Either paste the file into the Supabase SQL editor, or connect with `psql` /
any Postgres client using the **session pooler** connection string
(`aws-0-<region>.pooler.supabase.com:5432`, user `postgres.<ref>`). The direct
`db.<ref>.supabase.co` host is IPv6-only and unreachable from many home
networks.

## Local self-hosted stack (optional)

`docker-compose.yml` runs Postgres + GoTrue (auth) + PostgREST + Realtime
behind Kong on `http://localhost:8000`, the same shape as a hosted project. It is
for offline development only.

1. `node scripts/generate-jwt-keys.mjs` and copy the output into a new `.env`
   (start from `.env.example`).
2. `docker compose up -d`. On first boot only, `0001_init_schema.sql` is
   applied automatically. Apply the rest by hand:

   ```bash
   for f in migrations/000{2,3,4,5,6,7,8}_*.sql; do
     docker compose exec -T db psql -U supabase_admin -v ON_ERROR_STOP=1 < "$f"
   done
   ```

   Use `supabase_admin`, not `postgres`; it owns the tables.
3. Create your login user (self-signup is disabled in this stack):

   ```bash
   curl -X POST http://localhost:8000/auth/v1/admin/users \
     -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"email":"you@example.com","password":"<strong password>","email_confirm":true}'
   ```

   then `insert into app_members (user_id) select id from auth.users;`.
4. Point `.env.local` at `http://localhost:8000` with the generated `ANON_KEY`.

`start-twerp-local.bat` at the repo root starts Docker Desktop, this stack and
the local n8n, then the dev server.
