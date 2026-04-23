#!/bin/bash
# Post-restore cleanup + role wiring.
# Runs after 01-restore-backup.sh on first container startup.
#
# Role passwords come from env vars with dev-safe defaults (see docker-compose.yml).
# In production, set AUTHENTICATOR_PASSWORD and AUTH_ADMIN_PASSWORD via secrets.

set -eu

: "${AUTHENTICATOR_PASSWORD:?AUTHENTICATOR_PASSWORD must be set}"
: "${AUTH_ADMIN_PASSWORD:?AUTH_ADMIN_PASSWORD must be set}"

psql \
  --username="$POSTGRES_USER" \
  --dbname=postgres \
  --set=ON_ERROR_STOP=on \
  --set=AUTHENTICATOR_PASSWORD="$AUTHENTICATOR_PASSWORD" \
  --set=AUTH_ADMIN_PASSWORD="$AUTH_ADMIN_PASSWORD" \
  <<'EOSQL'
-- 1. Drop Supabase-cloud-only schemas that aren't needed for a self-hosted
--    plain-Postgres setup (we don't use realtime, storage, graphql, pgsodium,
--    vault, or the supabase_functions edge runtime).
DROP SCHEMA IF EXISTS pgsodium CASCADE;
DROP SCHEMA IF EXISTS pgsodium_masks CASCADE;
DROP SCHEMA IF EXISTS vault CASCADE;
DROP SCHEMA IF EXISTS graphql CASCADE;
DROP SCHEMA IF EXISTS graphql_public CASCADE;
DROP SCHEMA IF EXISTS realtime CASCADE;
DROP SCHEMA IF EXISTS storage CASCADE;
DROP SCHEMA IF EXISTS supabase_functions CASCADE;
DROP SCHEMA IF EXISTS supabase_migrations CASCADE;
DROP SCHEMA IF EXISTS _realtime CASCADE;
DROP SCHEMA IF EXISTS _analytics CASCADE;

-- 2. Set passwords for the roles that services connect as.
--    (The dump creates these roles but without working passwords for a
--    non-Supabase-cloud environment.) Values come via psql -v from env vars.
ALTER ROLE authenticator      WITH LOGIN PASSWORD :'AUTHENTICATOR_PASSWORD' NOINHERIT;
ALTER ROLE supabase_auth_admin WITH LOGIN PASSWORD :'AUTH_ADMIN_PASSWORD' CREATEROLE;
ALTER ROLE anon              WITH NOLOGIN NOINHERIT;
ALTER ROLE authenticated     WITH NOLOGIN NOINHERIT;
ALTER ROLE service_role      WITH NOLOGIN NOINHERIT BYPASSRLS;

-- 2a. Strip Supabase-cloud-only role configs that reference extensions/libraries
--     we don't have installed (safeupdate is a shared library used in Supabase
--     cloud; not present in the vanilla postgres:18-alpine image).
ALTER ROLE authenticator       RESET session_preload_libraries;
ALTER ROLE supabase_admin      RESET ALL;
ALTER ROLE supabase_storage_admin RESET ALL;

-- 3. PostgREST role hierarchy: authenticator switches into anon/authenticated/
--    service_role based on the JWT claim.
GRANT anon           TO authenticator;
GRANT authenticated  TO authenticator;
GRANT service_role   TO authenticator;

-- 4. Schema + table permissions for the API roles.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

-- 5. Auth schema: supabase_auth_admin owns it; authenticated users need
--    read access to their own row via RLS policies on public.profiles etc.
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT SELECT ON auth.users TO authenticated, service_role;

-- 6. Tell PostgREST to reload its schema cache.
NOTIFY pgrst, 'reload schema';
EOSQL
