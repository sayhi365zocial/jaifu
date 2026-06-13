import express from "express";
import { query } from "./db.js";

/* Jaifu (ใจฟู) shared stats — PUBLIC routes (no auth).
   The client pushes absolute lifetime aggregates for its anonymous id;
   the server never stores raw per-order rows. Because these routes are
   unauthenticated they validate hard and rate-limit per IP. */

const router = express.Router();

// Item names the client can report — anything else is dropped so junk
// requests can't poison the "top items" board. Must match the FOOD+SHOP
// catalogs in src/Jaifu.jsx.
const ITEM_NAMES = new Set([
  "ข้าวมันไก่", "กะเพราหมูกรอบ", "ชานมไข่มุก", "ส้มตำไก่ย่าง",
  "พิซซ่าหน้าฮาวายเอี้ยน", "ซูชิเซ็ต 12 คำ", "บิงซูชาเขียว", "หมาล่าทั่งกั้ว",
  "หูฟังไร้สาย", "รองเท้าผ้าใบ", "ต้นไม้ฟอกอากาศ", "เทียนหอมอโรม่า",
  "นาฬิกาสมาร์ตวอตช์", "กระเป๋าสะพายข้าง", "แว่นกันแดด", "หมอนอิงนุ่มฟู",
]);

// Fixed key sets for the small aggregate maps — must match the ids in
// src/Jaifu.jsx (DELIVERY_METHODS, MOODS, AFTER). Anything else is dropped.
const METHOD_IDS = new Set(["instant", "scheduled", "normal"]);
const MOOD_IDS = new Set(["stress", "bored", "sad", "tired"]);
const LIFT_IDS = new Set(["better", "same", "want"]);

const MAX_PRICE = 4070; // max item ฿3,990 + jumbo/topping add-ons
const MAX_COUNT = 200000;
const MAX_ORDERS = 200000;

// Tight body cap for these unauthenticated routes (a full payload is < 1KB).
const jaifuBody = express.json({ limit: "8kb" });

// Minimal in-memory per-IP rate limiter (per-instance, resets on restart).
// Relies on `trust proxy` being set so req.ip is the real client.
const hits = new Map();
function rateLimit(maxPerMinute) {
  return (req, res, next) => {
    const now = Date.now();
    if (hits.size > 5000) {
      for (const [k, arr] of hits) {
        const live = arr.filter((t) => now - t < 60000);
        if (live.length) hits.set(k, live); else hits.delete(k);
      }
    }
    const key = req.ip + ":" + maxPerMinute;
    const recent = (hits.get(key) || []).filter((t) => now - t < 60000);
    if (recent.length >= maxPerMinute) {
      return res.status(429).json({ error: "Too many requests" });
    }
    recent.push(now);
    hits.set(key, recent);
    next();
  };
}

function asCount(v, max) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(Math.floor(n), max);
}

function cleanCounts(obj, keyOk) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!keyOk(k)) continue;
    const n = asCount(v, MAX_COUNT);
    if (n === null || n === 0) continue;
    out[k] = n;
  }
  return out;
}

// SQL fragment: merge a jsonb count map per key by GREATEST(existing, incoming).
// Keys are the union of both sides (so a key present on only one side is kept);
// each value is the integer max. The result is order-independent and monotonic,
// which is what lets an equal-order_count push update its keys without rolling
// back any other. `col` is a trusted literal column name (never user input).
const mergeMax = (col) => `(
  SELECT COALESCE(jsonb_object_agg(k, to_jsonb(GREATEST(
           COALESCE((jaifu_stats.${col} ->> k)::numeric, 0),
           COALESCE((EXCLUDED.${col}  ->> k)::numeric, 0)
         )::bigint)), '{}'::jsonb)
  FROM (
    SELECT jsonb_object_keys(jaifu_stats.${col}) AS k
    UNION
    SELECT jsonb_object_keys(EXCLUDED.${col}) AS k
  ) ks
)`;

