# cv-compile-service

Tiny Node HTTP service that compiles LaTeX to PDF via Tectonic.
Runs on Fly.io (scale-to-zero). Called by the Next.js app's `/api/compile` route handler.

## Endpoints

- `POST /compile` — body: `.tex` source (max 256 KB), `Authorization: Bearer <COMPILE_SERVICE_SECRET>` → `application/pdf`
- `GET /health` → `200 ok`

## Deploy

```bash
# First deploy
fly launch --name cv-compile-service --region ams --no-deploy
fly secrets set COMPILE_SERVICE_SECRET=$(openssl rand -hex 32)
fly deploy

# Updates
fly deploy
```

After deploy, copy the service URL (e.g. `https://cv-compile-service.fly.dev`) and set:
- `COMPILE_SERVICE_URL` in Vercel env vars and `.env.local`
- `COMPILE_SERVICE_SECRET` on both Fly (`fly secrets set`) and Vercel

## Local test (Docker)

```bash
# Build
docker build -t cv-svc compile-service

# Run
docker run -e COMPILE_SERVICE_SECRET=test -p 8080:8080 cv-svc

# Smoke test (in another terminal)
COMPILE_SERVICE_SECRET=test node compile-service/smoke.mjs
```

## Notes

- Tectonic 0.16.9 binary is baked into the image. The warm-compile step during `docker build`
  pulls and caches the TeX bundle, so cold starts on Fly are ~2-3s rather than 30s+.
- `auto_stop_machines = "stop"` + `min_machines_running = 0` → scale-to-zero when idle.
- Shell-escape is disabled by default in Tectonic (no `--shell-escape` flag passed).
- 512 MB RAM is sufficient for typical CV compilation; bump to 1 GB if you add TikZ-heavy templates.
