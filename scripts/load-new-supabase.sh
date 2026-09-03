#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# RentMaikar — one-command loader for the new dedicated Supabase project.
#
# Runs, in order:
#   1. SCHEMA      — applies every migration in supabase/migrations/
#   2. AUTH USERS  — loads an auth.users export (optional but strongly advised)
#   3. DATA        — runs load.sql from the operational-data zip
#
# Usage:
#   scripts/load-new-supabase.sh \
#       --db-url "postgresql://postgres:<PASSWORD>@db.<ref>.supabase.co:5432/postgres" \
#       --zip /path/to/rentmaikar-operational-data-YYYY-MM-DD.zip \
#       [--auth-users /path/to/auth_users.csv] \
#       [--skip-schema] [--skip-data] [--dry-run]
#
# Every step is logged to ./logs/load-new-supabase-<timestamp>.log
# ---------------------------------------------------------------------------
set -Eeuo pipefail

DB_URL=""
ZIP_PATH=""
AUTH_USERS_CSV=""
SKIP_SCHEMA=0
SKIP_DATA=0
DRY_RUN=0
MIGRATIONS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/supabase/migrations"
LOG_DIR="$(pwd)/logs"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --db-url) DB_URL="$2"; shift 2 ;;
    --zip) ZIP_PATH="$2"; shift 2 ;;
    --auth-users) AUTH_USERS_CSV="$2"; shift 2 ;;
    --migrations) MIGRATIONS_DIR="$2"; shift 2 ;;
    --skip-schema) SKIP_SCHEMA=1; shift ;;
    --skip-data) SKIP_DATA=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) sed -n '2,20p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/load-new-supabase-$STAMP.log"
exec > >(tee -a "$LOG_FILE") 2>&1

c_reset=$'\033[0m'; c_blue=$'\033[34m'; c_green=$'\033[32m'; c_yellow=$'\033[33m'; c_red=$'\033[31m'
log()   { echo "${c_blue}[$(date -u +%H:%M:%S)]${c_reset} $*"; }
ok()    { echo "${c_green}[ OK ]${c_reset} $*"; }
warn()  { echo "${c_yellow}[WARN]${c_reset} $*"; }
die()   { echo "${c_red}[FAIL]${c_reset} $*"; exit 1; }
step()  { echo; echo "${c_blue}=== $* ===${c_reset}"; }

trap 'die "aborted at line $LINENO — see $LOG_FILE"' ERR

[[ -n "$DB_URL" ]]   || die "--db-url is required (new Supabase project connection string)"
[[ -n "$ZIP_PATH" ]] || die "--zip is required (operational data archive)"
[[ -f "$ZIP_PATH" ]] || die "zip not found: $ZIP_PATH"
command -v psql  >/dev/null || die "psql not installed"
command -v unzip >/dev/null || die "unzip not installed"

PSQL=(psql "$DB_URL" -v ON_ERROR_STOP=1 --quiet)
run_psql() {
  if (( DRY_RUN )); then echo "(dry-run) psql $*"; else "${PSQL[@]}" "$@"; fi
}

step "0/4 Preflight"
log "Log file:        $LOG_FILE"
log "Migrations dir:  $MIGRATIONS_DIR"
log "Archive:         $ZIP_PATH"
log "Auth users CSV:  ${AUTH_USERS_CSV:-<none provided>}"
(( DRY_RUN )) && warn "DRY RUN — nothing will be written to the database"
TARGET_HOST="$(sed -E 's#.*@([^:/]+).*#\1#' <<<"$DB_URL")"
log "Target host:     $TARGET_HOST"
psql "$DB_URL" -tAc "select 'connected to ' || current_database() || ' as ' || current_user" \
  || die "cannot connect to the target database"
ok "Connection verified"

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT
unzip -q -o "$ZIP_PATH" -d "$WORK_DIR"
[[ -f "$WORK_DIR/load.sql" ]] || die "load.sql missing from the archive"
CSV_COUNT="$(find "$WORK_DIR/data" -name '*.csv' | wc -l | tr -d ' ')"
ok "Archive extracted — $CSV_COUNT table CSVs found"

step "1/4 Schema — applying migrations"
if (( SKIP_SCHEMA )); then
  warn "skipped (--skip-schema)"
