import pg from "pg";

// Jaifu owns its OWN Postgres — fully separate from any other project.
// Connection string comes from DATABASE_URL (Railway injects it when you
// attach a Postgres plugin to this service).
const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "disable" ? false : { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

export const query = (text, params) => pool.query(text, params);

// Create the one table we need on boot if it isn't there. A single-table
// app doesn't warrant a migration runner; CREATE TABLE IF NOT EXISTS is
// idempotent and safe to run every start.
export async function ensureSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS jaifu_stats (
      user_id      VARCHAR(64) PRIMARY KEY,
      saved        BIGINT  NOT NULL DEFAULT 0,
      order_count  INTEGER NOT NULL DEFAULT 0,
      item_counts  JSONB   NOT NULL DEFAULT '{}'::jsonb,
      hour_counts  JSONB   NOT NULL DEFAULT '{}'::jsonb,
      first_seen   TIMESTAMP DEFAULT NOW(),
      last_seen    TIMESTAMP DEFAULT NOW()
    )
  `);
}
