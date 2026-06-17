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
    methodCounts: {}, // { instant, scheduled, normal } — delivery choice, pushed
    moodCounts: {}, // { stress, bored, sad, tired } — mood before ordering, pushed
    liftCounts: {}, // { better, same, want } — after-mood answer, pushed
    today: null, // toDateString() for the daily soft cap
    todayCount: 0,
    activeDelivery: null, // in-flight imaginary delivery (see Track screen), or null
    // -------- address book + saved cards (local-only, NEVER pushed to server) --------
    addresses: [],          // [{ uid, label, recipient, phone, line, subDistrict, district, province, postcode }]
    defaultAddressId: null, // uid marked default, or null
    savedCards: [],         // [{ uid, brand, last4, holder, label }] — never full PAN / CVV / expiry
    payMethodCounts: {},    // { cod, transfer, card, bless } — payment choice, pushed for the shared admin board
    provinceCounts: {},     // { "กรุงเทพมหานคร": 5, ... } — province of the ship-to address, pushed (anonymous)
    // -------- discount wallet (local-only, NEVER pushed) --------
    discountWallet: [],     // [{ codeId, collectedTs }] — references DISCOUNT_CODES[].id; reusable while valid
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
    methodCounts:
      me.methodCounts && typeof me.methodCounts === "object" ? me.methodCounts : {},
    moodCounts:
      me.moodCounts && typeof me.moodCounts === "object" ? me.moodCounts : {},
    liftCounts:
      me.liftCounts && typeof me.liftCounts === "object" ? me.liftCounts : {},
    // Drop malformed address/card rows (must carry a uid); invalidate a default
    // pointer whose address was deleted upstream. Idempotent.
    addresses: Array.isArray(me.addresses)
      ? me.addresses.filter((a) => a && typeof a === "object" && a.uid != null)
      : [],
    defaultAddressId:
      Array.isArray(me.addresses) &&
      me.addresses.some((a) => a && a.uid === me.defaultAddressId)
        ? me.defaultAddressId
        : null,
    savedCards: Array.isArray(me.savedCards)
      ? me.savedCards.filter((c) => c && typeof c === "object" && c.uid != null)
      : [],
    payMethodCounts:
      me.payMethodCounts && typeof me.payMethodCounts === "object" ? me.payMethodCounts : {},
    provinceCounts:
      me.provinceCounts && typeof me.provinceCounts === "object" ? me.provinceCounts : {},
    // Drop malformed wallet rows (need a string codeId + numeric collectedTs).
    discountWallet: Array.isArray(me.discountWallet)
      ? me.discountWallet.filter(
          (w) => w && typeof w === "object" &&
                 typeof w.codeId === "string" && typeof w.collectedTs === "number")
      : [],
    // A malformed activeDelivery must never crash the Track screen: only keep
    // it if it's an object carrying a numeric absolute ETA, else fall to null.
    activeDelivery:
      me.activeDelivery &&
      typeof me.activeDelivery === "object" &&
      typeof me.activeDelivery.eta === "number"
        ? me.activeDelivery
        : null,
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
