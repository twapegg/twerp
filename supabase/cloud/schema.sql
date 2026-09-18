-- Ledger schema for a hosted Supabase project.
-- Concatenation of supabase/migrations/0001..0007, in order. Run once in the
-- Supabase SQL editor (or via psql) against a fresh project, then run
-- migrations/0008_owner_only_access.sql and add your login user to app_members.

-- ===== 0001_init_schema.sql =====
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

-- ===== 0002_chat_and_pending_actions.sql =====
-- Chat assistant: transcript + propose-then-confirm guardrail for writes/deletes.
-- See SPEC.md-adjacent plan: the AI agent only ever inserts into pending_actions;
-- a separate, human-confirmed workflow is the only path that mutates real tables.

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index on chat_messages (session_id, created_at);

create table pending_actions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  chat_message_id uuid references chat_messages(id) on delete set null,
  kind text not null check (kind in ('add_transaction', 'update_budget', 'delete_transaction')),
  payload jsonb not null,
  summary text not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled', 'expired', 'failed')),
  error text,
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  confirmed_at timestamptz
);

create index on pending_actions (session_id, status);
create index on pending_actions (chat_message_id);

create trigger trg_pending_actions_updated_at before update on pending_actions
  for each row execute function set_updated_at();

-- First delete capability the app has ever had - soft delete, recoverable.
alter table transactions add column deleted_at timestamptz;
create index on transactions (deleted_at);

alter table chat_messages enable row level security;
alter table pending_actions enable row level security;

create policy "authenticated full access" on chat_messages
  for all using (auth.role() = 'authenticated');
create policy "authenticated full access" on pending_actions
  for all using (auth.role() = 'authenticated');

grant all on chat_messages, pending_actions to anon, authenticated;

-- ===== 0003_income_and_category_kind.sql =====
-- Supports a "paycheck allocation" view merged into the Budgets page:
-- categories now carry a `kind` (expense vs savings) so budgeted amounts can
-- be grouped into fixed bills vs savings, and `income` holds the monthly
-- paycheck figure the allocation is measured against.

alter table categories add column kind text not null default 'expense'
  check (kind in ('expense', 'savings'));

create table income (
  id uuid primary key default gen_random_uuid(),
  monthly_amount numeric(12,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_income_updated_at before update on income
  for each row execute function set_updated_at();

alter table income enable row level security;

create policy "authenticated full access" on income
  for all using (auth.role() = 'authenticated');

grant all on income to anon, authenticated;

-- ===== 0004_account_kind_ewallet.sql =====
-- GCash and BPI VYBE are e-wallets, not bank accounts. Widen the account kind
-- check to include 'ewallet' and reclassify the two existing wallets.

alter table accounts drop constraint accounts_kind_check;
alter table accounts add constraint accounts_kind_check
  check (kind in ('checking', 'savings', 'credit', 'cash', 'ewallet'));

update accounts set kind = 'ewallet' where name in ('GCash', 'BPI');

-- ===== 0005_debts.sql =====
-- Debts section on the Budgets page: loans, credit card balances, "pay later"
-- plans. Each debt carries its remaining balance, what was originally
-- borrowed (for payoff progress), the fixed monthly payment (which counts
-- toward the paycheck allocation alongside fixed bills and savings), an
-- annual interest rate, and an optional due day.

create table debts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  balance numeric(12,2) not null check (balance >= 0),
  original_amount numeric(12,2) not null check (original_amount >= 0),
  monthly_payment numeric(12,2) not null check (monthly_payment >= 0),
  interest_rate numeric(6,2) not null default 0 check (interest_rate >= 0),
  due_day smallint check (due_day between 1 and 31),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_debts_updated_at before update on debts
  for each row execute function set_updated_at();

alter table debts enable row level security;

create policy "authenticated full access" on debts
  for all using (auth.role() = 'authenticated');

grant all on debts to anon, authenticated;

-- ===== 0006_goals.sql =====
-- Goals & wants: things being saved toward (an emergency fund, a trip) and
-- things wanted (a new laptop). Each carries a target, what has been set
-- aside so far, an optional monthly set-aside (which counts toward the
-- paycheck allocation alongside bills, savings and debts), an optional
-- target date, and an achieved timestamp once reached or bought.

create table goals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'goal' check (kind in ('goal', 'want')),
  target_amount numeric(12,2) not null check (target_amount > 0),
  saved_amount numeric(12,2) not null default 0 check (saved_amount >= 0),
  monthly_contribution numeric(12,2) not null default 0 check (monthly_contribution >= 0),
  target_date date,
  note text not null default '',
  achieved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_goals_updated_at before update on goals
  for each row execute function set_updated_at();

alter table goals enable row level security;

create policy "authenticated full access" on goals
  for all using (auth.role() = 'authenticated');

grant all on goals to anon, authenticated;

-- ===== 0007_goal_funding_source.sql =====
-- Where a goal's monthly set-aside comes from. When true, the money is part of
-- the Savings budget (so it must not be counted again in the paycheck
-- allocation); when false, it is an extra amount taken from the paycheck on
-- top of savings.
alter table goals add column funded_from_savings boolean not null default false;

