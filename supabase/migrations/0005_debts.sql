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
