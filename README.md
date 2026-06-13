# ใจฟู (Jaifu) — "ฟินได้ ไม่ต้องจ่าย"

A placebo ordering app: it reproduces the full dopamine loop of food
delivery / online shopping, but the would-be spend lands in a virtual
savings jar instead. Mood check-ins bookend each order so it works as a
wellbeing tool, not a new habit loop.

Standalone Vite + React app, deployed as its own Railway service.
Personal data stays in the browser (localStorage); the server only ever
receives anonymous aggregates for the "everyone's stats" screen.

## Local dev

macOS AirPlay Receiver squats on :5000/:7000, so local dev runs the
backend on :5050 and this app on :5180 (vite proxies `/api` → `:5050`).

```bash
# 1) one-time: create the stats table
cd ../backend && npm run migrate           # runs migrations/090_jaifu_stats.sql

# 2) backend on :5050, allowing the dev frontend origin
cd ../backend && PORT=5050 CORS_ORIGIN=http://localhost:5180 node src/index.js

# 3) this app — vite proxies /api -> 127.0.0.1:5050
npm install
npm run dev                                 # http://localhost:5180
# (override the proxy target with VITE_DEV_API_TARGET if backend is elsewhere)
```

## Deploy (Railway)

Create a **new service** in the existing Railway project pointing at this
repo with **root directory `jaifu/`** — same pattern as the `backend/`
service. The Dockerfile pins Node 20 and serves `dist/` via `server.js`.

Service variables (baked in at build time by Vite):

| Variable | Example | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | `https://<backend>.up.railway.app/api` | required in prod |
| `VITE_FEEDBACK_URL` | LINE OA / Google Form URL | optional; defaults to mailto |

On the **backend service**, two one-time changes:

1. Run the migration: `npm run migrate` (adds `jaifu_stats`).
2. Append the new frontend's domain to `CORS_ORIGIN` — it now accepts a
   comma-separated list, e.g.
   `https://kanda.up.railway.app,https://jaifu.up.railway.app`

## API contract

- `PUT /api/jaifu/stats/:userId` — client pushes its absolute lifetime
  aggregates `{ saved, orderCount, itemCounts, hourCounts }`. Idempotent;
  totals never shrink (`GREATEST` upsert). Item names are allowlisted
  server-side; rate-limited per IP.
- `GET /api/jaifu/stats/summary` — `{ users, totalOrders, savedAll,
  top: [[name, n]], hours: [24] }`, aggregated in SQL, cached 30s.

## Privacy

The shared store holds **no per-order rows, timestamps, or prices** —
only per-user lifetime counters (item-name counts, hour-of-day counts,
totals) under a random anonymous id minted in the browser. Clearing
browser storage resets the identity.