// PUT /api/jaifu/stats/:userId — upsert this client's absolute aggregates.
router.put("/stats/:userId", rateLimit(30), jaifuBody, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!/^u[a-z0-9]{6,40}$/.test(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    const orderCount = asCount(req.body && req.body.orderCount, MAX_ORDERS);
    const saved = asCount(
      req.body && req.body.saved,
      orderCount === null ? 0 : orderCount * MAX_PRICE
    );
    if (saved === null || orderCount === null) {
      return res.status(400).json({ error: "Invalid totals" });
    }
    const itemCounts = cleanCounts(req.body.itemCounts, (k) => ITEM_NAMES.has(k));
    const hourCounts = cleanCounts(req.body.hourCounts, (k) =>
      /^([0-9]|1[0-9]|2[0-3])$/.test(k)
    );
    const methodCounts = cleanCounts(req.body.methodCounts, (k) => METHOD_IDS.has(k));
    const moodCounts = cleanCounts(req.body.moodCounts, (k) => MOOD_IDS.has(k));
    const liftCounts = cleanCounts(req.body.liftCounts, (k) => LIFT_IDS.has(k));

    // GREATEST keeps totals monotonic. The jsonb maps are merged PER KEY by
    // GREATEST (not all-or-nothing) so a push at an equal order_count — e.g.
    // the after-mood lift push that follows an order push — raises its own
    // keys without clobbering the others, and no stale/out-of-order push can
    // ever lower a key. The client always sends absolute lifetime counts, so
    // per-key max is order-independent, idempotent, and self-healing. ::bigint
    // keeps stored values integer so the summary's integer filter never drops
    // a key. EXCLUDED is read via its column (not an SRF in FROM) for clarity.
    await query(
      `INSERT INTO jaifu_stats
         (user_id, saved, order_count, item_counts, hour_counts, method_counts, mood_counts, lift_counts, last_seen)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         saved = GREATEST(jaifu_stats.saved, EXCLUDED.saved),
         order_count = GREATEST(jaifu_stats.order_count, EXCLUDED.order_count),
         item_counts = ${mergeMax("item_counts")},
         hour_counts = ${mergeMax("hour_counts")},
         method_counts = ${mergeMax("method_counts")},
         mood_counts = ${mergeMax("mood_counts")},
         lift_counts = ${mergeMax("lift_counts")},
         last_seen = NOW()`,
      [userId, saved, orderCount,
       JSON.stringify(itemCounts), JSON.stringify(hourCounts),
       JSON.stringify(methodCounts), JSON.stringify(moodCounts), JSON.stringify(liftCounts)]
    );
    res.json({ ok: true });
  } catch (error) {
    console.error("jaifu stats upsert error:", error.message);
    res.status(500).json({ error: "Failed to save stats" });
  }
});

// GET /api/jaifu/stats/summary — aggregate across all users, in SQL, cached.
let summaryCache = { at: 0, data: null };

router.get("/stats/summary", rateLimit(60), async (req, res) => {
  try {
    if (summaryCache.data && Date.now() - summaryCache.at < 30000) {
      return res.json(summaryCache.data);
    }
    const totals = await query(
      `SELECT COUNT(*)::int AS users,
              COALESCE(SUM(order_count), 0)::bigint AS total_orders,
              COALESCE(SUM(saved), 0)::bigint AS saved_all
         FROM jaifu_stats`
    );
    const top = await query(
      `SELECT key AS name, SUM(value::numeric)::bigint AS n
         FROM jaifu_stats, jsonb_each_text(item_counts)
        WHERE value ~ '^[0-9]+$'
        GROUP BY key ORDER BY n DESC LIMIT 5`
    );
    const hourRows = await query(
      `SELECT key::int AS hour, SUM(value::numeric)::bigint AS n
         FROM jaifu_stats, jsonb_each_text(hour_counts)
        WHERE key ~ '^[0-9]+$' AND value ~ '^[0-9]+$'
        GROUP BY key`
    );
    // The three small fixed-key maps: SUM per key across all users.
    const sumMap = (col) =>
      query(
        `SELECT key, SUM(value::numeric)::bigint AS n
           FROM jaifu_stats, jsonb_each_text(${col})
          WHERE value ~ '^[0-9]+$'
          GROUP BY key`
      );
    const [methodRows, moodRows, liftRows] = await Promise.all([
      sumMap("method_counts"),
      sumMap("mood_counts"),
      sumMap("lift_counts"),
    ]);
    const hours = Array(24).fill(0);
    hourRows.rows.forEach((r) => {
      if (r.hour >= 0 && r.hour < 24) hours[r.hour] = Number(r.n);
    });
    // Zero-filled, fixed key order — a missing key shows 0, never undefined.
    const toMap = (rows, keys) => {
      const o = {};
      keys.forEach((k) => { o[k] = 0; });
      rows.forEach((r) => { if (r.key in o) o[r.key] = Number(r.n); });
      return o;
    };
    const t = totals.rows[0] || {};
    const data = {
      users: Number(t.users) || 0,
      totalOrders: Number(t.total_orders) || 0,
      savedAll: Number(t.saved_all) || 0,
      top: top.rows.map((r) => [r.name, Number(r.n)]),
      hours,
      methods: toMap(methodRows.rows, ["instant", "scheduled", "normal"]),
      moods: toMap(moodRows.rows, ["stress", "bored", "sad", "tired"]),
      lifts: toMap(liftRows.rows, ["better", "same", "want"]),
    };
    summaryCache = { at: Date.now(), data };
    res.json(data);
  } catch (error) {
    console.error("jaifu summary error:", error.message);
    res.status(500).json({ error: "Failed to load summary" });
  }
});

export default router;
