/* Local persistence for the per-user record ("me").
   localStorage is synchronous and shared across tabs of the same browser,
   so every mutation goes read → merge → write against the freshest stored
   copy (see freshest()) instead of trusting in-memory React state. */

const KEY = "jaifu:me";

export function mintUserId() {
  return (
    "u" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
  );
}

export function defaultMe() {
  return {
    v: 1,
    userId: mintUserId(),
    totalSaved: 0,
    orderCount: 0,
    history: [], // last 100 of { idx, saved, moodBefore, moodAfter, lift, ts }
    streak: 0, // consecutive days with a completed check-in order
    lastDate: null, // toDateString() of the last completed order
    itemCounts: {}, // { "ข้าวมันไก่": 3, ... } — lifetime, pushed to shared stats
    hourCounts: {}, // { "13": 2, ... } — one tick per checkout
    today: null, // toDateString() for the daily soft cap
    todayCount: 0,
  };
}

function normalize(me) {
  const d = defaultMe();
  return {
    ...d,
    ...me,
    totalSaved: Number(me.totalSaved) || 0,
    orderCount: Number(me.orderCount) || 0,
    streak: Number(me.streak) || 0,
    todayCount: Number(me.todayCount) || 0,
    history: Array.isArray(me.history) ? me.history.slice(-100) : [],
    itemCounts:
      me.itemCounts && typeof me.itemCounts === "object" ? me.itemCounts : {},
    hourCounts:
      me.hourCounts && typeof me.hourCounts === "object" ? me.hourCounts : {},
  };
}

/* Distinguishes "no record yet" from "storage broken" from "record corrupt".
   A corrupt record is backed up before being replaced — an existing jar must
   never be silently zeroed by a transient failure. */
export function loadMe() {
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch (e) {
    return { status: "unavailable", me: null };
  }
  if (raw === null) return { status: "new", me: null };
  try {
    const me = JSON.parse(raw);
    if (!me || typeof me !== "object" || !me.userId) throw new Error("shape");
    return { status: "ok", me: normalize(me) };
  } catch (e) {
    try {
      localStorage.setItem(KEY + ".corrupt", raw);
    } catch (e2) {
      /* best effort */
    }
    return { status: "corrupt", me: null };
  }
}

export function saveMe(me) {
  try {
    localStorage.setItem(KEY, JSON.stringify(me));
    return true;
  } catch (e) {
    return false;
  }
}

/* First-load initializer: only creates a fresh record when there truly is
   none (or the old one was corrupt and has been backed up). When storage
   itself is unavailable the app runs in-memory without writing. */
export function initMe() {
  const r = loadMe();
  if (r.status === "ok") return r.me;
  const fresh = defaultMe();
  if (r.status !== "unavailable") saveMe(fresh);
  return fresh;
}

/* The freshest view of the record for read-merge-write mutations.
   Falls back to the caller's in-memory copy when storage is unreadable. */
export function freshest(fallback) {
  const r = loadMe();
  return r.status === "ok" ? r.me : fallback;
}
