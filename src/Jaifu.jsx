import React, { useEffect, useRef, useState } from "react";
import {
  Heart, ShoppingBag, Utensils, Plus, X, ChevronLeft,
  Check, PiggyBank, Home, Sparkles, TrendingUp, Flame, Bike,
  Package, ChefHat, RotateCcw, MessageCircle, Wind,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, ResponsiveContainer, Tooltip,
} from "recharts";
import { initMe, saveMe, freshest } from "./storage";
import { pushStats, fetchSummary } from "./api";

/* ============================================================
   ใจฟู (Jaifu) — "ฟินได้ ไม่ต้องจ่าย"
   A placebo ordering app: the full dopamine loop of food delivery /
   online shopping (hunt → choose → commit → wait → relief), but the
   would-be spend lands in a virtual jar instead, bookended by mood
   check-ins so it works as a wellbeing tool, not a new habit loop.

   Screen state machine:
   mood → feed → detail → cart → (breathe) → ordering → reveal → stats
   ============================================================ */

const FOOD = [
  { id: "f1", emoji: "🍗", name: "ข้าวมันไก่", price: 55, shop: "เจ๊ไก่ตอน" },
  { id: "f2", emoji: "🌶️", name: "กะเพราหมูกรอบ", price: 60, shop: "ครัวลุงหนวด" },
  { id: "f3", emoji: "🧋", name: "ชานมไข่มุก", price: 45, shop: "ชาตรามือ" },
  { id: "f4", emoji: "🍗", name: "ส้มตำไก่ย่าง", price: 80, shop: "ตำแซ่บนัว" },
  { id: "f5", emoji: "🍕", name: "พิซซ่าหน้าฮาวายเอี้ยน", price: 299, shop: "Pizza Pa" },
  { id: "f6", emoji: "🍣", name: "ซูชิเซ็ต 12 คำ", price: 350, shop: "ซูชิเฮีย" },
  { id: "f7", emoji: "🍧", name: "บิงซูชาเขียว", price: 159, shop: "หวานเย็นใจ" },
  { id: "f8", emoji: "🥘", name: "หมาล่าทั่งกั้ว", price: 199, shop: "เผ็ดสะใจ" },
];

const SHOP = [
  { id: "s1", emoji: "🎧", name: "หูฟังไร้สาย", price: 1290, shop: "Gadget Hub" },
  { id: "s2", emoji: "👟", name: "รองเท้าผ้าใบ", price: 2490, shop: "Sneaker Lab" },
  { id: "s3", emoji: "🪴", name: "ต้นไม้ฟอกอากาศ", price: 450, shop: "บ้านสวนสีเขียว" },
  { id: "s4", emoji: "🕯️", name: "เทียนหอมอโรม่า", price: 320, shop: "Calm Corner" },
  { id: "s5", emoji: "⌚", name: "นาฬิกาสมาร์ตวอตช์", price: 3990, shop: "Gadget Hub" },
  { id: "s6", emoji: "👜", name: "กระเป๋าสะพายข้าง", price: 1890, shop: "Bag Story" },
  { id: "s7", emoji: "🕶️", name: "แว่นกันแดด", price: 890, shop: "Sun & Co" },
  { id: "s8", emoji: "🛋️", name: "หมอนอิงนุ่มฟู", price: 590, shop: "Cozy Home" },
];

// Customization options — each tap is a micro-dopamine "choice" event.
const FOOD_CUSTOM = [
  { key: "size", label: "ขนาด", choices: [
    { id: "reg", label: "ธรรมดา", add: 0 },
    { id: "big", label: "พิเศษ", add: 20 },
    { id: "jumbo", label: "จัมโบ้", add: 40 },
  ]},
  { key: "topping", label: "เพิ่มท็อปปิ้ง", multi: true, choices: [
    { id: "egg", label: "ไข่ดาว", add: 10 },
    { id: "cheese", label: "ชีสเยิ้ม", add: 25 },
    { id: "meat", label: "เพิ่มเนื้อ", add: 40 },
  ]},
  { key: "spice", label: "ระดับความเผ็ด", choices: [
    { id: "n", label: "ไม่เผ็ด", add: 0 },
    { id: "m", label: "เผ็ดกลาง", add: 0 },
    { id: "h", label: "เผ็ดมาก", add: 0 },
  ]},
];

const SHOP_CUSTOM = [
  { key: "color", label: "สี", choices: [
    { id: "c1", label: "ดำ", add: 0 },
    { id: "c2", label: "ครีม", add: 0 },
    { id: "c3", label: "เขียวเซจ", add: 0 },
  ]},
  { key: "size", label: "ไซซ์", choices: [
    { id: "s", label: "S", add: 0 },
    { id: "m", label: "M", add: 0 },
    { id: "l", label: "L", add: 0 },
  ]},
];

const MOODS = [
  { id: "stress", emoji: "😣", label: "เครียด" },
  { id: "bored", emoji: "😐", label: "เบื่อ" },
  { id: "sad", emoji: "😢", label: "เศร้า" },
  { id: "tired", emoji: "😩", label: "เหนื่อย" },
];

const AFTER = [
  { id: "better", emoji: "😌", label: "โล่งขึ้น", lift: 1 },
  { id: "same", emoji: "😐", label: "เหมือนเดิม", lift: 0 },
  { id: "want", emoji: "😕", label: "ยังอยากซื้อจริง", lift: -1 },
];

const baht = (n) => "฿" + n.toLocaleString("th-TH");
const dayKey = (d) => d.toDateString();

const ORDER_STEPS_FOOD = [
  { icon: Check, label: "ยืนยันออเดอร์แล้ว" },
  { icon: ChefHat, label: "ร้านกำลังเตรียม" },
  { icon: Package, label: "ไรเดอร์รับของแล้ว" },
  { icon: Bike, label: "กำลังมาส่ง" },
];
const ORDER_STEPS_SHOP = [
  { icon: Check, label: "ยืนยันคำสั่งซื้อ" },
  { icon: Package, label: "ร้านกำลังแพ็ก" },
  { icon: Bike, label: "ส่งเข้าระบบขนส่ง" },
  { icon: Bike, label: "พัสดุกำลังมา" },
];

// Soft daily cap: past this, a gentle interstitial asks the user to pause.
const DAILY_CAP = 5;

/* -------- delivery options (chosen on the cart screen) --------
   The shipping fee folds into the jar like everything else — it's part of
   "ยอดที่ใจอยากจ่าย", not a real charge. */
const SHIPPING = { instant: 50, scheduled: 0, normal: 30 };
const DELIVERY_METHODS = [
  { id: "instant", label: "ส่งทันที", emoji: "⚡", note: "ส่งไวที่สุด — ไรเดอร์ซิ่งมาเลย" },
  { id: "scheduled", label: "สั่งล่วงหน้า", emoji: "🗓️", note: "เลือกเวลาเองได้ · ส่งฟรี" },
  { id: "normal", label: "ส่งปกติ", emoji: "🛵", note: "มาตามคิว สบายๆ ใจเย็นๆ" },
];

// Live status lines shown on the Track screen as the wait progresses.
const FOOD_TRACK_LINES = [
  "ไรเดอร์รับของจากร้านเรียบร้อย 🛵",
  "กำลังซิ่งมาหาคุณอยู่นะ ใจเย็นๆ",
  "อีกนิดเดียว ของ(ในจินตนาการ) ใกล้ถึงแล้ว",
  "เลี้ยวเข้าซอยแล้ว เตรียมเปิดใจรับได้เลย ✨",
];
const SHOP_TRACK_LINES = [
  "ร้านยืนยันคำสั่งซื้อแล้ว 📦",
  "กำลังแพ็กอย่างทะนุถนอม 🎁",
  "เข้าระบบขนส่งแล้ว กำลังมาส่ง 🚚",
  "พัสดุใกล้ถึงมือคุณแล้ว ✨",
];

// Funny/มโน reasons for why the "normal" delivery takes a few minutes. Picked
// once at commit and frozen into activeDelivery.reason so it stays stable
// across reloads. Light and kind — never mean.
const FUNNY_REASONS = [
  "ไรเดอร์แวะเติมลมยางก่อนออกตัว 🛵",
  "ฝนตกปรอยๆ เลยขอวิ่งช้าลงนิด เซฟทั้งของเซฟทั้งคน",
  "ติดไฟแดงยาวมาก นับไปแล้ว 47 วินาที",
  "ร้านทอดไข่ดาวให้ใหม่ ขอเวลาให้กรอบกำลังดี 🍳",
  "ไรเดอร์หลงเข้าซอยตันนิดนึง กำลังถอยรถออกมา",
  "แวะซื้อน้ำให้ตัวเองก่อน วันนี้อากาศร้อนจริงๆ",
  "ป้าข้างทางทักว่าหล่อ เลยเสียเวลายิ้มไปหน่อย 😄",
  "GPS พาอ้อมโลกนิดหน่อย แต่ใจมุ่งตรงมาหาคุณ",
  "รอลิฟต์คอนโดอยู่ ลิฟต์มาช้ากว่าไรเดอร์อีก",
  "หมาแถวบ้านออกมาต้อนรับ ขอเล่นด้วยแป๊บนึง 🐶",
  "ไรเดอร์แวะกราบไหว้ศาลขอให้ส่งทันใจคุณ 🙏",
  "ถุงจะขาด เลยขอผูกปมให้แน่นอีกรอบ",
  "เจอเพื่อนไรเดอร์ทักทาย คุยกันสองคำตามมารยาท",
  "มอเตอร์ไซค์ดับกลางทางนิดนึง กำลังสตาร์ทใหม่ ใจสู้อยู่",
];
const INSTANT_REASON = "ไรเดอร์ซิ่งมาเต็มสปีด ทันใจสุดๆ 🛵💨";
const SCHED_REASON = "จดเวลาไว้ในปฏิทินของจักรวาลแล้ว รอเจอกันตามนัด 🗓️";

