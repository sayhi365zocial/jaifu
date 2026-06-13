# ใจฟู (Jaifu) — "ฟินได้ ไม่ต้องจ่าย"

A placebo ordering app: it reproduces the full dopamine loop of food
delivery / online shopping, but the would-be spend lands in a virtual
savings jar instead. Mood check-ins bookend each order so it works as a
wellbeing tool, not a new habit loop.

Self-contained Vite + React app with a tiny Express + Postgres backend —
one deployable service, its own database. Personal data stays in the
browser (localStorage); the server only ever receives anonymous
aggregates for the "everyone's stats" screen.

## Layout

```
src/            React app (Jaifu.jsx, storage.js localStorage adapter, api.js)
server/         Express API (jaifu-api.js) + pg pool (db.js, auto-creates the table)
server.js       prod entry: serves dist/ + mounts /api/jaifu
vite.config.js  dev: mounts the same API in-process (needs DATABASE_URL)
```

## Local dev

```bash
npm install
# put your Postgres URL in .env.local (gitignored):  DATABASE_URL=postgres://...
set -a; . ./.env.local; set +a   # load it into the shell (Node doesn't read .env.local)
npm run dev                      # http://localhost:5180  (API runs in-process)
```

The `jaifu_stats` table is created automatically on first boot — no
migration step.

## Deploy (Railway)

This repo is one service: build with the Dockerfile, run `node server.js`.

1. New service from this repo (Dockerfile builder; `railway.json` sets the
   start command).
2. **Attach a Postgres plugin** to the service — Railway injects
   `DATABASE_URL` automatically, which is all the backend needs.
3. Done. The app and its API are same-origin, so no CORS or
   `VITE_API_BASE_URL` config is required.

Optional build args / env:

| Variable | Purpose |
|---|---|
| `VITE_FEEDBACK_URL` | "ติชม" target (LINE OA / form). Defaults to a mailto. |
| `VITE_API_BASE_URL` | Only if the API is hosted on a different origin. |
| `PGSSL=disable` | For a local non-SSL Postgres. |

## API

- `PUT /api/jaifu/stats/:userId` — client pushes its absolute lifetime
  aggregates `{ saved, orderCount, itemCounts, hourCounts }`. Idempotent;
  totals never shrink (`GREATEST` upsert), jsonb maps gated on the same
  monotonic order count. Item names allowlisted, plausibility-capped,
  8 KB body limit, per-IP rate limited.
- `GET /api/jaifu/stats/summary` — `{ users, totalOrders, savedAll,
  top: [[name, n]], hours: [24] }`, aggregated in SQL, cached 30s.

## Privacy

The database holds **no per-order rows, timestamps, or prices** — only
per-user lifetime counters (item-name counts, hour-of-day counts, totals)
under a random anonymous id minted in the browser. Clearing browser
storage resets the identity.
