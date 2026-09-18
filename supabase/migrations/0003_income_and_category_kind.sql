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
