# Deploying to the VPS (books.solforbs.com)

The VPS (4 CPU / 6 GB RAM) already runs other software, so this stack is designed to sit beside it:

- Everything runs in Docker. Only **one port** is opened, on **localhost only**: `127.0.0.1:8088`.
- PostgreSQL 17 is internal to the Docker network (never exposed), with a password, and keeps its data in the `postgres-data` volume.
- The API uses two database roles: `books_app` for every request (no superuser, no `BYPASSRLS`, owns nothing, cannot delete rows) and `books_owner`, which owns the tables and is used only at startup to apply migrations. Both are created on the first start by `deploy/postgres/initdb/`.
- Memory limits: PostgreSQL 1 GB, API 600 MB, web 128 MB.

## 1. First install

```bash
git clone https://github.com/solforbs/books.git && cd books
cp deploy/.env.example deploy/.env
# fill in all five values in deploy/.env, each one different:  openssl rand -hex 32
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
curl -s http://127.0.0.1:8088/api/v1/health
```

## 2. Point the subdomain at it

1. DNS: an `A` record for `books.solforbs.com` → the VPS IP.
2. In the web server already on the VPS, forward the subdomain to `http://127.0.0.1:8088` and enable HTTPS.

Example for **nginx** with certbot:

```nginx
server {
  server_name books.solforbs.com;
  location / {
    proxy_pass http://127.0.0.1:8088;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 15m;
  }
}
```

Then run `sudo certbot --nginx -d books.solforbs.com`, and add HSTS inside that server block once HTTPS works:
`add_header Strict-Transport-Security "max-age=31536000" always;`

The `X-Forwarded-For` line is required: the app's inner nginx uses it to find the real visitor IP, so login rate limits apply per visitor, not to everyone at once. If the VPS uses Caddy instead: `books.solforbs.com { reverse_proxy 127.0.0.1:8088 }`.

## 3. Updates

```bash
git pull && docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
```

## 4. Backups (set up before real shops use it)

Nightly dump (cron), kept for 14 days. **Copy the dumps off the VPS as well** (another server or cloud storage), **encrypted** (for example with `gpg --symmetric`). `pg_dump` takes a consistent snapshot while the app keeps running. The dumps contain password hashes, phone numbers and emails, so only root may read them:

```bash
umask 077 && mkdir -p /backups && chmod 700 /backups
docker compose -f deploy/docker-compose.yml exec -T postgres \
  pg_dump -U postgres -d books --format=custom > /backups/books-$(date +%F).dump
find /backups -name 'books-*.dump' -mtime +14 -delete
```

Restore (into an empty database, e.g. on a fresh volume after the first start):

```bash
docker compose -f deploy/docker-compose.yml stop api
docker compose -f deploy/docker-compose.yml exec -T postgres \
  pg_restore -U postgres -d books --clean --if-exists --no-owner --role=books_owner < /backups/books-YYYY-MM-DD.dump
docker compose -f deploy/docker-compose.yml start api
```

Test a restore now and then; a backup that was never restored is only a hope.

Changing a database password: update `deploy/.env`, then open a database prompt with
`docker compose -f deploy/docker-compose.yml exec postgres psql -U postgres`, type `\password books_app` (or `books_owner`) and enter the new value when asked, so it never lands in shell history. Then run `up -d` again.

## 5. Security notes

- Security headers and a strict Content-Security-Policy are added by the inner nginx (`deploy/nginx/security-headers.conf`) on every response.
- Networks: the web container can reach only the API, and only the API can reach PostgreSQL (the `data` network has no internet access).
- Database access is password-protected and least-privilege: requests run as `books_app`, which has no `DELETE` on any table, cannot change the schema and is subject to row-level security (each business's rows are only visible inside a transaction that set `app.tenant_id` to that business). The API refuses to start in production if `DATABASE_URL` points at a superuser, a `BYPASSRLS` role or a table owner.