// Generate scheduled delivery slots: round the current time UP to the next
// :00/:30 boundary, then 8 slots at 30-min steps. Each carries an absolute
// epoch-ms ts (so the countdown survives reload) and a Thai label; a slot that
// lands on a different calendar day is prefixed "พรุ่งนี้".
function makeSlots(fromMs) {
  const start = new Date(fromMs);
  start.setSeconds(0, 0);
  const m = start.getMinutes();
  // next clean half-hour, with a little lead so the earliest slot isn't "now"
  start.setMinutes(m < 30 ? 30 : 60);
  const today = new Date(fromMs).toDateString();
  const slots = [];
  for (let i = 0; i < 8; i++) {
    const d = new Date(start.getTime() + i * 30 * 60000);
    const time = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
    const nextDay = d.toDateString() !== today;
    slots.push({ ts: d.getTime(), label: (nextDay ? "พรุ่งนี้ " : "") + time + " น." });
  }
  return slots;
}

// Format an absolute-ETA remaining time. mm:ss for short waits; H:MM:SS once an
// hour or more remains (scheduled deliveries can be hours out). Always clamps
// at zero so it never shows negative time.
function fmtRemain(remMs) {
  const total = Math.max(0, Math.floor(remMs / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? h + ":" + pad(m) + ":" + pad(s) : m + ":" + pad(s);
}

// Screens that are safe to deep-link / bookmark via the URL hash. Transient
// flow screens (ordering, reveal, detail, cart, breathe) deliberately are not.
const LINKABLE = new Set(["stats", "admin", "track"]);
const initialScreen = () => {
  const h = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
  return LINKABLE.has(h) ? h : "mood";
};

const FEEDBACK_URL =
  import.meta.env.VITE_FEEDBACK_URL ||
  "mailto:sayhi@365zocial.com?subject=" + encodeURIComponent("ติชมแอปใจฟู");

export default function Jaifu() {
  // me = the persisted record; every mutation goes read-merge-write
  // through storage.js so two tabs can't lose each other's orders.
  const [me, setMe] = useState(initMe);
  // Only #stats and #admin are deep-linkable; everything else starts at mood.
  const [screen, setScreen] = useState(initialScreen);
  const [tab, setTab] = useState("food");
  const [moodBefore, setMoodBefore] = useState(null);
  const [cart, setCart] = useState([]);
  const [current, setCurrent] = useState(null);
  const [opts, setOpts] = useState({});
  const [lastAmount, setLastAmount] = useState(0);
  const [lastTs, setLastTs] = useState(null);
  const [orderStep, setOrderStep] = useState(0);
  const [pop, setPop] = useState(false);
  const [global, setGlobal] = useState(null);
  // Delivery selection lives only in React state (not persisted) — defaults to
  // the gentle "ส่งปกติ" each fresh load. scheduledSlot is an absolute epoch-ms.
  const [deliveryMethod, setDeliveryMethod] = useState("normal");
  const [scheduledSlot, setScheduledSlot] = useState(null);

  const items = tab === "food" ? FOOD : SHOP;
  const customCfg = tab === "food" ? FOOD_CUSTOM : SHOP_CUSTOM;
  const cartTotal = cart.reduce((s, c) => s + c.total, 0);
  // Shipping folds into the jar: orderTotal is the single source of truth for
  // both the CTA and the commit (so jar / chart / reveal all agree).
  const shippingFee = SHIPPING[deliveryMethod];
  const orderTotal = cartTotal + shippingFee;
  // Regenerate the scheduled slots each render off a coarse (per-minute) clock
  // so a cart left open never offers an already-passed slot.
  const slotClock = Math.floor(Date.now() / 60000);
  const scheduleSlots = React.useMemo(() => makeSlots(Date.now()), [slotClock]);
  // If the picked slot ages out of the regenerated list (cart left open past
  // it), drop it — otherwise the chip silently de-highlights while the CTA
  // stays enabled, and the order would commit with a mismatched "ตามนัด" reason.
  useEffect(() => {
    if (scheduledSlot !== null && !scheduleSlots.some((s) => s.ts === scheduledSlot)) {
      setScheduledSlot(null);
    }
  }, [scheduleSlots, scheduledSlot]);

  // Always-fresh handle on the active delivery for the once-registered popstate
  // listener (its `me` closure is the mount-time snapshot, and freshest() falls
  // back to that stale copy when storage is unavailable — a ref dodges both).
  const activeDeliveryRef = useRef(me.activeDelivery);
  useEffect(() => { activeDeliveryRef.current = me.activeDelivery; }, [me.activeDelivery]);

  // Ritual steps follow what's actually in the cart, not the active tab.
  const shopCount = cart.filter((c) => c.kind === "shop").length;
  const orderSteps =
    shopCount > cart.length - shopCount ? ORDER_STEPS_SHOP : ORDER_STEPS_FOOD;

  // The check-in streak is stamped when the user opens the mood screen, not
  // when they order — so it honestly counts "days you came back to check in"
  // (its label) even if they only browse. After a gap it reads stale, so
  // display 0 unless the last check-in was today or yesterday. NOTE: this is
  // a render-time snapshot for display only; mutating paths recompute the
  // day key at event time so they never act on a stale midnight boundary.
  const todaySnap = dayKey(new Date());
  const yesterdaySnap = dayKey(new Date(Date.now() - 86400000));
  const displayStreak =
    me.lastDate === todaySnap || me.lastDate === yesterdaySnap ? me.streak : 0;

  // Record a daily check-in (mood-screen entry). Read-merge-write so two
  // tabs can't clobber each other; idempotent within a day.
  const checkIn = (mood) => {
    const now = new Date();
    const dk = dayKey(now);
    const yk = dayKey(new Date(now.getTime() - 86400000));
    const fresh = freshest(me);
    const streak =
      fresh.lastDate === dk ? fresh.streak || 1
      : fresh.lastDate === yk ? (fresh.streak || 0) + 1
      : 1;
    const next = { ...fresh, streak, lastDate: dk };
    saveMe(next);
    setMe(next);
    setMoodBefore(mood);
    setScreen("feed");
  };

  // -------- shared stats (anonymous aggregates from the server) --------
  const loadGlobal = async () => {
    setGlobal({ busy: true });
    try {
      const s = await fetchSummary();
      setGlobal({
        users: s.users || 0,
        totalOrders: s.totalOrders || 0,
        savedAll: s.savedAll || 0,
        top: Array.isArray(s.top) ? s.top : [],
        hours: Array.isArray(s.hours) ? s.hours : Array(24).fill(0),
        // Default to {} so an older server (no analytics yet) can't crash Admin.
        methods: s.methods || {},
        moods: s.moods || {},
        lifts: s.lifts || {},
      });
    } catch (e) {
      setGlobal({ error: true });
    }
  };

  // -------- URL hash <-> screen sync (deep-link #stats / #admin) --------
  // If we land on #admin directly, load the shared stats once.
  useEffect(() => {
    if (initialScreen() === "admin") loadGlobal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the hash in sync with the current screen (only for linkable ones),
  // so the URL is shareable. Push when opening #admin so the back button
  // returns to #stats; replace for everything else to avoid history spam.
  useEffect(() => {
    const want = LINKABLE.has(screen) ? "#" + screen : "";
    if (window.location.hash === want) return;
    const url = want || window.location.pathname;
    if (screen === "admin") window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }, [screen]);

  // Back/forward: follow the hash to a linkable screen, else home to mood.
  useEffect(() => {
    const onPop = () => {
      const h = window.location.hash.slice(1);
      // #track has no meaning without a live delivery — read the ref (always
      // current), not the mount-time closure, so a back into a finished
      // delivery doesn't strand the user on an empty screen.
      if (h === "track" && !activeDeliveryRef.current) {
        setScreen("mood");
        return;
      }
      if (LINKABLE.has(h)) {
        if (h === "admin") loadGlobal();
        setScreen(h);
      } else {
        setScreen("mood");
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On mount: clear a long-stale delivery, and never land on an empty #track.
  useEffect(() => {
    const d = me.activeDelivery;
    const stale = d && Date.now() - d.eta > 6 * 3600000; // unacknowledged > 6h
    if (stale) {
      const next = { ...freshest(me), activeDelivery: null };
      saveMe(next);
      setMe(next);
    }
    if (initialScreen() === "track" && (!d || stale)) {
      setScreen(me.totalSaved > 0 ? "stats" : "mood");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconcile across tabs: when another tab rewrites the record (e.g. collects
  // or re-orders a delivery), refresh so a live countdown here doesn't ghost.
  // pageshow covers iOS bfcache restores that skip visibilitychange.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key && e.key !== "jaifu:me") return;
      const fresh = freshest(me);
      if (fresh) setMe(fresh);
    };
    const onShow = () => setMe(freshest(me));
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", onShow);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", onShow);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------- detail / customization --------
  const openItem = (it) => {
    setCurrent(it);
    const initial = {};
    customCfg.forEach((g) => { if (!g.multi) initial[g.key] = g.choices[0].id; else initial[g.key] = []; });
    setOpts(initial);
    setScreen("detail");
  };

  const optAdd = () => {
    let add = 0;
    customCfg.forEach((g) => {
      if (g.multi) {
        (opts[g.key] || []).forEach((cid) => {
          const c = g.choices.find((x) => x.id === cid); if (c) add += c.add;
        });
      } else {
        const c = g.choices.find((x) => x.id === opts[g.key]); if (c) add += c.add;
      }
    });
    return add;
  };

  const toggleOpt = (g, cid) => {
    setOpts((p) => {
      if (g.multi) {
        const arr = p[g.key] || [];
        return { ...p, [g.key]: arr.includes(cid) ? arr.filter((x) => x !== cid) : [...arr, cid] };
      }
      return { ...p, [g.key]: cid };
    });
  };

  const addToCart = () => {
    const total = current.price + optAdd();
    // kind is stamped at add time so a mixed cart keeps each item's catalog
    setCart((c) => [...c, { ...current, total, kind: tab, uid: Date.now() + Math.random() }]);
    setPop(true); setTimeout(() => setPop(false), 700);
    setScreen("feed");
  };

  // -------- checkout: soft daily cap before the ritual --------
  // Day key is recomputed here at event time (not the render snapshot) so a
  // tab left open across midnight doesn't gate against yesterday's count.
  const startOrder = () => {
    if (cart.length === 0) return;
    const dk = dayKey(new Date());
    setOrderStep(0); // reset before mounting Ordering so it never flashes "done"
    if (me.today === dk && me.todayCount >= DAILY_CAP) setScreen("breathe");
    else setScreen("ordering");
  };

  /* Commit the order the moment the ritual finishes — before the mood
     question — so closing the app on the reveal screen can never lose a
     jar the UI already announced. The after-mood answer is patched in
     later as optional metadata. Streak is NOT touched here — it belongs to
     the check-in (see checkIn), not the order. */
  const commitOrder = () => {
    const now = new Date();
    const dk = dayKey(now);
    const fresh = freshest(me);
    const orderCount = fresh.orderCount + 1;
    const itemCounts = { ...fresh.itemCounts };
    cart.forEach((c) => { itemCounts[c.name] = (itemCounts[c.name] || 0) + 1; });
    const hourCounts = { ...fresh.hourCounts };
    const h = String(now.getHours());
    hourCounts[h] = (hourCounts[h] || 0) + 1;
    // Anonymous aggregates: which delivery method, and the mood that led here.
    // moodBefore is null when the user deep-linked past the check-in — skip it.
    const methodCounts = { ...fresh.methodCounts };
    methodCounts[deliveryMethod] = (methodCounts[deliveryMethod] || 0) + 1;
    const moodCounts = { ...fresh.moodCounts };
    if (moodBefore) moodCounts[moodBefore] = (moodCounts[moodBefore] || 0) + 1;
    const ts = now.getTime();
    const entry = {
      // Shipping folds into the jar, so the saved amount is the full orderTotal.
      idx: orderCount, saved: orderTotal,
      moodBefore, moodAfter: null, lift: null, ts,
    };
    // Build the in-flight imaginary delivery. ETA is an absolute timestamp so
    // the countdown survives reload; the funny reason is frozen here so it
    // doesn't re-randomize on every render.
    let eta, reason;
    if (deliveryMethod === "instant") {
      eta = ts + 60000 + Math.floor(Math.random() * 60000); // 60–120s
      reason = INSTANT_REASON;
    } else if (deliveryMethod === "scheduled") {
      // Clamp to at least a minute out so a slot the user dawdled past doesn't
      // commit as instantly-"arrived" and skip the whole tracking moment.
      eta = Math.max(scheduledSlot || ts + 30 * 60000, ts + 60000);
      reason = SCHED_REASON;
    } else {
      eta = ts + (3 + Math.floor(Math.random() * 12)) * 60000; // 3–14 min (≤15)
      reason = FUNNY_REASONS[Math.floor(Math.random() * FUNNY_REASONS.length)];
    }
    const activeDelivery = {
      method: deliveryMethod,
      eta,
      placedTs: ts,
      reason,
      amount: orderTotal,
      itemCount: cart.length,
      steps: orderSteps === ORDER_STEPS_SHOP ? "shop" : "food",
      dismissed: false,
    };
    const next = {
      ...fresh,
      totalSaved: fresh.totalSaved + orderTotal,
      orderCount,
      history: [...fresh.history, entry].slice(-100),
      itemCounts,
      hourCounts,
      methodCounts,
      moodCounts,
      today: dk,
      todayCount: fresh.today === dk ? fresh.todayCount + 1 : 1,
      activeDelivery, // a re-order while one is in flight simply replaces it
    };
    saveMe(next);
    setMe(next);
    setLastAmount(orderTotal);
    setLastTs(ts); // so finishReveal patches THIS entry, not another tab's
    setCart([]);
    // Reset the selector so the next order starts clean (and the CTA is never
    // mysteriously disabled by a stale scheduled-without-slot state).
    setDeliveryMethod("normal");
    setScheduledSlot(null);
    setScreen("reveal");
    pushStats(next).catch(() => { /* shared stats are best-effort */ });
  };

  // -------- the order ritual (fake delivery) --------
  useEffect(() => {
    if (screen !== "ordering") return;
    setOrderStep(0);
    const reduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stepMs = reduced ? 350 : 1400;
    const doneMs = reduced ? 250 : 900;
    let i = 0;
    let doneT = null;
    const t = setInterval(() => {
      i += 1;
      if (i >= orderSteps.length) {
        clearInterval(t);
        doneT = setTimeout(commitOrder, doneMs);
      }
      setOrderStep(i);
    }, stepMs);
    return () => { clearInterval(t); if (doneT) clearTimeout(doneT); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // Patch the after-mood answer onto THIS order (matched by its timestamp,
  // not "the last entry" — another tab may have appended a newer one).
  // Idempotent: a second tap finds lift already set and just navigates.
  const finishReveal = (after) => {
    const fresh = freshest(me);
    const history = [...fresh.history];
    const i = history.findIndex((h) => h.ts === lastTs && h.lift === null);
    if (i !== -1) {
      history[i] = { ...history[i], moodAfter: after.id, lift: after.lift };
      // Tally the after-feeling into the anonymous aggregate and push it. The
      // i !== -1 / lift === null guard makes this idempotent — a second tap
      // won't double-count. This fires after the order's own push, carrying
      // the same orderCount, which the server merges per-key (no rollback).
      const liftCounts = { ...fresh.liftCounts };
      liftCounts[after.id] = (liftCounts[after.id] || 0) + 1;
      const next = { ...fresh, history, liftCounts };
      saveMe(next);
      setMe(next);
      pushStats(next).catch(() => { /* shared stats are best-effort */ });
    }
    setMoodBefore(null);
    // Hand off to the live tracking screen if a delivery is in flight (the
    // natural next beat after relief: "now it's on the way"); else the jar.
    setScreen(fresh.activeDelivery ? "track" : "stats");
  };

  // Collect the arrived delivery: clears the in-flight state and shows the jar.
  // read-merge-write so a second tab's newer record isn't clobbered.
  const ackDelivery = () => {
    const fresh = freshest(me);
    const next = { ...fresh, activeDelivery: null };
    saveMe(next);
    setMe(next);
    setScreen("stats");
  };

  // "ช้อปต่อ" re-enters through the mood check-in unless one is already
  // active — the bookend is the whole point of the app.
  const shopAgain = () => {
    setTab("food");
    setScreen(moodBefore ? "feed" : "mood");
  };

  // -------- derived stats (honest versions) --------
  const answered = me.history.filter((h) => h.lift !== null && h.lift !== undefined);
  const lifted = answered.filter((h) => h.lift > 0).length;
  const liftPct = answered.length ? Math.round((lifted / answered.length) * 100) : 0;
  const wantReal = answered.filter((h) => h.lift < 0).length;

  // Cumulative chart: history holds only the last 100 entries, so start the
  // line from the truncated-away baseline instead of 0 — the endpoint then
  // always equals the jar.
  const histSum = me.history.reduce((s, h) => s + (Number(h.saved) || 0), 0);
  let run = Math.max(0, me.totalSaved - histSum);
  const chartData = me.history.map((h) => ({ name: "#" + h.idx, saved: (run += h.saved) }));

  // Mood insight: the user's most common trigger mood and how often the
  // ritual actually lifted it (needs >= 3 answered orders for that mood).
  const insight = (() => {
    const groups = {};
    answered.forEach((h) => {
      if (!h.moodBefore) return;
      (groups[h.moodBefore] = groups[h.moodBefore] || []).push(h);
    });
    let best = null;
    Object.entries(groups).forEach(([mood, arr]) => {
      if (arr.length >= 3 && (!best || arr.length > best.arr.length)) best = { mood, arr };
    });
    if (!best) return null;
    const m = MOODS.find((x) => x.id === best.mood);
    if (!m) return null;
    return {
      emoji: m.emoji, label: m.label,
      pos: best.arr.filter((h) => h.lift > 0).length,
      total: best.arr.length,
    };
  })();

  return (
    <div className="jf-root">
      <style>{CSS}</style>
      <div className="jf-phone">
        {screen === "mood" && (
          <Mood onPick={checkIn} />
        )}

        {screen === "feed" && (
          <Feed
            tab={tab} setTab={setTab} items={items} openItem={openItem}
            cartCount={cart.length} cartTotal={cartTotal} pop={pop}
            goCart={() => setScreen("cart")} goStats={() => setScreen("stats")}
            totalSaved={me.totalSaved}
            activeDelivery={me.activeDelivery} goTrack={() => setScreen("track")}
          />
        )}

        {screen === "detail" && current && (
          <Detail
            item={current} cfg={customCfg} opts={opts} toggle={toggleOpt}
            extra={optAdd()} back={() => setScreen("feed")} add={addToCart}
          />
        )}

        {screen === "cart" && (
          <Cart
            cart={cart} total={cartTotal} orderTotal={orderTotal} shippingFee={shippingFee}
            method={deliveryMethod} setMethod={setDeliveryMethod}
            slot={scheduledSlot} setSlot={setScheduledSlot} slots={scheduleSlots}
            back={() => setScreen("feed")}
            remove={(uid) => setCart((c) => c.filter((x) => x.uid !== uid))}
            order={startOrder}
          />
        )}

        {screen === "breathe" && (
          <Breathe
            count={me.today === todaySnap ? me.todayCount : 0}
            onRest={() => setScreen("stats")}
            onProceed={() => { setOrderStep(0); setScreen("ordering"); }}
          />
        )}

        {screen === "ordering" && (
          <Ordering step={orderStep} steps={orderSteps} />
        )}

        {screen === "reveal" && (
          <Reveal amount={lastAmount} total={me.totalSaved} onDone={finishReveal} />
        )}

        {screen === "track" && (
          <Track
            d={me.activeDelivery} onArrivedAck={ackDelivery}
            goStats={() => setScreen("stats")} goShop={shopAgain}
          />
        )}

        {screen === "stats" && (
          <Stats
            totalSaved={me.totalSaved} orderCount={me.orderCount}
            streak={displayStreak} answeredCount={answered.length}
            liftPct={liftPct} wantReal={wantReal}
            chartData={chartData} insight={insight}
            again={shopAgain}
            goAdmin={() => { setScreen("admin"); loadGlobal(); }}
            activeDelivery={me.activeDelivery} goTrack={() => setScreen("track")}
          />
        )}

        {screen === "admin" && (
          <Admin g={global} refresh={loadGlobal} back={() => setScreen("stats")} />
        )}
      </div>
    </div>
  );
}

/* ---------------- Screens ---------------- */

function Mood({ onPick }) {
  return (
    <div className="jf-screen jf-center jf-pad">
      <div className="jf-logo"><Heart size={22} fill="currentColor" /> ใจฟู</div>
      <div className="jf-mood-title">ตอนนี้รู้สึกยังไง?</div>
      <div className="jf-mood-sub">เช็คใจตัวเองก่อน แล้วค่อยไปช้อปแบบไม่ต้องจ่ายจริง</div>
      <div className="jf-mood-grid">
        {MOODS.map((m, i) => (
          <button key={m.id} className="jf-mood-card" style={{ animationDelay: i * 70 + "ms" }} onClick={() => onPick(m.id)}>
            <span className="jf-mood-emoji" aria-hidden="true">{m.emoji}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>
      <div className="jf-mood-foot">ฟินได้ ไม่ต้องจ่าย 💛</div>
    </div>
  );
}

function Feed({ tab, setTab, items, openItem, cartCount, cartTotal, pop, goCart, goStats, totalSaved, activeDelivery, goTrack }) {
  return (
    <div className={"jf-screen" + (activeDelivery ? " jf-feed-has-deliv" : "")}>
      <div className="jf-top">
        <div className="jf-top-row">
          <div className="jf-logo sm"><Heart size={16} fill="currentColor" /> ใจฟู</div>
          <button className="jf-jar-pill" onClick={goStats} aria-label={"เปิดกระปุกของฉัน ตอนนี้มี " + baht(totalSaved)}>
            <PiggyBank size={15} /> {baht(totalSaved)}
          </button>
        </div>
        <div className="jf-tabs">
          <button className={"jf-tab " + (tab === "food" ? "on" : "")} onClick={() => setTab("food")} aria-pressed={tab === "food"}>
            <Utensils size={15} /> อาหาร
          </button>
          <button className={"jf-tab " + (tab === "shop" ? "on" : "")} onClick={() => setTab("shop")} aria-pressed={tab === "shop"}>
            <ShoppingBag size={15} /> ช้อปปิ้ง
          </button>
        </div>
      </div>

      <div className="jf-feed">
        <div className="jf-banner">
          <Sparkles size={16} />
          <span>เลือกของที่อยากได้ให้สะใจ — ตอนกดสั่ง ยอดจะเข้ากระปุกแทน ไม่มีการจ่ายจริง</span>
        </div>
        <div className="jf-grid">
          {items.map((it, i) => (
            <button key={it.id} className="jf-card" style={{ animationDelay: i * 45 + "ms" }} onClick={() => openItem(it)}>
              <div className="jf-card-img" aria-hidden="true">{it.emoji}</div>
              <div className="jf-card-name">{it.name}</div>
              <div className="jf-card-shop">{it.shop}</div>
              <div className="jf-card-row">
                <span className="jf-price">{baht(it.price)}</span>
                <span className="jf-add"><Plus size={16} /></span>
              </div>
            </button>
          ))}
        </div>
        <div style={{ height: 90 }} />
      </div>

      {cartCount > 0 && (
        <button className={"jf-cartbar " + (pop ? "pop" : "")} onClick={goCart}>
          <span className="jf-cartbar-l"><ShoppingBag size={18} /> {cartCount} รายการ</span>
          <span>{baht(cartTotal)} · ดูตะกร้า</span>
        </button>
      )}
      {activeDelivery && <FeedDeliveryPill d={activeDelivery} onClick={goTrack} />}
    </div>
  );
}

// Floating "on the way" pill on the feed — its own 1s tick, scoped here so the
// rest of the feed doesn't re-render every second. Remaining is always derived
// from the absolute ETA, so a backgrounded tab self-corrects on the next tick.
function FeedDeliveryPill({ d, onClick }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const remMs = d.eta - now;
  const arrived = remMs <= 0;
  const clock = fmtRemain(remMs);
  return (
    <button className="jf-deliv-pill" onClick={onClick}
      aria-label={arrived ? "ส่งถึงแล้ว เปิดดูการจัดส่ง" : "กำลังจัดส่ง เหลือ " + clock + " เปิดดูการจัดส่ง"}>
      <span className="jf-deliv-pill-l">
        {arrived ? <Check size={16} /> : <Bike size={16} />}
        {arrived ? "ส่งถึงแล้ว 🎉" : "กำลังจัดส่ง"}
      </span>
      {!arrived && <span className="jf-deliv-pill-time">เหลือ {clock}</span>}
    </button>
  );
}

// Stats-screen doorway into Track. Ticks once a second so its label flips to
// "ส่งถึงแล้ว" the moment the ETA crosses, even while sitting on the jar.
function TrackEntryButton({ d, onClick }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const arrived = now >= d.eta;
  return (
    <button className="jf-track-entry" onClick={onClick}>
      <span className="jf-track-entry-l">
        <Bike size={16} />
        {arrived ? "ส่งถึงแล้ว 🎉 — แตะเพื่อดู" : "กำลังจัดส่งอยู่ — แตะเพื่อติดตาม"}
      </span>
      <ChevronLeft size={18} style={{ transform: "rotate(180deg)" }} />
    </button>
  );
}

function Detail({ item, cfg, opts, toggle, extra, back, add }) {
  return (
    <div className="jf-screen">
      <div className="jf-detail-head">
        <button className="jf-icon-btn" onClick={back} aria-label="ย้อนกลับ"><ChevronLeft size={22} /></button>
      </div>
      <div className="jf-detail-scroll">
        <div className="jf-detail-hero" aria-hidden="true">{item.emoji}</div>
        <div className="jf-detail-name">{item.name}</div>
        <div className="jf-detail-shop">{item.shop}</div>
        <div className="jf-detail-price">{baht(item.price)}</div>

        {cfg.map((g) => (
          <div key={g.key} className="jf-group">
            <div className="jf-group-label">{g.label}{g.multi && <span className="jf-opt-hint"> เลือกได้หลายอย่าง</span>}</div>
            <div className="jf-chips">
              {g.choices.map((c) => {
                const on = g.multi ? (opts[g.key] || []).includes(c.id) : opts[g.key] === c.id;
                return (
                  <button key={c.id} className={"jf-chip " + (on ? "on" : "")} onClick={() => toggle(g, c.id)} aria-pressed={on}>
                    {c.label}{c.add > 0 && <span className="jf-chip-add"> +{c.add}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <div style={{ height: 96 }} />
      </div>
      <button className="jf-cta" onClick={add}>
        <Plus size={18} /> ใส่ตะกร้า · {baht(item.price + extra)}
      </button>
    </div>
  );
}

function Cart({ cart, total, orderTotal, shippingFee, method, setMethod, slot, setSlot, slots, back, remove, order }) {
  const empty = cart.length === 0;
  const needSlot = method === "scheduled" && slot === null;
  const methodNote = DELIVERY_METHODS.find((m) => m.id === method).note;
  return (
    <div className="jf-screen">
      <div className="jf-detail-head between">
        <button className="jf-icon-btn" onClick={back} aria-label="ย้อนกลับ"><ChevronLeft size={22} /></button>
        <div className="jf-head-title">ตะกร้าของคุณ</div>
        <div style={{ width: 36 }} />
      </div>
      <div className="jf-detail-scroll">
        {empty && (
          <div className="jf-chart-empty">ตะกร้าว่างแล้ว — กลับไปเลือกของที่อยากได้ก่อนนะ</div>
        )}
        {cart.map((c) => (
          <div key={c.uid} className="jf-cart-item">
            <span className="jf-cart-emoji" aria-hidden="true">{c.emoji}</span>
            <div className="jf-cart-mid">
              <div className="jf-cart-name">{c.name}</div>
              <div className="jf-cart-shop">{c.shop}</div>
            </div>
            <div className="jf-cart-price">{baht(c.total)}</div>
            <button className="jf-remove" onClick={() => remove(c.uid)} aria-label={"ลบ " + c.name + " ออกจากตะกร้า"}><X size={16} /></button>
          </div>
        ))}

        {!empty && (
          <div className="jf-group jf-deliv-group">
            <div className="jf-group-label">เลือกวิธีจัดส่ง</div>
            <div className="jf-chips jf-deliv-chips">
              {DELIVERY_METHODS.map((m) => {
                const fee = SHIPPING[m.id];
                const on = method === m.id;
                return (
                  <button key={m.id} className={"jf-chip jf-deliv-chip " + (on ? "on" : "")}
                    onClick={() => setMethod(m.id)} aria-pressed={on}>
                    <span className="jf-deliv-emoji" aria-hidden="true">{m.emoji}</span>
                    <span className="jf-deliv-main">{m.label}</span>
                    <span className="jf-chip-add">{fee === 0 ? "ส่งฟรี" : "+" + baht(fee)}</span>
                  </button>
                );
              })}
            </div>
            <div className="jf-deliv-note">{methodNote}</div>

            {method === "scheduled" && (
              <div className="jf-slot-wrap">
                <div className="jf-group-label">เลือกเวลาที่อยากให้มาส่ง</div>
                <div className="jf-chips">
                  {slots.map((s, i) => (
                    <button key={s.ts} className={"jf-chip " + (slot === s.ts ? "on" : "")}
                      onClick={() => setSlot(s.ts)} aria-pressed={slot === s.ts}>
                      {s.label}{i === 0 && <span className="jf-chip-add"> เร็วสุด</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {shippingFee > 0 && (
              <div className="jf-deliv-fee">รวมค่าส่ง {baht(shippingFee)} — ก็เข้ากระปุกเหมือนกันนะ 💛</div>
            )}
          </div>
        )}

        <div className="jf-cart-note">
          <Sparkles size={14} /> ค่าส่งรวมอยู่ในยอดนี้แล้ว และทั้งหมดจะเข้ากระปุกของคุณ ไม่ได้ตัดเงินจริงนะ 💛
        </div>
        <div style={{ height: 96 }} />
      </div>
      <button className="jf-cta order" onClick={order} disabled={empty || needSlot}>
        {needSlot ? "เลือกเวลาก่อนนะ" : "สั่งเลย · " + baht(orderTotal)}
      </button>
    </div>
  );
}

// Guided breathing pause. The whole point of the soft cap is to interrupt a
// compulsive loop, so "ขออีกครั้งเดียว" is locked behind one real breathe
// cycle (~8s) with a live count of breaths remaining; "พักก่อนดีกว่า" is the
// always-available primary exit.
function Breathe({ count, onRest, onProceed }) {
  const BREATHS = 2;
  const PHASE_MS = 4000; // inhale + exhale per breath
  const [left, setLeft] = useState(BREATHS);
  const [phase, setPhase] = useState("หายใจเข้า…");
  useEffect(() => {
    const reduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setLeft(0); return; }
    let n = BREATHS;
    let inhale = true;
    const phaseT = setInterval(() => {
      inhale = !inhale;
      setPhase(inhale ? "หายใจเข้า…" : "ผ่อนลมหายใจออก…");
    }, PHASE_MS / 2);
    const breathT = setInterval(() => {
      n -= 1;
      setLeft(n);
      if (n <= 0) { clearInterval(breathT); clearInterval(phaseT); }
    }, PHASE_MS);
    return () => { clearInterval(breathT); clearInterval(phaseT); };
  }, []);
  const ready = left <= 0;
  return (
    <div className="jf-screen jf-center jf-pad">
      <div className={"jf-order-bubble jf-breathe-bubble" + (ready ? " done" : "")}>
        <Wind size={40} />
      </div>
      <div className="jf-order-label">วันนี้ฟินไป {count} ครั้งแล้ว</div>
      <div className="jf-reveal-sub">
        เก่งมากที่ไม่ได้ซื้อจริงเลยนะ 💛 การกดสั่งถี่ๆ อาจเป็นสัญญาณว่าใจกำลังเหนื่อย
        ลองหายใจช้าๆ ไปด้วยกันสักครู่ แล้วค่อยตัดสินใจต่อนะ
      </div>
      {!ready && <div className="jf-breathe-phase" aria-live="polite">{phase} (เหลืออีก {left} ครั้ง)</div>}
      <div className="jf-after-row" style={{ width: "100%", marginTop: 24 }}>
        <button className="jf-after-btn" onClick={onRest}>
          <span className="jf-after-emoji" aria-hidden="true">🌙</span>
          <span>พักก่อนดีกว่า</span>
        </button>
        <button className="jf-after-btn" onClick={onProceed} disabled={!ready}>
          <span className="jf-after-emoji" aria-hidden="true">🛒</span>
          <span>{ready ? "ขออีกครั้งเดียว" : "รอสักครู่…"}</span>
        </button>
      </div>
    </div>
  );
}

function Ordering({ step, steps }) {
  const pct = Math.min(100, (step / steps.length) * 100);
  return (
    <div className="jf-screen jf-center jf-pad">
      <div className="jf-order-bubble">
        {React.createElement(steps[Math.min(step, steps.length - 1)].icon, { size: 40 })}
      </div>
      <div className="jf-order-label" aria-live="polite">{steps[Math.min(step, steps.length - 1)].label}</div>
      <div className="jf-progress" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={Math.min(step, steps.length)}>
        <div className="jf-progress-fill" style={{ width: pct + "%" }} />
      </div>
      <div className="jf-order-steps">
        {steps.map((s, i) => (
          <div key={i} className={"jf-step-dot " + (i <= step ? "done" : "")}>
            {i < step ? <Check size={13} /> : i + 1}
          </div>
        ))}
      </div>
      <div className="jf-order-hint">กำลังเตรียมความสุขให้คุณ…</div>
    </div>
  );
}

function Reveal({ amount, total, onDone }) {
  const [coins, setCoins] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => { const t = setTimeout(() => setCoins(true), 350); return () => clearTimeout(t); }, []);
  const answer = (a) => {
    if (done) return;
    setDone(true);
    onDone(a);
  };
  return (
    <div className="jf-screen jf-center jf-pad">
      <div className="jf-reveal-burst">
        <div className="jf-jar-wrap">
          <PiggyBank size={88} />
          {coins && [0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="jf-coin" style={{ animationDelay: i * 110 + "ms", left: 14 + i * 14 + "px" }}>฿</span>
          ))}
        </div>
      </div>
      <div className="jf-reveal-amount">+{baht(amount)}</div>
      <div className="jf-reveal-title">เข้ากระปุกแล้ว!</div>
      <div className="jf-reveal-sub">
        ออเดอร์นี้ไม่ได้เกิดขึ้นจริง 💛 ยอดที่ใจอยากจ่าย {baht(amount)} ถูกเก็บไว้แทน<br />
        ตอนนี้กระปุกของคุณมี <b>{baht(total)}</b>
      </div>
      <div className="jf-after-q">แล้วตอนนี้รู้สึกยังไงบ้าง?</div>
      <div className="jf-after-row">
        {AFTER.map((a) => (
          <button key={a.id} className="jf-after-btn" onClick={() => answer(a)} disabled={done}>
            <span className="jf-after-emoji" aria-hidden="true">{a.emoji}</span>
            <span>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Live delivery tracking. The countdown is INFORMATION, not decoration, so its
// 1s tick runs regardless of reduced-motion; remaining is recomputed from the
// absolute ETA every render, so closing/reopening the app shows the truth.
function Track({ d, onArrivedAck, goStats, goShop }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    const snap = () => setNow(Date.now()); // snap to truth on refocus / bfcache
    document.addEventListener("visibilitychange", snap);
    window.addEventListener("pageshow", snap);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", snap);
      window.removeEventListener("pageshow", snap);
    };
  }, []);

  // Defensive fallback — never a blank frame if we land here without a delivery
  // (e.g. the moment between another tab clearing it and a guard redirecting).
  if (!d) {
    return (
      <div className="jf-screen jf-center jf-pad">
        <div className="jf-order-label">ยังไม่มีรายการจัดส่ง</div>
        <div className="jf-track-sub">ตอนนี้ไม่มีของกำลังมาส่งนะ</div>
        <button className="jf-cta ghost" style={{ marginTop: 24 }} onClick={goStats}>
          <PiggyBank size={16} /> ดูกระปุก
        </button>
      </div>
    );
  }

  const remMs = d.eta - now;
  const arrived = remMs <= 0;
  const clock = fmtRemain(remMs);
  const arriveAt = new Date(d.eta).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

  // Advance the live status line by elapsed fraction of the wait.
  const LINES = d.steps === "shop" ? SHOP_TRACK_LINES : FOOD_TRACK_LINES;
  const span = d.eta - d.placedTs;
  const frac = span > 0 ? 1 - remMs / span : 1;
  const lineIdx = arrived ? LINES.length - 1 : Math.min(LINES.length - 1, Math.max(0, Math.floor(frac * LINES.length)));

  return (
    <div className="jf-screen jf-center jf-pad">
      <div className={"jf-order-bubble" + (arrived ? " jf-track-done" : "")}>
        {arrived ? <Check size={40} /> : <Bike size={40} />}
      </div>

      {!arrived ? (
        <>
          <div className="jf-order-label">กำลังจัดส่ง</div>
          <div className="jf-track-clock" aria-live="off">{clock}</div>
          <div className="jf-track-sub">คาดว่าถึงเวลา {arriveAt} น.</div>
          <div className="jf-track-line" aria-live="polite">{LINES[lineIdx]}</div>
          <div className="jf-track-reason"><Sparkles size={14} /> {d.reason}</div>
          <div className="jf-track-jar">ยอด {baht(d.amount)} เข้ากระปุกเรียบร้อยแล้ว — ของยังเดินทางมาให้ใจฟูต่อ 💛</div>
        </>
      ) : (
        <>
          <div className="jf-order-label">ส่งถึงแล้ว 🎉</div>
          <div className="jf-track-sub">ของจริงไม่ได้มาส่งหรอกนะ 💛 แต่ความฟินกับเงินในกระปุกมาส่งถึงใจคุณแล้วเรียบร้อย</div>
          <div className="jf-track-jar">ยอด {baht(d.amount)} อยู่ในกระปุกของคุณเรียบร้อย</div>
        </>
      )}

      <div className="jf-after-row" style={{ width: "100%", marginTop: 24 }}>
        <button className="jf-after-btn" onClick={goShop}>
          <span className="jf-after-emoji" aria-hidden="true">🏠</span>
          <span>ช้อปต่อ</span>
        </button>
        <button className="jf-after-btn" onClick={arrived ? onArrivedAck : goStats}>
          <span className="jf-after-emoji" aria-hidden="true">{arrived ? "🐷" : "📊"}</span>
          <span>{arrived ? "เก็บใส่กระปุก" : "ดูกระปุก"}</span>
        </button>
      </div>
    </div>
  );
}

function Stats({ totalSaved, orderCount, streak, answeredCount, liftPct, wantReal, chartData, insight, again, goAdmin, activeDelivery, goTrack }) {
  return (
    <div className="jf-screen">
      <div className="jf-detail-head between">
        <div className="jf-head-title">กระปุกของฉัน</div>
      </div>
      <div className="jf-detail-scroll">
        <div className="jf-jar-hero">
          <div className="jf-jar-icon"><PiggyBank size={46} /></div>
          <div className="jf-jar-amount">{baht(totalSaved)}</div>
          <div className="jf-jar-cap">ยอดที่ใจอยากจ่าย แต่ไม่ได้จ่ายจริง — ลองโอนบางส่วนเข้าบัญชีออมจริงดูนะ</div>
        </div>

        {activeDelivery && <TrackEntryButton d={activeDelivery} onClick={goTrack} />}

        <div className="jf-stat-row">
          <div className="jf-stat-box">
            <div className="jf-stat-ic"><ShoppingBag size={18} /></div>
            <div className="jf-stat-n">{orderCount}</div>
            <div className="jf-stat-l">ครั้งที่กดสั่ง</div>
          </div>
          <div className="jf-stat-box">
            <div className="jf-stat-ic"><Flame size={18} /></div>
            <div className="jf-stat-n">{streak}</div>
            <div className="jf-stat-l">วันที่กลับมาเช็คใจ</div>
          </div>
          <div className="jf-stat-box">
            <div className="jf-stat-ic"><TrendingUp size={18} /></div>
            <div className="jf-stat-n">{answeredCount ? liftPct + "%" : "–"}</div>
            <div className="jf-stat-l">โล่งขึ้นหลังสั่ง</div>
          </div>
        </div>

        <div className="jf-chart-card">
          <div className="jf-chart-title">กระปุกโตขึ้นเรื่อยๆ</div>
          {chartData.length > 0 ? (
            <div style={{ height: 150 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 6, left: 6, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C9711A" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#C9711A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#5B6B84" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => baht(v)} contentStyle={{ borderRadius: 12, border: "none", fontSize: 13 }} />
                  <Area type="monotone" dataKey="saved" stroke="#C9711A" strokeWidth={2.5} fill="url(#g)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="jf-chart-empty">กดสั่งสักออเดอร์ แล้วกราฟจะเริ่มโตที่นี่</div>
          )}
        </div>

        {insight && (
          <div className="jf-chart-card" style={{ marginTop: 14 }}>
            <div className="jf-chart-title">ใจของคุณบอกว่า…</div>
            <div className="jf-insight">
              <span className="jf-insight-emoji" aria-hidden="true">{insight.emoji}</span>
              <span>
                ช่วงที่รู้สึก<b>{insight.label}</b> การสั่งแบบใจฟูช่วยให้คุณโล่งขึ้น{" "}
                <b>{insight.pos}/{insight.total}</b> ครั้ง
              </span>
            </div>
          </div>
        )}

        {wantReal > 0 && (
          <div className="jf-care">
            <Heart size={15} fill="currentColor" />
            <span>มี {wantReal} ครั้งที่คุณยังอยากซื้อของจริงหลังกดสั่ง — ไม่เป็นไรเลยนะ ลองพักหายใจสักครู่ ถ้ายังอยากจริงๆ ค่อยตัดสินใจก็ได้</span>
          </div>
        )}

        <button className="jf-global-btn" onClick={goAdmin}>
          <TrendingUp size={16} /> ดูสถิติรวมของทุกคน
        </button>
        <div className="jf-anon-note">สถิติรวมเก็บแบบไม่ระบุตัวตน — เฉพาะยอดรวม เมนูยอดฮิต ช่วงเวลา วิธีจัดส่ง อารมณ์ก่อนสั่ง และความรู้สึกหลังสั่ง (นับเป็นภาพรวมเท่านั้น) ไม่มีการเก็บประวัติรายออเดอร์</div>

        <div style={{ height: 100 }} />
      </div>

      <div className="jf-bottom-actions">
        {/* mailto opens the mail client in place; an http form/LINE URL opens a new tab */}
        <a
          className="jf-cta ghost"
          href={FEEDBACK_URL}
          aria-label="ส่งความคิดเห็นถึงทีมงาน"
          {...(FEEDBACK_URL.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
        >
          <MessageCircle size={16} /> ติชม
        </a>
        <button className="jf-cta" onClick={again}><Home size={16} /> ช้อปต่อ</button>
      </div>
    </div>
  );
}

// Friendly Thai labels + display order for the small aggregate maps.
const METHOD_LABELS = [["instant", "ส่งทันที"], ["scheduled", "สั่งล่วงหน้า"], ["normal", "ส่งปกติ"]];
const MOOD_LABELS = [["stress", "เครียด"], ["bored", "เบื่อ"], ["sad", "เศร้า"], ["tired", "เหนื่อย"]];
const LIFT_LABELS = [["better", "โล่งขึ้น"], ["same", "เหมือนเดิม"], ["want", "ยังอยากซื้อจริง"]];

// Reuses the .jf-bars markup for any fixed-key count map. Math.max(1, …) floors
// the denominator so an all-zero or single-key map never divides by zero.
function CountBars({ data, labels }) {
  const rows = labels.map(([k, lbl]) => [lbl, (data && data[k]) || 0]);
  const max = Math.max(1, ...rows.map((r) => r[1]));
  if (!rows.some((r) => r[1] > 0)) return <div className="jf-chart-empty">ยังไม่มีข้อมูล</div>;
  return (
    <div className="jf-bars">
      {rows.map(([lbl, n]) => (
        <div key={lbl} className="jf-bar-item">
          <div className="jf-bar-label"><span>{lbl}</span><b>{n}</b></div>
          <div className="jf-bar-track">
            <div className="jf-bar-fill" style={{ width: (n / max) * 100 + "%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Admin({ g, refresh, back }) {
  const maxTop = g && g.top && g.top.length ? g.top[0][1] : 1;
  const maxHour = g && g.hours ? Math.max(1, ...g.hours) : 1;
  return (
    <div className="jf-screen">
      <div className="jf-detail-head between">
        <button className="jf-icon-btn" onClick={back} aria-label="ย้อนกลับ"><ChevronLeft size={22} /></button>
        <div className="jf-head-title">สถิติรวมทุกคน</div>
        <button className="jf-icon-btn" onClick={refresh} aria-label="รีเฟรชสถิติ"><RotateCcw size={17} /></button>
      </div>
      <div className="jf-detail-scroll">
        {!g || g.busy ? (
          <div className="jf-chart-empty">กำลังรวบรวมสถิติ…</div>
        ) : g.error ? (
          <div className="jf-care">
            <Heart size={15} fill="currentColor" />
            <span>ยังโหลดสถิติรวมไม่ได้ — เช็คอินเทอร์เน็ตแล้วลองกดรีเฟรชอีกครั้งนะ</span>
          </div>
        ) : (
          <>
            <div className="jf-stat-row">
              <div className="jf-stat-box">
                <div className="jf-stat-ic"><Heart size={18} /></div>
                <div className="jf-stat-n">{g.users}</div>
                <div className="jf-stat-l">ผู้ใช้ทั้งหมด</div>
              </div>
              <div className="jf-stat-box">
                <div className="jf-stat-ic"><ShoppingBag size={18} /></div>
                <div className="jf-stat-n">{g.totalOrders}</div>
                <div className="jf-stat-l">ครั้งที่กดสั่งรวม</div>
              </div>
              <div className="jf-stat-box">
                <div className="jf-stat-ic"><PiggyBank size={18} /></div>
                <div className="jf-stat-n" style={{ fontSize: 16 }}>{baht(g.savedAll)}</div>
                <div className="jf-stat-l">ออมรวมทุกคน</div>
              </div>
            </div>

            <div className="jf-chart-card">
              <div className="jf-chart-title">เมนู/ของยอดฮิต</div>
              {g.top.length === 0 ? (
                <div className="jf-chart-empty">ยังไม่มีข้อมูล — ชวนพี่ๆ มากดสั่งกันก่อน</div>
              ) : (
                <div className="jf-bars">
                  {g.top.map(([name, n]) => (
                    <div key={name} className="jf-bar-item">
                      <div className="jf-bar-label"><span>{name}</span><b>{n}</b></div>
                      <div className="jf-bar-track">
                        <div className="jf-bar-fill" style={{ width: (n / maxTop) * 100 + "%" }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="jf-chart-card" style={{ marginTop: 14 }}>
              <div className="jf-chart-title">ช่วงเวลาที่คนเข้ามาฟิน</div>
              <div className="jf-hours">
                {g.hours.map((n, h) => (
                  <div key={h} className="jf-hour-col" title={h + ":00 — " + n + " ครั้ง"}>
                    <div className="jf-hour-bar" style={{ height: Math.max(4, (n / maxHour) * 56) + "px", opacity: n ? 1 : 0.25 }} />
                    {h % 6 === 0 && <div className="jf-hour-lbl">{h}</div>}
                  </div>
                ))}
              </div>
            </div>

            <div className="jf-chart-card" style={{ marginTop: 14 }}>
              <div className="jf-chart-title">วิธีจัดส่งที่เลือก</div>
              <CountBars data={g.methods} labels={METHOD_LABELS} />
            </div>

            <div className="jf-chart-card" style={{ marginTop: 14 }}>
              <div className="jf-chart-title">อารมณ์ก่อนสั่ง</div>
              <CountBars data={g.moods} labels={MOOD_LABELS} />
            </div>

            <div className="jf-chart-card" style={{ marginTop: 14 }}>
              <div className="jf-chart-title">ความรู้สึกหลังสั่ง</div>
              <CountBars data={g.lifts} labels={LIFT_LABELS} />
            </div>
          </>
        )}
        <div style={{ height: 30 }} />
      </div>
    </div>
  );
}

/* ---------------- styles ---------------- */
const CSS = `
html,body{ margin:0; padding:0; height:100%; }
#root{ height:100%; }
.jf-root{
  --bg:#F1F6FC; --ink:#1C2A44; --muted:#5B6B84; --line:#E2E9F2;
  --coral:#3B7DD8; --coral-d:#2A63B8; --sage:#C9711A; --sage-text:#8F5210;
  --sage-l:#FCEBDC; --butter:#F7B955; --card:#FFFFFF;
  font-family:'Sarabun',system-ui,sans-serif;
  display:flex; justify-content:center; align-items:flex-start;
  padding:20px 12px; color:var(--ink);
  background:radial-gradient(120% 90% at 50% 0%, #FFFFFF 0%, #E2ECF8 100%);
  min-height:100%;
}
.jf-phone{
  width:100%; max-width:390px; height:720px; max-height:86vh;
  background:var(--bg); border-radius:30px; overflow:hidden; position:relative;
  box-shadow:0 24px 60px -18px rgba(28,42,68,.32), 0 0 0 1px rgba(28,42,68,.04);
  display:flex; flex-direction:column;
}
.jf-screen{ position:absolute; inset:0; display:flex; flex-direction:column; animation:fade .35s ease; }
.jf-center{ align-items:center; justify-content:center; text-align:center; }
.jf-pad{ padding:26px; }
*{ box-sizing:border-box; }
button{ font-family:inherit; cursor:pointer; border:none; background:none; color:inherit; }
button[disabled]{ opacity:.45; pointer-events:none; }

.jf-logo{ font-family:'Mitr'; font-weight:600; font-size:26px; color:var(--coral-d);
  display:flex; align-items:center; gap:7px; }
.jf-logo.sm{ font-size:18px; }

/* mood */
.jf-mood-title{ font-family:'Mitr'; font-weight:500; font-size:22px; margin-top:26px; }
.jf-mood-sub{ color:var(--muted); font-size:13.5px; margin-top:8px; max-width:240px; line-height:1.5; }
.jf-mood-grid{ display:grid; grid-template-columns:1fr 1fr; gap:13px; margin-top:30px; width:100%; }
.jf-mood-card{ background:var(--card); border-radius:20px; padding:22px 10px;
  display:flex; flex-direction:column; align-items:center; gap:10px; font-size:15px; font-weight:500;
  box-shadow:0 6px 16px -10px rgba(28,42,68,.25); animation:rise .5s both; transition:transform .15s; }
.jf-mood-card:active{ transform:scale(.95); }
.jf-mood-emoji{ font-size:38px; }
.jf-mood-foot{ margin-top:30px; color:var(--muted); font-size:13px; }

/* top + tabs */
.jf-top{ padding:18px 18px 0; }
.jf-top-row{ display:flex; align-items:center; justify-content:space-between; }
.jf-jar-pill{ display:flex; align-items:center; gap:6px; background:var(--sage-l); color:var(--sage-text);
  font-weight:600; font-size:13.5px; padding:7px 13px; border-radius:99px; }
.jf-tabs{ display:flex; gap:8px; margin-top:16px; }
.jf-tab{ flex:1; display:flex; align-items:center; justify-content:center; gap:6px;
  padding:11px; border-radius:14px; font-weight:500; font-size:14.5px; color:var(--muted);
  background:transparent; transition:all .2s; }
.jf-tab.on{ background:var(--ink); color:#fff; }

/* feed */
.jf-feed{ flex:1; overflow-y:auto; padding:14px 18px 0; }
.jf-banner{ background:linear-gradient(100deg,#EAF2FC,#DDE9F8); border-radius:16px; padding:12px 14px;
  display:flex; align-items:center; gap:9px; font-size:12.5px; color:var(--coral-d); line-height:1.4;
  margin-bottom:14px; }
.jf-grid{ display:grid; grid-template-columns:1fr 1fr; gap:13px; }
.jf-card{ background:var(--card); border-radius:20px; padding:14px; text-align:left;
  box-shadow:0 6px 18px -12px rgba(28,42,68,.3); animation:rise .45s both; transition:transform .15s; }
.jf-card:active{ transform:scale(.96); }
.jf-card-img{ font-size:46px; text-align:center; padding:6px 0 10px; }
.jf-card-name{ font-weight:600; font-size:14.5px; line-height:1.25; }
.jf-card-shop{ color:var(--muted); font-size:11.5px; margin-top:2px; }
.jf-card-row{ display:flex; align-items:center; justify-content:space-between; margin-top:10px; }
.jf-price{ font-family:'Mitr'; font-weight:500; color:var(--coral-d); font-size:15px; }
.jf-add{ background:var(--coral); color:#fff; width:30px; height:30px; border-radius:11px;
  display:flex; align-items:center; justify-content:center; }

/* cart bar */
.jf-cartbar{ position:absolute; left:14px; right:14px; bottom:14px;
  background:var(--ink); color:#fff; border-radius:18px; padding:15px 18px;
  display:flex; align-items:center; justify-content:space-between; font-weight:500; font-size:14.5px;
  box-shadow:0 12px 28px -10px rgba(28,42,68,.5); animation:slideUp .3s ease; }
.jf-cartbar-l{ display:flex; align-items:center; gap:8px; }
.jf-cartbar.pop{ animation:cartpop .55s; }

/* detail */
.jf-detail-head{ padding:14px 12px; display:flex; align-items:center; }
.jf-detail-head.between{ justify-content:space-between; }
.jf-head-title{ font-family:'Mitr'; font-weight:500; font-size:17px; }
.jf-icon-btn{ width:40px; height:40px; border-radius:12px; background:var(--card);
  display:flex; align-items:center; justify-content:center; box-shadow:0 4px 10px -6px rgba(0,0,0,.2); }
.jf-detail-scroll{ flex:1; overflow-y:auto; padding:0 20px; }
.jf-detail-hero{ font-size:90px; text-align:center; padding:10px 0; }
.jf-detail-name{ font-family:'Mitr'; font-weight:500; font-size:23px; text-align:center; }
.jf-detail-shop{ color:var(--muted); font-size:13px; text-align:center; margin-top:3px; }
.jf-detail-price{ font-family:'Mitr'; color:var(--coral-d); font-size:20px; text-align:center; margin:8px 0 18px; }
.jf-group{ margin-bottom:18px; }
.jf-group-label{ font-weight:600; font-size:14.5px; margin-bottom:10px; }
.jf-opt-hint{ color:var(--muted); font-weight:400; font-size:12px; }
.jf-chips{ display:flex; flex-wrap:wrap; gap:9px; }
.jf-chip{ padding:9px 15px; border-radius:13px; background:var(--card); font-size:13.5px; font-weight:500;
  box-shadow:inset 0 0 0 1.5px var(--line); transition:all .15s; }
.jf-chip.on{ background:var(--coral); color:#fff; box-shadow:none; }
.jf-chip-add{ opacity:.8; font-size:12px; }

/* CTA */
.jf-cta{ position:absolute; left:18px; right:18px; bottom:16px; background:var(--coral); color:#fff;
  border-radius:18px; padding:16px; font-family:'Mitr'; font-weight:500; font-size:16px;
  display:flex; align-items:center; justify-content:center; gap:8px; text-decoration:none;
  box-shadow:0 12px 26px -10px rgba(59,125,216,.7); transition:transform .12s; }
.jf-cta:active{ transform:scale(.97); }
.jf-cta.order{ background:var(--ink); box-shadow:0 12px 26px -10px rgba(28,42,68,.6); }
.jf-cta.ghost{ position:static; flex:1; background:var(--card); color:var(--ink);
  box-shadow:inset 0 0 0 1.5px var(--line); }

/* cart items */
.jf-cart-item{ display:flex; align-items:center; gap:12px; background:var(--card); border-radius:16px;
  padding:12px 14px; margin-bottom:11px; box-shadow:0 5px 14px -10px rgba(0,0,0,.2); }
.jf-cart-emoji{ font-size:30px; }
.jf-cart-mid{ flex:1; }
.jf-cart-name{ font-weight:600; font-size:14px; }
.jf-cart-shop{ color:var(--muted); font-size:11.5px; }
.jf-cart-price{ font-family:'Mitr'; color:var(--coral-d); font-size:14.5px; }
.jf-remove{ width:44px; height:44px; border-radius:14px; background:#E8F0FB; color:var(--coral-d);
  display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.jf-cart-note{ display:flex; gap:8px; align-items:flex-start; background:var(--sage-l); color:var(--sage-text);
  border-radius:14px; padding:12px 14px; font-size:12.5px; line-height:1.5; margin-top:6px; }

/* delivery selector (cart) */
.jf-deliv-group{ margin-top:18px; }
.jf-deliv-chips{ flex-direction:column; gap:9px; }
.jf-deliv-chip{ display:flex; align-items:center; gap:10px; width:100%; padding:13px 15px; text-align:left; }
.jf-deliv-emoji{ font-size:20px; }
.jf-deliv-main{ flex:1; }
.jf-deliv-chip .jf-chip-add{ opacity:.9; font-weight:600; }
.jf-deliv-chip.on .jf-chip-add{ opacity:1; }
.jf-deliv-note{ color:var(--muted); font-size:12px; margin-top:8px; }
.jf-deliv-fee{ color:var(--sage-text); font-size:12px; margin-top:8px; }
.jf-slot-wrap{ margin-top:16px; }

/* feed delivery pill (coexists above the cart bar) */
.jf-deliv-pill{ position:absolute; left:14px; right:14px; bottom:14px;
  background:var(--sage); color:#fff; border-radius:16px; padding:13px 16px;
  display:flex; align-items:center; justify-content:space-between; font-weight:600; font-size:13.5px;
  box-shadow:0 12px 28px -12px rgba(143,82,16,.55); animation:slideUp .3s ease; }
.jf-deliv-pill-l{ display:flex; align-items:center; gap:8px; }
.jf-deliv-pill-time{ font-family:'Mitr'; font-variant-numeric:tabular-nums; }
.jf-feed-has-deliv .jf-cartbar{ bottom:72px; }

/* ordering + breathe */
.jf-order-bubble{ width:108px; height:108px; border-radius:50%; background:var(--card); color:var(--coral-d);
  display:flex; align-items:center; justify-content:center; box-shadow:0 14px 30px -12px rgba(59,125,216,.5);
  animation:bob 1.4s ease-in-out infinite; }
.jf-breathe-bubble{ animation:breathe 4s ease-in-out infinite; }
.jf-breathe-bubble.done{ animation:none; background:var(--sage-l); color:var(--sage-text); }
.jf-breathe-phase{ color:var(--coral-d); font-size:13.5px; margin-top:16px; font-weight:600; }
.jf-order-label{ font-family:'Mitr'; font-weight:500; font-size:19px; margin-top:24px; }
.jf-progress{ width:80%; height:7px; border-radius:99px; background:#EFE3DA; margin-top:20px; overflow:hidden; }
.jf-progress-fill{ height:100%; background:var(--coral); border-radius:99px; transition:width .9s ease; }
.jf-order-steps{ display:flex; gap:12px; margin-top:22px; }
.jf-step-dot{ width:26px; height:26px; border-radius:50%; background:#EFE3DA; color:var(--muted);
  display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:600; transition:all .3s; }
.jf-step-dot.done{ background:var(--sage); color:#fff; }
.jf-order-hint{ color:var(--muted); font-size:13px; margin-top:24px; }

/* track (live delivery countdown). .jf-order-bubble.jf-track-done is qualified
   so the arrived state wins over .jf-order-bubble's bob regardless of order. */
.jf-order-bubble.jf-track-done{ animation:none; background:var(--sage-l); color:var(--sage-text); }
.jf-track-clock{ font-family:'Mitr'; font-weight:600; font-size:46px; color:var(--coral-d);
  margin-top:14px; font-variant-numeric:tabular-nums; }
.jf-track-sub{ color:var(--muted); font-size:13.5px; margin-top:6px; max-width:280px; line-height:1.5; }
.jf-track-line{ color:var(--ink); font-size:14px; font-weight:600; margin-top:16px; }
.jf-track-reason{ display:flex; gap:8px; align-items:center; justify-content:center; background:var(--sage-l);
  color:var(--sage-text); border-radius:14px; padding:11px 14px; font-size:12.5px; margin-top:16px;
  max-width:300px; line-height:1.5; }
.jf-track-jar{ color:var(--sage-text); font-size:12px; margin-top:14px; max-width:280px; line-height:1.5; }

/* reveal */
.jf-reveal-burst{ animation:pop .5s; }
.jf-jar-wrap{ position:relative; color:var(--sage); }
.jf-coin{ position:absolute; top:-6px; font-family:'Mitr'; font-weight:600; color:var(--butter);
  font-size:18px; animation:coin .9s ease-in forwards; }
.jf-reveal-amount{ font-family:'Mitr'; font-weight:600; font-size:40px; color:var(--sage); margin-top:14px; }
.jf-reveal-title{ font-family:'Mitr'; font-weight:500; font-size:21px; margin-top:2px; }
.jf-reveal-sub{ color:var(--muted); font-size:13.5px; line-height:1.6; margin-top:12px; max-width:280px; }
.jf-reveal-sub b{ color:var(--sage-text); }
.jf-after-q{ font-weight:600; font-size:14.5px; margin-top:26px; }
.jf-after-row{ display:flex; gap:9px; margin-top:14px; }
.jf-after-btn{ background:var(--card); border-radius:16px; padding:14px 10px; flex:1;
  display:flex; flex-direction:column; align-items:center; gap:7px; font-size:12.5px; font-weight:500;
  box-shadow:0 6px 16px -11px rgba(0,0,0,.25); transition:transform .12s; }
.jf-after-btn:active{ transform:scale(.94); }
.jf-after-emoji{ font-size:30px; }

/* stats */
.jf-jar-hero{ background:linear-gradient(135deg,#FDEEDF,#FBE0C7); border-radius:24px; padding:26px 20px;
  text-align:center; margin:6px 0 16px; }
.jf-jar-icon{ color:var(--sage); display:flex; justify-content:center; }
.jf-jar-amount{ font-family:'Mitr'; font-weight:600; font-size:36px; color:var(--sage); margin-top:6px; }
.jf-jar-cap{ color:var(--sage-text); font-size:12.5px; margin-top:4px; line-height:1.5; }
.jf-stat-row{ display:flex; gap:11px; margin-bottom:16px; }
.jf-stat-box{ flex:1; background:var(--card); border-radius:18px; padding:15px 8px; text-align:center;
  box-shadow:0 6px 16px -12px rgba(0,0,0,.2); }
.jf-stat-ic{ color:var(--coral-d); display:flex; justify-content:center; margin-bottom:6px; }
.jf-stat-n{ font-family:'Mitr'; font-weight:600; font-size:21px; }
.jf-stat-l{ color:var(--muted); font-size:11px; margin-top:2px; }
.jf-chart-card{ background:var(--card); border-radius:20px; padding:16px 12px 8px;
  box-shadow:0 6px 18px -13px rgba(0,0,0,.22); }
.jf-chart-title{ font-weight:600; font-size:14px; padding:0 6px 6px; }
.jf-chart-empty{ color:var(--muted); font-size:13px; text-align:center; padding:30px 10px; }
.jf-insight{ display:flex; gap:10px; align-items:center; padding:6px 6px 12px; font-size:13.5px; line-height:1.5; }
.jf-insight-emoji{ font-size:30px; }
.jf-insight b{ color:var(--coral-d); }
.jf-care{ display:flex; gap:9px; align-items:flex-start; background:var(--sage-l); color:var(--sage-text);
  border-radius:16px; padding:13px 15px; font-size:12.5px; line-height:1.55; margin-top:14px; }
.jf-bottom-actions{ position:absolute; left:16px; right:16px; bottom:16px; display:flex; gap:11px; }
.jf-bottom-actions .jf-cta{ position:static; flex:1; }

.jf-global-btn{ width:100%; display:flex; align-items:center; justify-content:center; gap:8px;
  background:var(--card); color:var(--coral-d); font-weight:600; font-size:14px;
  border-radius:16px; padding:14px; margin-top:14px;
  box-shadow:inset 0 0 0 1.5px var(--line); transition:transform .12s; }
.jf-global-btn:active{ transform:scale(.97); }
.jf-anon-note{ color:var(--muted); font-size:11px; text-align:center; margin-top:8px; line-height:1.5; }
.jf-track-entry{ width:100%; display:flex; align-items:center; justify-content:space-between;
  background:var(--sage-l); color:var(--sage-text); font-weight:600; font-size:13.5px;
  border-radius:16px; padding:14px 16px; margin:0 0 14px;
  box-shadow:inset 0 0 0 1.5px var(--line); transition:transform .12s; }
.jf-track-entry:active{ transform:scale(.98); }
.jf-track-entry-l{ display:flex; align-items:center; gap:8px; }
.jf-bars{ padding:4px 6px 8px; display:flex; flex-direction:column; gap:11px; }
.jf-bar-item{ display:flex; flex-direction:column; gap:5px; }
.jf-bar-label{ display:flex; justify-content:space-between; font-size:13px; }
.jf-bar-label b{ color:var(--coral-d); }
.jf-bar-track{ height:9px; border-radius:99px; background:var(--line); overflow:hidden; }
.jf-bar-fill{ height:100%; border-radius:99px; background:linear-gradient(90deg,var(--coral),var(--coral-d)); }
.jf-hours{ display:flex; align-items:flex-end; gap:3px; padding:10px 6px 4px; height:84px; }
.jf-hour-col{ flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; gap:3px; }
.jf-hour-bar{ width:100%; border-radius:3px 3px 0 0; background:var(--coral); }
.jf-hour-lbl{ font-size:9px; color:var(--muted); }

/* On real phones, drop the phone-in-phone frame: full dynamic viewport,
   no nested page scroll, CTAs clear of the iOS Safari toolbar. */
@media (max-width: 520px){
  .jf-root{ padding:0; }
  .jf-phone{ max-width:none; height:100vh; height:100dvh; max-height:none;
    border-radius:0; box-shadow:none; }
  .jf-cta{ bottom:calc(16px + env(safe-area-inset-bottom)); }
  .jf-cartbar{ bottom:calc(14px + env(safe-area-inset-bottom)); }
  .jf-bottom-actions{ bottom:calc(16px + env(safe-area-inset-bottom)); }
  .jf-deliv-pill{ bottom:calc(14px + env(safe-area-inset-bottom)); }
  .jf-feed-has-deliv .jf-cartbar{ bottom:calc(72px + env(safe-area-inset-bottom)); }
}

@keyframes fade{ from{opacity:0} to{opacity:1} }
@keyframes rise{ from{opacity:0; transform:translateY(10px)} to{opacity:1; transform:translateY(0)} }
@keyframes slideUp{ from{transform:translateY(80px)} to{transform:translateY(0)} }
@keyframes pop{ 0%{transform:scale(.6); opacity:0} 60%{transform:scale(1.12)} 100%{transform:scale(1); opacity:1} }
@keyframes cartpop{ 0%,100%{transform:scale(1)} 40%{transform:scale(1.04)} }
@keyframes bob{ 0%,100%{transform:translateY(0)} 50%{transform:translateY(-9px)} }
@keyframes breathe{ 0%,100%{transform:scale(.82)} 50%{transform:scale(1.08)} }
@keyframes coin{ 0%{transform:translateY(-30px); opacity:0} 30%{opacity:1} 100%{transform:translateY(46px); opacity:0} }
@media (prefers-reduced-motion: reduce){ *{ animation:none !important; transition:none !important; } }
`;