else
  [[ -d "$MIGRATIONS_DIR" ]] || die "migrations directory not found: $MIGRATIONS_DIR"
  run_psql -c "CREATE SCHEMA IF NOT EXISTS supabase_migrations;
               CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
                 version text PRIMARY KEY, statements text[], name text);"
  APPLIED=0; SKIPPED=0
  while IFS= read -r file; do
    version="$(basename "$file" | cut -d_ -f1)"
    if [[ $DRY_RUN -eq 0 ]] && psql "$DB_URL" -tAc \
        "select 1 from supabase_migrations.schema_migrations where version='$version'" | grep -q 1; then
      SKIPPED=$((SKIPPED+1)); continue
    fi
    log "applying $(basename "$file")"
    run_psql -f "$file"
    run_psql -c "insert into supabase_migrations.schema_migrations(version,name)
                 values ('$version', '$(basename "$file")') on conflict (version) do nothing;"
    APPLIED=$((APPLIED+1))
  done < <(find "$MIGRATIONS_DIR" -maxdepth 1 -name '*.sql' | sort)
  ok "Migrations applied: $APPLIED, already present: $SKIPPED"
fi

step "2/4 Auth users"
if [[ -z "$AUTH_USERS_CSV" ]]; then
  warn "no --auth-users CSV supplied — every row referencing auth.users(id) will be a dangling reference."
  warn "Export it from the source project, e.g.:"
  warn "  psql \"<SOURCE_DB_URL>\" -c \"\\copy (select id,email,encrypted_password,email_confirmed_at,phone,phone_confirmed_at,raw_user_meta_data,raw_app_meta_data,created_at,updated_at from auth.users) to 'auth_users.csv' csv header\""
else
  [[ -f "$AUTH_USERS_CSV" ]] || die "auth users CSV not found: $AUTH_USERS_CSV"
  HEADER="$(head -1 "$AUTH_USERS_CSV")"
  log "columns: $HEADER"
  if (( DRY_RUN )); then
    echo "(dry-run) would load $(($(wc -l < "$AUTH_USERS_CSV") - 1)) auth users"
  else
    "${PSQL[@]}" <<SQL
\set ON_ERROR_STOP on
BEGIN;
CREATE TEMP TABLE _stage_auth_users (LIKE auth.users INCLUDING DEFAULTS) ON COMMIT DROP;
\copy _stage_auth_users ($HEADER) FROM '$AUTH_USERS_CSV' WITH (FORMAT csv, HEADER true)
UPDATE _stage_auth_users SET
  instance_id = COALESCE(instance_id, '00000000-0000-0000-0000-000000000000'::uuid),
  aud         = COALESCE(NULLIF(aud, ''), 'authenticated'),
  role        = COALESCE(NULLIF(role, ''), 'authenticated');
INSERT INTO auth.users SELECT * FROM _stage_auth_users ON CONFLICT (id) DO NOTHING;
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email),
       'email', now(), now(), now()
FROM auth.users u
WHERE u.email IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email');
COMMIT;
SQL
    COUNT="$(psql "$DB_URL" -tAc 'select count(*) from auth.users')"
    ok "auth.users now holds $COUNT rows"
  fi
fi

step "3/4 Operational data"
if (( SKIP_DATA )); then
  warn "skipped (--skip-data)"
elif (( DRY_RUN )); then
  echo "(dry-run) would run load.sql for $CSV_COUNT tables"
else
  ( cd "$WORK_DIR" && psql "$DB_URL" -v ON_ERROR_STOP=1 -f load.sql )
  ok "load.sql completed"
fi

step "4/4 Verification"
if (( DRY_RUN )); then
  warn "dry run — verification skipped"
else
  psql "$DB_URL" -c "
    select relname as table_name, n_live_tup as approx_rows
    from pg_stat_user_tables
    where schemaname='public' and n_live_tup > 0
    order by n_live_tup desc
    limit 25;"
  psql "$DB_URL" -tAc "select 'public tables: ' || count(*) from information_schema.tables where table_schema='public'"
  psql "$DB_URL" -tAc "select 'auth users: ' || count(*) from auth.users"
fi

echo
ok "Done. Full log: $LOG_FILE"
