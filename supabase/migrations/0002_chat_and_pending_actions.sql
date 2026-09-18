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
