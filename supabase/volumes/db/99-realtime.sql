-- Vendored from supabase/supabase docker/volumes/db/realtime.sql (official self-host template).
-- Required by the realtime container (DB_AFTER_CONNECT_QUERY: 'SET search_path TO _realtime').
\set pguser `echo "$POSTGRES_USER"`

create schema if not exists _realtime;
alter schema _realtime owner to :pguser;
