-- Ledger schema (see SPEC.md Phase 1)

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

alter table accounts enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;

create policy "authenticated full access" on accounts
  for all using (auth.role() = 'authenticated');
create policy "authenticated full access" on categories
  for all using (auth.role() = 'authenticated');
create policy "authenticated full access" on transactions
  for all using (auth.role() = 'authenticated');
create policy "authenticated full access" on budgets
  for all using (auth.role() = 'authenticated');

-- PostgREST connects as `authenticator` and switches into `anon`/`authenticated`
-- per request based on the JWT; grant table privileges to both so RLS (not a
-- missing GRANT) is what actually decides access.
grant usage on schema public to anon, authenticated;
grant all on accounts, categories, transactions, budgets to anon, authenticated;
