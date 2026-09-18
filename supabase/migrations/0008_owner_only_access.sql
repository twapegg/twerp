-- Lock the data down to named users instead of "anyone who is signed in".
--
-- The original policies granted full access to any JWT with role
-- 'authenticated'. On a hosted Supabase project the anon key is public (it
-- ships in the JS bundle) and self-signup is enabled by default, so anyone
-- could have created an account and read every table. Turning signups off in
-- the dashboard is the first line of defence; this migration is the second:
-- only users listed in app_members get through the row-level policies.
--
-- Applying this on a project that already has its one login user seeds that
-- user automatically. To add another person later:
--   insert into app_members (user_id) select id from auth.users where email = 'them@example.com';

create table if not exists app_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);

alter table app_members enable row level security;
-- No policies on purpose: nothing reachable through PostgREST can read or edit
-- the member list. Only the database owner (SQL editor, migrations) can.
revoke all on app_members from anon, authenticated;

-- security definer so the policies can consult app_members even though the
-- caller has no privileges on it. Marked stable so Postgres evaluates it once
-- per statement rather than once per row.
create or replace function public.is_app_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
     and exists (select 1 from app_members m where m.user_id = auth.uid());
$$;

revoke all on function public.is_app_member() from public;
grant execute on function public.is_app_member() to anon, authenticated;

-- Seed: the account(s) that already exist become members. On a fresh project
-- with no users yet this inserts nothing; add the user, then run the insert
-- from the header comment.
insert into app_members (user_id)
select id from auth.users
on conflict do nothing;

-- Swap every table's policy from "any authenticated" to "listed member".
do $$
declare
  t text;
begin
  foreach t in array array[
    'accounts', 'categories', 'transactions', 'budgets',
    'chat_messages', 'pending_actions', 'income', 'debts', 'goals'
  ]
  loop
    execute format('drop policy if exists "authenticated full access" on %I', t);
    execute format(
      'create policy "members full access" on %I for all to authenticated using (public.is_app_member()) with check (public.is_app_member())',
      t
    );
  end loop;
end $$;

-- anon never had a legitimate use for table privileges; RLS was the only thing
-- stopping it. Remove the grants too so a policy mistake cannot expose data.
revoke all on accounts, categories, transactions, budgets,
           chat_messages, pending_actions, income, debts, goals
from anon;
