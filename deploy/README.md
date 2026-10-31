# Deploying to the VPS (books.solforbs.com)

The VPS (4 CPU / 6 GB RAM) already runs other software, so this stack is designed to sit beside it:

- Everything runs in Docker. Only **one port** is opened, on **localhost only**: `127.0.0.1:8088`.
- MongoDB is internal to the Docker network (never exposed) and runs as a single-node replica set, because the app needs transactions.
- Memory limits: MongoDB 1.2 GB, API 600 MB, web 128 MB.

## 1. First install

```bash
git clone https://github.com/solforbs/books.git && cd books
cp deploy/.env.example deploy/.env
# put two different random secrets in deploy/.env:  openssl rand -base64 48
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

Nightly dump, kept for 14 days. **Copy the dumps off the VPS as well** (another server or cloud storage):

```bash
docker compose -f deploy/docker-compose.yml exec -T mongo mongodump --archive --gzip > /backups/books-$(date +%F).gz
find /backups -name 'books-*.gz' -mtime +14 -delete
```

## 5. Security notes

- Security headers and a strict Content-Security-Policy are added by the inner nginx (`deploy/nginx/security-headers.conf`) on every response.
- Networks: the web container can reach only the API, and only the API can reach MongoDB (the `data` network has no internet access).
- **Before real shop data:** enable MongoDB authentication (replica-set keyfile plus an app user with `readWrite` on `books` only). This is tracked as an open item from the S0 security review.
