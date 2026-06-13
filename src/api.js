/* Shared-stats API. The server stores anonymous aggregates only:
   totals + item-name counts + hour-bucket counts. The client pushes its
   absolute lifetime numbers so every push is idempotent and self-healing
   (a missed push is repaired by the next one). */

// Same-origin by default: the Jaifu server serves both the SPA and the API.
// VITE_API_BASE_URL only needs setting if the API is hosted elsewhere.
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(
  /\/+$/,
  ""
);

export async function pushStats(me) {
  const res = await fetch(
    `${API_BASE}/jaifu/stats/${encodeURIComponent(me.userId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        saved: me.totalSaved,
        orderCount: me.orderCount,
        itemCounts: me.itemCounts,
        hourCounts: me.hourCounts,
        methodCounts: me.methodCounts,
        moodCounts: me.moodCounts,
        liftCounts: me.liftCounts,
      }),
    }
  );
  if (!res.ok) throw new Error("pushStats failed: " + res.status);
}

export async function fetchSummary() {
  const res = await fetch(`${API_BASE}/jaifu/stats/summary`);
  if (!res.ok) throw new Error("fetchSummary failed: " + res.status);
  return res.json();
}
