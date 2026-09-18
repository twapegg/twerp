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
