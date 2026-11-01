#!/bin/sh
# Runs once, when the postgres-data volume is first created (the official image
# runs every *.sh in /docker-entrypoint-initdb.d). It creates the two roles the
# API uses and hands the `books` database to the owner role. The SQL lives in
# books-roles.psql, which the image itself ignores (unknown extension).
#
# Changing a password in deploy/.env later does NOT change it here; run
#   docker compose -f deploy/docker-compose.yml exec postgres psql -U postgres \
#     -c "ALTER ROLE books_app PASSWORD '<new>'"
set -eu

psql --set ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set owner_password="$BOOKS_OWNER_PASSWORD" \
  --set app_password="$BOOKS_APP_PASSWORD" \
  --set db_name="$POSTGRES_DB" \
  --file /docker-entrypoint-initdb.d/books-roles.psql
