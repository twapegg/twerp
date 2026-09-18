-- Vendored from supabase/supabase docker/volumes/db/roles.sql (official self-host template).
-- Runs as an init-script (before migrations) to sync service role passwords to POSTGRES_PASSWORD.
\set pgpass `echo "$POSTGRES_PASSWORD"`

ALTER USER authenticator WITH PASSWORD :'pgpass';
ALTER USER supabase_auth_admin WITH PASSWORD :'pgpass';
