import React, { useEffect, useRef, useState } from "react";
import {
  Heart, ShoppingBag, Utensils, Plus, X, ChevronLeft,
  Check, PiggyBank, Home, Sparkles, TrendingUp, Flame, Bike,
  Package, ChefHat, RotateCcw, MessageCircle, Wind,
  MapPin, Trash2, Crown, Ticket,
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
  { id: "f9", emoji: "🍜", name: "ก๋วยเตี๋ยวต้มยำ", price: 50, shop: "เรือทองรสเด็ด" },
  { id: "f10", emoji: "🍢", name: "ลูกชิ้นปิ้งจิ้มแจ่ว", price: 35, shop: "ป้านิดหน้าปากซอย" },
  { id: "f11", emoji: "🥟", name: "ติ่มซำนึ่งร้อน", price: 89, shop: "ติ่มซำเฮียจู" },
  { id: "f12", emoji: "🍛", name: "ข้าวหมูแดงหมูกรอบ", price: 60, shop: "นายหมงข้าวหมูแดง" },
  { id: "f13", emoji: "🌮", name: "ทาโก้เนื้อสับ", price: 129, shop: "Amigo Cantina" },
  { id: "f14", emoji: "🍔", name: "เบอร์เกอร์เนื้อชีส", price: 169, shop: "Burger Bro" },
  { id: "f15", emoji: "🍤", name: "ผัดไทยกุ้งสด", price: 75, shop: "ผัดไทยประตูผี" },
  { id: "f16", emoji: "🍲", name: "ต้มแซ่บกระดูกอ่อน", price: 95, shop: "ครัวอีสานบ้านนา" },
  { id: "f17", emoji: "🍰", name: "เค้กช็อกโกแลตลาวา", price: 145, shop: "อบอุ่นเบเกอรี่" },
  { id: "f18", emoji: "☕", name: "ลาเต้เย็นคั่วกลาง", price: 65, shop: "มุมกาแฟละมุน" },
  { id: "f19", emoji: "🍱", name: "ข้าวหน้าปลาไหลย่าง", price: 289, shop: "อูนางิยะ" },
  { id: "f20", emoji: "🦞", name: "ซีฟู้ดเซ็ตรวมมิตร", price: 420, shop: "ทะเลเผาเฮียอ้วน" },
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
  { id: "s9", emoji: "📚", name: "สมุดโน้ตปกหนัง", price: 290, shop: "ร้านเครื่องเขียนใจดี" },
  { id: "s10", emoji: "🧴", name: "เซรั่มบำรุงผิวหน้า", price: 690, shop: "Glow Skin" },
  { id: "s11", emoji: "🧦", name: "ถุงเท้าคอตตอนเซ็ต 5 คู่", price: 199, shop: "Daily Basics" },
  { id: "s12", emoji: "⌨️", name: "คีย์บอร์ดไร้สาย", price: 1590, shop: "Gadget Hub" },
  { id: "s13", emoji: "🧥", name: "เสื้อแจ็คเก็ตกันลม", price: 1290, shop: "Urban Wear" },
  { id: "s14", emoji: "🍳", name: "กระทะเซรามิกไม่ติด", price: 790, shop: "ครัวสุขใจ" },
  { id: "s15", emoji: "🧸", name: "ตุ๊กตาหมีนุ่มนิ่ม", price: 490, shop: "Huggy Toys" },
  { id: "s16", emoji: "💡", name: "โคมไฟอ่านหนังสือ", price: 650, shop: "Light & Living" },
  { id: "s17", emoji: "🎮", name: "จอยเกมไร้สาย", price: 1790, shop: "Play Zone" },
  { id: "s18", emoji: "🧳", name: "กระเป๋าเดินทางล้อลาก", price: 2890, shop: "Wander Luggage" },
  { id: "s19", emoji: "📷", name: "กล้องฟิล์มเรโทร", price: 4990, shop: "Retro Cam" },
  { id: "s20", emoji: "🪑", name: "เก้าอี้ทำงานเพื่อสุขภาพ", price: 3490, shop: "ErgoLife" },
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

// Luxury — aspirational "น่าฝัน" goods. Prices are dramatic on purpose; the jar
// still catches every baht, and the daily-cap breathe interstitial still applies.
const LUX = [
  { id: "lx1", emoji: "👜", name: "กระเป๋าแบรนด์เนมรุ่นลิมิเต็ด", price: 25000, shop: "Luxury Haven" },
  { id: "lx2", emoji: "⌚", name: "นาฬิกาสวิสเรือนทอง", price: 180000, shop: "Chronograph Vault" },
  { id: "lx3", emoji: "💎", name: "แหวนเพชรแท้ครึ่งกะรัต", price: 150000, shop: "Gemstone Gallery" },
  { id: "lx4", emoji: "👓", name: "แว่นตาดีไซเนอร์รุ่นพรีเมียม", price: 35000, shop: "Shades Elite" },
  { id: "lx5", emoji: "🎧", name: "หูฟังไฮเอนด์ระดับออดิโอไฟล์", price: 45000, shop: "Audio Temple" },
  { id: "lx6", emoji: "📱", name: "สมาร์ตโฟนเรือธงรุ่นล่าสุด", price: 65000, shop: "Tech Kingdom" },
  { id: "lx7", emoji: "👛", name: "กระเป๋าถือคอลเลกชันโอตกูตูร์", price: 420000, shop: "Haute Couture Boutique" },
  { id: "lx8", emoji: "✈️", name: "ตั๋วเครื่องบินชั้นธุรกิจไปยุโรป", price: 280000, shop: "Jet Setter" },
  { id: "lx9", emoji: "💍", name: "แหวนทองคำแท้ลายโบราณ", price: 55000, shop: "Golden Circle" },
  { id: "lx10", emoji: "🚗", name: "ประสบการณ์ขับรถซูเปอร์คาร์หนึ่งวัน", price: 1500000, shop: "Exotic Motors" },
];

const LUX_CUSTOM = [
  { key: "color", label: "สี", choices: [
    { id: "bk", label: "ดำคลาสสิก", add: 0 },
    { id: "cr", label: "ครีมนวล", add: 0 },
    { id: "tl", label: "ทองคำอ่อน", add: 0 },
    { id: "rg", label: "โรสโกลด์", add: 2000 },
    { id: "bl", label: "น้ำเงินเข้ม", add: 3000 },
  ]},
  { key: "engrave", label: "สลักชื่อ / สลักลาย", multi: true, choices: [
    { id: "init", label: "สลักอักษรย่อ (1-3 ตัว)", add: 1500 },
    { id: "custom", label: "สลักข้อความสั้น (ถึง 50 ตัว)", add: 3500 },
    { id: "symbol", label: "สลักสัญลักษณ์หรือลวดลาย", add: 2000 },
  ]},
  { key: "box", label: "กล่องของขวัญ / แพ็กเกจ", choices: [
    { id: "std", label: "กล่องมาตรฐาน", add: 0 },
    { id: "lux", label: "กล่องของขวัญหรูหรา (มีริบบิ้น)", add: 500 },
    { id: "cert", label: "เพิ่มใบรับรองความแท้ / ที่ระลึก", add: 800 },
  ]},
  { key: "insure", label: "ความคุ้มครอง (สมมติ)", choices: [
    { id: "no", label: "ไม่ต้อง", add: 0 },
    { id: "basic", label: "ประกัน 1 ปี (ฟรี)", add: 0 },
    { id: "plus", label: "ประกัน 3 ปี + ส่วนเสริม", add: 5000 },
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

// Data-driven category registry — one source of truth for the feed tabs, the
// item/customization lookup, and the kind stamp. Adding a category here wires up
// the whole feed (no more food/shop binary branching). stepsKey picks the
// delivery ritual; luxury reuses the shop "package" journey.
const CATEGORIES = [
  { id: "food", label: "อาหาร",    icon: Utensils,    items: FOOD, custom: FOOD_CUSTOM, stepsKey: "food" },
  { id: "shop", label: "ช้อปปิ้ง", icon: ShoppingBag, items: SHOP, custom: SHOP_CUSTOM, stepsKey: "shop" },
  { id: "lux",  label: "ลักชูรี่",  icon: Crown,       items: LUX,  custom: LUX_CUSTOM,  stepsKey: "shop" },
];
const STEPS_MAP = { food: ORDER_STEPS_FOOD, shop: ORDER_STEPS_SHOP };

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

/* -------- discount codes (collect into a local wallet; apply ONE at checkout) --------
   Pure theater like everything else: the discount only shrinks the would-be jar
   amount, never a real charge. Catalog is an immutable const (like FOOD/SHOP).
   Codes are REUSABLE while their window is open — no one-time consume (kindest UX,
   and it sidesteps the "consume only at commit" trap; the DAILY_CAP is the real
   friction gate). me.discountWallet only remembers WHICH codes you've collected;
   validity + amount are recomputed live from this catalog every time.

   window:
     null                                → always-on
     { type:"daily", hStart, hEnd }      → recurs every day, LOCAL hours; supports
                                           across-midnight (hStart > hEnd, e.g. 22→02)
     { type:"absolute", startMs, endMs } → fixed epoch-ms range [start, end)
   kind: "percent" (value = %) | "baht" (value = flat ฿). maxDiscount caps percent. */
// A broad current campaign window for the absolute-date demo codes, so they are
// live now and for ~a year (2026-05-01 → 2027-05-01, local-ish UTC anchors).
const CAMPAIGN_START = Date.UTC(2026, 4, 1);   // 1 May 2026
const CAMPAIGN_END = Date.UTC(2027, 4, 1);     // 1 May 2027
const DISCOUNT_CODES = [
  // --- always-on ---
  { id: "dc_welcome", code: "ใจฟู10",  kind: "percent", value: 10, minSpend: 0,   maxDiscount: 50,
    emoji: "💛", label: "ลด 10% ต้อนรับใจฟู",          secret: false, window: null },
  { id: "dc_flat20",  code: "ลด20",    kind: "baht",    value: 20, minSpend: 100, maxDiscount: null,
    emoji: "🎟️", label: "ลด 20 บาท เมื่อยอดถึง ฿100",  secret: false, window: null },
  { id: "dc_big15",   code: "จัดเต็ม15", kind: "percent", value: 15, minSpend: 300, maxDiscount: 150,
    emoji: "🛍️", label: "ลด 15% เมื่อช้อปครบ ฿300",    secret: false, window: null },

  // --- daily-hour-windowed ---
  { id: "dc_morning", code: "อรุณสวัสดิ์", kind: "percent", value: 12, minSpend: 0,  maxDiscount: 60,
    emoji: "☀️", label: "เช้านี้ลด 12% (06:00–09:00)", secret: false,
    window: { type: "daily", hStart: 6,  hEnd: 9  } },
  { id: "dc_lunch",   code: "มื้อเที่ยง", kind: "baht",    value: 25, minSpend: 80,  maxDiscount: null,
    emoji: "🍜", label: "เที่ยงนี้ลด 25 บาท (11:00–13:00)", secret: false,
    window: { type: "daily", hStart: 11, hEnd: 13 } },
  { id: "dc_night",   code: "ราตรีสวัสดิ์", kind: "percent", value: 18, minSpend: 100, maxDiscount: 120,
    emoji: "🌙", label: "กลางคืนลด 18% (20:00–23:00)", secret: false,
    window: { type: "daily", hStart: 20, hEnd: 23 } },
  { id: "dc_owl",     code: "นกฮูก",     kind: "baht",    value: 30, minSpend: 50,  maxDiscount: null,
    emoji: "🦉", label: "สายดึกลด 30 บาท (22:00–02:00)", secret: false,
    window: { type: "daily", hStart: 22, hEnd: 2  } }, // across-midnight: hStart > hEnd

  // --- absolute-date-windowed ---
  { id: "dc_payday",  code: "เงินเดือนออก", kind: "percent", value: 25, minSpend: 200, maxDiscount: 250,
    emoji: "💸", label: "ช่วงเงินเดือนออก ลด 25%", secret: false,
    window: { type: "absolute", startMs: CAMPAIGN_START, endMs: CAMPAIGN_END } },
  { id: "dc_bday",    code: "สุขสันต์วันเกิด", kind: "percent", value: 50, minSpend: 300, maxDiscount: 500,
    emoji: "🎂", label: "ฉลองครบรอบใจฟู ลด 50%!", secret: false,
    window: { type: "absolute", startMs: CAMPAIGN_START, endMs: CAMPAIGN_END } },

  // --- secret (manual-entry only; never listed in deals) ---
  { id: "dc_vip",     code: "วีไอพีลับ", kind: "percent", value: 30, minSpend: 0,   maxDiscount: 400,
    emoji: "👑", label: "โค้ดลับ VIP ลด 30%",       secret: true,  window: null },
  { id: "dc_friend",  code: "เพื่อนชวน", kind: "baht",    value: 99, minSpend: 500, maxDiscount: null,
    emoji: "👯", label: "โค้ดลับเพื่อนชวน ลด 99 บาท", secret: true,  window: null },
];

// Live validity of a code's window (LOCAL time, mirroring makeSlots/dayKey).
// Across-midnight daily windows use OR, not AND.
const isCodeValid = (code, now = Date.now()) => {
  const w = code.window;
  if (!w) return true;                          // always-on
  if (w.type === "absolute") return now >= w.startMs && now < w.endMs;
  if (w.type === "daily") {
    const h = new Date(now).getHours();
    return w.hStart <= w.hEnd
      ? (h >= w.hStart && h < w.hEnd)            // same-day window
      : (h >= w.hStart || h < w.hEnd);           // across-midnight (e.g. 22→02)
  }
  return false;                                 // unknown type → invalid
};

// The integer-baht discount a code yields against a base. 0 when minSpend isn't
// met. Percent is rounded then capped by maxDiscount; both kinds are clamped so
// the discount never exceeds base (a ฿99 code on a ฿55 order → jar 0, not −44).
const discountFor = (code, base) => {
  if (!code || base < (code.minSpend || 0)) return 0;
  let d = code.kind === "percent" ? Math.round((base * code.value) / 100) : code.value;
  if (code.kind === "percent" && code.maxDiscount != null) d = Math.min(d, code.maxDiscount);
  return Math.max(0, Math.min(d, base));
};

const findCodeById = (id) => DISCOUNT_CODES.find((c) => c.id === id) || null;
// Manual entry: case/space-insensitive match on the typed string (Thai or latin).
const findCodeByTyped = (s) => {
  const t = (s || "").trim().replace(/\s+/g, "").toLowerCase();
  if (!t) return null;
  return DISCOUNT_CODES.find((c) => c.code.replace(/\s+/g, "").toLowerCase() === t) || null;
};

/* -------- payment methods (chosen on the checkout screen) --------
   Pure theater: every path lands the would-be spend in the jar; none charges. */
const PAYMENT_METHODS = [
  { id: "cod",      emoji: "🚪", label: "ชำระเงินปลายทาง", note: "จ่ายตอนของถึง — แต่ของไม่ได้มาจริง ก็เลยไม่ต้องจ่ายจริงด้วยนะ 💛" },
  { id: "transfer", emoji: "🏦", label: "โอนเงิน",          note: "แนบสลิปก็ได้ ไม่แนบก็ได้ เราไม่ได้เอาไปใช้จริงอยู่แล้ว" },
  { id: "card",     emoji: "💳", label: "บัตรเครดิต",        note: "กรอกเล่นๆ ได้เลย ไม่มีการตัดเงิน ไม่มีการส่งข้อมูลไปไหน" },
  { id: "bless",    emoji: "🙏", label: "ขอพรจากฟ้า",        note: "ปล่อยให้ฟ้าตัดสิน วันนี้ฟ้าจะเปิดให้ไหมนะ ☁️" },
];

// "ขอพรจากฟ้า" grants 70% of the time. A deny is occasional comic relief, never
// a wall — and (critically) has ZERO side effects (see proceedBless/placeOrder).
const BLESSING_GRANT_P = 0.7;
const BLESS_DENY = [
  "ฟ้ายังไม่เปิด ☁️ วันนี้เมฆเยอะหน่อย ลองเลือกวิธีอื่นดูไหม",
  "ฟ้าขอคิดดูก่อนนะ 🌥️ ระหว่างนี้เลือกวิธีอื่นไปพลางๆ ก็ได้",
  "เทวดาติดประชุมอยู่ 🙏 เดี๋ยวค่อยมาขอใหม่ หรือเลือกวิธีอื่นก่อนก็ได้",
  "พรหล่นหายระหว่างทางนิดนึง ☁️ ไม่เป็นไรนะ ลองทางอื่นดูก่อน",
];

// Spin-wheel segments for "ขอพรจากฟ้า". The wheel is theatre over the 70% roll:
// the grant/deny is decided first, then the pointer lands on a random matching
// segment so the visual always agrees with the outcome. 8 slices alternate
// win/lose with playful Thai labels; `win` flags which slices count as a grant.
const WHEEL_SEGMENTS = [
  { label: "ฟ้าเปิดทาง", emoji: "🌈", win: true,  color: "#3B7DD8" },
  { label: "เมฆบังนิดนึง", emoji: "☁️", win: false, color: "#9AB4D6" },
  { label: "พรเต็มคำ",   emoji: "✨", win: true,  color: "#C9711A" },
  { label: "เทวดาหลับ",   emoji: "😴", win: false, color: "#B0BEC5" },
  { label: "โชคหล่นใส่",  emoji: "🍀", win: true,  color: "#5BA86F" },
  { label: "ลองใหม่นะ",   emoji: "🌥️", win: false, color: "#A7B6C2" },
  { label: "ฟ้าใจดี",     emoji: "💛", win: true,  color: "#E0A030" },
  { label: "ขอพรรอบสอง",  emoji: "🙏", win: false, color: "#9AB4D6" },
];

// Address-form field config (label + placeholder + key into the draft object).
// row:true fields pair side-by-side via .jf-field-row.
const ADDRESS_FIELDS = [
  { key: "label",       label: "ป้ายชื่อที่อยู่", placeholder: "บ้าน / ที่ทำงาน / หอพัก" },
  { key: "recipient",   label: "ชื่อผู้รับ",      placeholder: "เช่น สมชาย ใจดี" },
  { key: "phone",       label: "เบอร์โทร",        placeholder: "08x-xxx-xxxx", inputMode: "tel" },
  { key: "line",        label: "ที่อยู่",         placeholder: "บ้านเลขที่ ซอย ถนน" },
  { key: "subDistrict", label: "แขวง/ตำบล",       placeholder: "เช่น วังใหม่",      row: true },
  { key: "district",    label: "เขต/อำเภอ",       placeholder: "เช่น ปทุมวัน",      row: true },
  { key: "province",    label: "จังหวัด",         placeholder: "เช่น กรุงเทพมหานคร", row: true },
  { key: "postcode",    label: "รหัสไปรษณีย์",    placeholder: "10330", inputMode: "numeric", row: true },
];
const EMPTY_ADDR = { label: "", recipient: "", phone: "", line: "", subDistrict: "", district: "", province: "", postcode: "" };

// Cosmetic brand guess from the first digit (no validation — just a chip caption).
const brandGuess = (num) => {
  const d = (num || "").replace(/\D/g, "")[0];
  return d === "4" ? "Visa" : d === "5" || d === "2" ? "Mastercard" : d === "3" ? "AMEX" : "บัตร";
};

// Build the SAFE saved-card record from raw form fields. Stores only a brand
// guess + last 4 + holder + label — NEVER the full PAN, CVV, or expiry. uid is
// passed in so callers control identity (Date.now()+Math.random()).
const makeCardEntry = (c, uid) => {
  const last4 = (c.number || "").replace(/\D/g, "").slice(-4) || "????";
  const holder = (c.name || "").trim();
  return { uid, brand: brandGuess(c.number), last4, holder, label: holder || "บัตรของฉัน" };
};
// Two saved cards are "the same" if brand+last4+holder match — used to dedupe so
// a retry can't append an identical card.
const sameCard = (a, b) => a.brand === b.brand && a.last4 === b.last4 && a.holder === b.holder;

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

  // -------- checkout: address selection (React-local; seeded from me.defaultAddressId) --------
  const [selectedAddressId, setSelectedAddressId] = useState(null); // uid or null; survives cross-tab setMe
  const [addrDraft, setAddrDraft] = useState(EMPTY_ADDR);           // add/edit form fields
  const [editingAddrId, setEditingAddrId] = useState(null);         // uid being edited, or null = adding new
  // -------- checkout: payment (all ephemeral; saved cards live in me) --------
  const [payMethod, setPayMethod] = useState("cod");                // cod | transfer | card | bless
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "", save: false });
  const [usedCardId, setUsedCardId] = useState(null);               // a saved-card uid, or null = manual entry
  const [slip, setSlip] = useState(null);                           // { url, name } from createObjectURL — local only
  const [blessDeny, setBlessDeny] = useState("");                   // deny banner text; "" = none
  // -------- discount code (React-LOCAL until commit, like usedCardId) --------
  const [appliedCodeId, setAppliedCodeId] = useState(null); // code applied to THIS order, or null
  const [redeemDraft, setRedeemDraft] = useState("");       // deals-screen manual-entry text
  const [redeemMsg, setRedeemMsg] = useState(null);         // { ok, text } feedback banner, or null

  const cat = CATEGORIES.find((c) => c.id === tab) || CATEGORIES[0];
  const items = cat.items;
  const customCfg = cat.custom;
  const cartTotal = cart.reduce((s, c) => s + c.total, 0);
  // Shipping folds into the jar: orderTotal is the single source of truth for
  // both the CTA and the commit (so jar / chart / reveal all agree).
  const shippingFee = SHIPPING[deliveryMethod];
  const orderTotal = cartTotal + shippingFee;
  // -------- discount derivation (single source of truth for the discounted jar) --
  // The applied code must (a) still be in the wallet (cross-tab delete safety),
  // (b) be valid right now, (c) yield a positive discount (meets minSpend). We
  // discount the full orderTotal (goods+shipping) so the one number stays
  // authoritative. jarTotal is what the CTA shows AND what commitOrder re-derives.
  const appliedCode =
    appliedCodeId && me.discountWallet.some((w) => w.codeId === appliedCodeId)
      ? findCodeById(appliedCodeId)
      : null;
  const discount =
    appliedCode && isCodeValid(appliedCode, Date.now())
      ? discountFor(appliedCode, orderTotal)
      : 0;
  const jarTotal = Math.max(0, orderTotal - discount); // clamp ≥ 0
  // Regenerate the scheduled slots each render off a coarse (per-minute) clock
  // so a cart left open never offers an already-passed slot. The same per-minute
  // re-render keeps discount-window validity fresh on a long-open checkout.
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

  // Ritual steps follow the dominant category in the cart, not the active tab.
  // Each kind maps through its category's stepsKey (lux → shop), so a lux-heavy
  // cart rides the package journey. A count tie is broken by CATEGORIES order
  // (food first), so ties deterministically resolve to food; an empty cart also
  // falls back to food.
  const catRank = (id) => CATEGORIES.findIndex((c) => c.id === id);
  const kindTally = {};
  cart.forEach((c) => { kindTally[c.kind] = (kindTally[c.kind] || 0) + 1; });
  const majorKind =
    Object.entries(kindTally)
      .sort((a, b) => b[1] - a[1] || catRank(a[0]) - catRank(b[0]))[0]?.[0] || "food";
  const majorCat = CATEGORIES.find((c) => c.id === majorKind) || CATEGORIES[0];
  const orderSteps = STEPS_MAP[majorCat.stepsKey] || ORDER_STEPS_FOOD;

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
        payMethods: s.payMethods || {},
        provinces: Array.isArray(s.provinces) ? s.provinces : [],
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

  // Free a fake-slip blob URL the moment we leave checkout by ANY path — back to
  // cart, browser-back/popstate to mood, or just navigating away — so an
  // abandoned upload can't leak. commitOrder already revokes+nulls the slip
  // before it switches to "reveal", so this never double-handles a committed one.
  useEffect(() => {
    if (screen !== "checkout" && slip) {
      if (slip.url) URL.revokeObjectURL(slip.url);
      setSlip(null);
    }
  }, [screen, slip]);

  // Clear the deals collect/redeem banner whenever we leave the Deals screen by
  // ANY path (header back, CodePicker re-entry, browser-back), so it never
  // reappears stale on a later visit.
  useEffect(() => {
    if (screen !== "deals" && redeemMsg) setRedeemMsg(null);
  }, [screen, redeemMsg]);

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

  // Cart CTA → the new checkout step (pick address + payment). Seeds the
  // React-local address selection from the saved default, and clears any stale
  // blessing-deny banner from a previous visit.
  const goCheckout = () => {
    if (cart.length === 0) return;
    setSelectedAddressId((cur) => cur ?? me.defaultAddressId);
    setBlessDeny("");
    setScreen("checkout");
  };

  /* The committed path past the payment gate. Shared by the plain CTA and by a
     granted spin-wheel blessing. NOTE: a "save this card" is NOT persisted here
     — startOrder() may divert to the breathe gate (over the daily cap), and
     tapping "พักก่อน" there abandons the order without committing, so persisting
     the card now would save (and, on retry, DUPLICATE) a card for an order that
     never happened. The card is folded into commitOrder's single committed-write
     block instead, mirroring the "zero side effects until commit" contract. */
  const proceedOrder = () => {
    setBlessDeny("");
    startOrder(); // unchanged: DAILY_CAP → breathe, else ordering
  };

  /* Checkout CTA handler. For "ขอพรจากฟ้า" we hand off to the spin-wheel screen,
     which performs the 70% roll on settle — a deny there returns to checkout with
     ZERO side effects (no jar growth, no cap tick, no activeDelivery, no
     setCart([]), no pushStats). Every other method proceeds straight through. */
  const placeOrder = () => {
    if (cart.length === 0) return;
    if (payMethod === "bless") {
      setBlessDeny("");
      setScreen("blessing");
      return;
    }
    proceedOrder();
  };

  // Spin-wheel settled on a GRANT → proceed exactly like any other method.
  const onBlessGrant = () => proceedOrder();
  // Spin-wheel settled on a DENY → back to checkout with a kind banner, reset
  // the method so the user actively re-chooses. Nothing was written.
  const onBlessDeny = () => {
    setBlessDeny(BLESS_DENY[Math.floor(Math.random() * BLESS_DENY.length)]);
    setPayMethod("cod");
    setScreen("checkout");
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
    // --- DISCOUNT: re-validate against FRESH time + FRESH cart, then drop to 0 if
    //     anything changed during the bless wheel / breathe / ritual gap. This is
    //     the hard safety net behind the soft checkout re-check; the jar must never
    //     announce a discount it can't honor. orderTotal here is the same base the
    //     checkout CTA used, so minSpend is checked against the truth. Reusable-
    //     while-valid means the wallet is NOT mutated — it flows through ...fresh.
    const _code = appliedCodeId && fresh.discountWallet.some((w) => w.codeId === appliedCodeId)
      ? findCodeById(appliedCodeId) : null;
    const _discount = _code && isCodeValid(_code, now.getTime())
      ? discountFor(_code, orderTotal) : 0;
    const committedJar = Math.max(0, orderTotal - _discount); // ← the ONE number
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
    // Payment-method tally — now pushed as an anonymous aggregate for the shared
    // admin board (only the method id is ever sent, never card details).
    const payMethodCounts = { ...fresh.payMethodCounts };
    payMethodCounts[payMethod] = (payMethodCounts[payMethod] || 0) + 1;
    // Snapshot the chosen address (a place label) onto the delivery so Track can
    // show where it's headed. fresh, not me, so a cross-tab edit is respected;
    // fall back to the freshest default if the React-local selection was never
    // seeded (e.g. the default was created in another tab after goCheckout ran).
    const shipId = selectedAddressId ?? fresh.defaultAddressId;
    const ship = fresh.addresses.find((a) => a.uid === shipId) || null;
    const shipTo = ship ? (ship.label || ship.recipient || "ที่อยู่ของคุณ") : null;
    // Province tally for the shared board — only the province name (coarse,
    // non-identifying), trimmed and skipped when empty. The full address never
    // leaves the device; only this one field is aggregated.
    const provinceCounts = { ...fresh.provinceCounts };
    if (ship && ship.province) {
      const prov = String(ship.province).trim();
      if (prov) provinceCounts[prov] = (provinceCounts[prov] || 0) + 1;
    }
    // Persist the card ONLY on this committed path (mirrors the bless contract),
    // and only when "save" is ticked for a freshly-typed card — deduped so a
    // retry can't append an identical card.
    let savedCards = fresh.savedCards;
    if (payMethod === "card" && card.save && usedCardId === null) {
      const entry = makeCardEntry(card, Date.now() + Math.random());
      if (!savedCards.some((c) => sameCard(c, entry))) savedCards = [...savedCards, entry];
    }
    const ts = now.getTime();
    const entry = {
      // Shipping folds into the jar; a discount shrinks it. committedJar is the
      // re-validated discounted amount (== the CTA the user tapped, == reveal).
      idx: orderCount, saved: committedJar,
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
      payMethod, // record the payment method on the delivery
      shipTo,    // place label for the Track screen, or null
      eta,
      placedTs: ts,
      reason,
      amount: committedJar,
      itemCount: cart.length,
      steps: orderSteps === ORDER_STEPS_SHOP ? "shop" : "food",
      dismissed: false,
    };
    const next = {
      ...fresh,
      totalSaved: fresh.totalSaved + committedJar,
      orderCount,
      history: [...fresh.history, entry].slice(-100),
      itemCounts,
      hourCounts,
      methodCounts,
      moodCounts,
      payMethodCounts,
      provinceCounts,
      savedCards, // unchanged unless a new "save this card" was committed above
      today: dk,
      todayCount: fresh.today === dk ? fresh.todayCount + 1 : 1,
      activeDelivery, // a re-order while one is in flight simply replaces it
    };
    saveMe(next);
    setMe(next);
    setLastAmount(committedJar);
    setLastTs(ts); // so finishReveal patches THIS entry, not another tab's
    setCart([]);
    // Reset the selector so the next order starts clean (and the CTA is never
    // mysteriously disabled by a stale scheduled-without-slot state).
    setDeliveryMethod("normal");
    setScheduledSlot(null);
    // Reset checkout/payment state too, so the next order starts clean. The slip
    // object URL is revoked to avoid a blob leak. selectedAddressId is kept on
    // purpose so the next order defaults to the same place (goCheckout re-seeds
    // from me.defaultAddressId if it was cleared).
    setPayMethod("cod");
    setCard({ number: "", name: "", expiry: "", cvv: "", save: false });
    setUsedCardId(null);
    setSlip((s) => { if (s?.url) URL.revokeObjectURL(s.url); return null; });
    setBlessDeny("");
    // Clear the applied discount code so the next order starts clean (the wallet
    // itself stays in me — only the per-order selection resets).
    setAppliedCodeId(null);
    setRedeemDraft("");
    setRedeemMsg(null);
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

  // -------- address book CRUD (local-only, read-merge-write like commitOrder) --------
  const addAddress = (draft) => {
    const fresh = freshest(me);
    const uid = Date.now() + Math.random();
    const addresses = [...fresh.addresses, { ...draft, uid }];
    const next = { ...fresh, addresses };
    if (addresses.length === 1) next.defaultAddressId = uid; // first address becomes default
    saveMe(next); setMe(next);
    return uid;
  };

  const updateAddress = (uid, updates) => {
    const fresh = freshest(me);
    if (!fresh.addresses.some((a) => a.uid === uid)) return false;
    const addresses = fresh.addresses.map((a) =>
      a.uid === uid ? { ...a, ...updates, uid } : a); // preserve uid
    const next = { ...fresh, addresses };
    saveMe(next); setMe(next);
    return true;
  };

  const deleteAddress = (uid) => {
    const fresh = freshest(me);
    const addresses = fresh.addresses.filter((a) => a.uid !== uid);
    if (addresses.length === fresh.addresses.length) return false;
    const next = { ...fresh, addresses };
    // Reassign the default if we deleted it: first remaining, else null.
    if (fresh.defaultAddressId === uid)
      next.defaultAddressId = addresses.length ? addresses[0].uid : null;
    saveMe(next); setMe(next);
    // If the React-local selection pointed at the deleted address, fall back to
    // the (possibly new) default, else first remaining, else null.
    setSelectedAddressId((cur) =>
      cur === uid ? (next.defaultAddressId ?? addresses[0]?.uid ?? null) : cur);
    return true;
  };

  const setDefaultAddress = (uid) => {
    const fresh = freshest(me);
    if (!fresh.addresses.some((a) => a.uid === uid)) return false;
    const next = { ...fresh, defaultAddressId: uid };
    saveMe(next); setMe(next);
    return true;
  };

  // -------- saved cards CRUD (local-only; never full PAN / CVV / expiry) --------
  const deleteCard = (uid) => {
    const fresh = freshest(me);
    const savedCards = fresh.savedCards.filter((c) => c.uid !== uid);
    if (savedCards.length === fresh.savedCards.length) return false;
    const next = { ...fresh, savedCards };
    saveMe(next); setMe(next);
    setUsedCardId((cur) => (cur === uid ? null : cur)); // drop a deleted selection
    return true;
  };

  // -------- discount codes (wallet is in me; applied code is React-local) --------
  // Collect a non-secret, currently-valid code into the wallet. Idempotent.
  const collectCode = (codeId) => {
    const code = findCodeById(codeId);
    if (!code || code.secret) return { ok: false, text: "โค้ดนี้เก็บจากตรงนี้ไม่ได้นะ" };
    if (!isCodeValid(code)) return { ok: false, text: "โค้ดนี้ยังไม่เปิดใช้ หรือหมดเวลาแล้ว" };
    const fresh = freshest(me);
    if (fresh.discountWallet.some((w) => w.codeId === codeId)) return { ok: true }; // already have it
    const next = { ...fresh, discountWallet: [...fresh.discountWallet, { codeId, collectedTs: Date.now() }] };
    saveMe(next); setMe(next);
    return { ok: true };
  };

  // Manual entry (handles secret codes). Validates window, adds to wallet if
  // absent, sets the feedback banner.
  const redeemCode = () => {
    const code = findCodeByTyped(redeemDraft);
    if (!code)              { setRedeemMsg({ ok: false, text: "ไม่พบโค้ดนี้ ลองใหม่อีกครั้งนะ" }); return; }
    if (!isCodeValid(code)) { setRedeemMsg({ ok: false, text: "โค้ดนี้ยังไม่เปิดใช้ หรือหมดเวลาแล้ว" }); return; }
    const fresh = freshest(me);
    if (!fresh.discountWallet.some((w) => w.codeId === code.id)) {
      const next = { ...fresh, discountWallet: [...fresh.discountWallet, { codeId: code.id, collectedTs: Date.now() }] };
      saveMe(next); setMe(next);
    }
    setRedeemDraft("");
    setRedeemMsg({ ok: true, text: "เก็บโค้ด “" + code.label + "” เข้ากระปุกแล้ว 💛" });
  };

  // Apply a collected code to THIS order (id only — the discount is derived in
  // render and re-derived at commit). React-local; never written to me.
  const applyCode = (codeId) => {
    const code = findCodeById(codeId);
    if (!code) return false;
    if (!me.discountWallet.some((w) => w.codeId === codeId)) return false;
    if (!isCodeValid(code)) return false;
    if (discountFor(code, orderTotal) <= 0) return false; // minSpend not met / no effect
    setAppliedCodeId(codeId);
    return true;
  };
  const clearCode = () => setAppliedCodeId(null);

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
            goDeals={() => setScreen("deals")}
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
            order={goCheckout}
          />
        )}

        {screen === "checkout" && (
          <Checkout
            cart={cart} orderTotal={orderTotal} jarTotal={jarTotal}
            appliedCode={appliedCode} discount={discount}
            openCodePicker={() => setScreen("codePicker")}
            addresses={me.addresses}
            selectedAddress={me.addresses.find((a) => a.uid === (selectedAddressId ?? me.defaultAddressId)) || null}
            goAddressBook={() => setScreen("addressBook")}
            payMethod={payMethod}
            setPayMethod={(id) => { setPayMethod(id); setBlessDeny(""); }}
            blessDeny={blessDeny}
            slip={slip} setSlip={setSlip}
            card={card} setCard={setCard}
            savedCards={me.savedCards} usedCardId={usedCardId} setUsedCardId={setUsedCardId}
            onDeleteCard={deleteCard}
            back={() => setScreen("cart")}
            placeOrder={placeOrder}
          />
        )}

        {screen === "deals" && (
          <Deals
            wallet={me.discountWallet}
            onCollect={(id) => { const r = collectCode(id); if (!r.ok) setRedeemMsg(r); }}
            redeemDraft={redeemDraft} setRedeemDraft={setRedeemDraft}
            onRedeem={redeemCode} msg={redeemMsg}
            back={() => setScreen("feed")}
          />
        )}

        {screen === "codePicker" && (
          <CodePicker
            wallet={me.discountWallet} base={orderTotal} appliedCodeId={appliedCodeId}
            onPick={(id) => { applyCode(id); setScreen("checkout"); }}
            onClear={() => { clearCode(); setScreen("checkout"); }}
            goDeals={() => setScreen("deals")}
            back={() => setScreen("checkout")}
          />
        )}

        {screen === "addressBook" && (
          <AddressBook
            addresses={me.addresses} defaultId={me.defaultAddressId} selectedId={selectedAddressId}
            onSelect={(uid) => { setSelectedAddressId(uid); setScreen("checkout"); }}
            onSetDefault={setDefaultAddress}
            onEdit={(a) => { setEditingAddrId(a.uid); setAddrDraft({ ...EMPTY_ADDR, ...a }); setScreen("addressForm"); }}
            onDelete={deleteAddress}
            onAdd={() => { setEditingAddrId(null); setAddrDraft(EMPTY_ADDR); setScreen("addressForm"); }}
            back={() => setScreen("checkout")}
          />
        )}

        {screen === "addressForm" && (
          <AddressForm
            draft={addrDraft} setDraft={setAddrDraft} editing={editingAddrId !== null}
            back={() => setScreen("addressBook")}
            onSave={() => {
              if (editingAddrId !== null) updateAddress(editingAddrId, addrDraft);
              else { const uid = addAddress(addrDraft); setSelectedAddressId(uid); }
              setScreen("addressBook");
            }}
          />
        )}

        {screen === "blessing" && (
          <Blessing
            onGrant={onBlessGrant} onDeny={onBlessDeny}
            back={() => setScreen("checkout")}
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

function Feed({ tab, setTab, items, openItem, cartCount, cartTotal, pop, goCart, goStats, goDeals, totalSaved, activeDelivery, goTrack }) {
  return (
    <div className={"jf-screen" + (activeDelivery ? " jf-feed-has-deliv" : "")}>
      <div className="jf-top">
        <div className="jf-top-row">
          <div className="jf-logo sm"><Heart size={16} fill="currentColor" /> ใจฟู</div>
          <div className="jf-top-actions">
            <button className="jf-deal-pill" onClick={goDeals} aria-label="ดูโค้ดส่วนลด">
              <Ticket size={15} /> โค้ดส่วนลด
            </button>
            <button className="jf-jar-pill" onClick={goStats} aria-label={"เปิดกระปุกของฉัน ตอนนี้มี " + baht(totalSaved)}>
              <PiggyBank size={15} /> {baht(totalSaved)}
            </button>
          </div>
        </div>
        <div className="jf-tabs">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <button key={c.id} className={"jf-tab " + (tab === c.id ? "on" : "")}
                onClick={() => setTab(c.id)} aria-pressed={tab === c.id}>
                <Icon size={15} /> {c.label}
              </button>
            );
          })}
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

/* -------- checkout: pick a delivery address + a "payment" method --------
   Every method is theater — the would-be spend still lands in the jar. The CTA
   is gated only on an empty cart (gentle, frictionless, like the cart screen);
   a missing slip/card/address never blocks. The "ขอพรจากฟ้า" roll happens in
   the parent's placeOrder(), not here, so a deny is side-effect-free. */
function Checkout({
  cart, orderTotal, jarTotal, appliedCode, discount, openCodePicker,
  addresses, selectedAddress, goAddressBook,
  payMethod, setPayMethod, blessDeny, slip, setSlip,
  card, setCard, savedCards, usedCardId, setUsedCardId, onDeleteCard, back, placeOrder,
}) {
  const empty = cart.length === 0;
  const ctaLabel = payMethod === "bless" ? "ขอพรแล้วสั่งเลย 🙏" : "ยืนยัน · " + baht(jarTotal);
  return (
    <div className="jf-screen">
      <div className="jf-detail-head between">
        <button className="jf-icon-btn" onClick={back} aria-label="ย้อนกลับ"><ChevronLeft size={22} /></button>
        <div className="jf-head-title">ยืนยันคำสั่งซื้อ</div>
        <div style={{ width: 36 }} />
      </div>
      <div className="jf-detail-scroll">
        {/* --- ship-to --- */}
        <div className="jf-group-label" style={{ marginTop: 6 }}>ส่งไปที่</div>
        <button className="jf-addr-row" onClick={goAddressBook} aria-label="เลือกหรือเปลี่ยนที่อยู่จัดส่ง">
          <span className="jf-addr-ic" aria-hidden="true"><MapPin size={18} /></span>
          <div className="jf-addr-mid">
            {selectedAddress ? (
              <>
                <div className="jf-addr-label">{selectedAddress.label || "ที่อยู่"}{selectedAddress.recipient ? " · " + selectedAddress.recipient : ""}</div>
                <div className="jf-addr-line">{selectedAddress.line} {selectedAddress.district} {selectedAddress.province} {selectedAddress.postcode}</div>
              </>
            ) : (
              <div className="jf-addr-label">{addresses.length ? "เลือกที่อยู่จัดส่ง" : "เพิ่มที่อยู่จัดส่ง"}</div>
            )}
          </div>
          <ChevronLeft size={18} aria-hidden="true" style={{ transform: "rotate(180deg)", opacity: .5 }} />
        </button>

        {/* --- discount code --- */}
        <div className="jf-group-label" style={{ marginTop: 16 }}>โค้ดส่วนลด</div>
        <button className="jf-addr-row" onClick={openCodePicker} aria-label="เลือกหรือเปลี่ยนโค้ดส่วนลด">
          <span className="jf-addr-ic" aria-hidden="true"><Ticket size={18} /></span>
          <div className="jf-addr-mid">
            {appliedCode ? (
              <>
                <div className="jf-addr-label">{appliedCode.emoji} {appliedCode.label}</div>
                <div className="jf-addr-line">{discount > 0 ? "ลด " + baht(discount) : "ยังใช้ไม่ได้กับยอดนี้"}</div>
              </>
            ) : (
              <div className="jf-addr-label">เลือกโค้ดส่วนลดจากกระปุกของคุณ</div>
            )}
          </div>
          <ChevronLeft size={18} aria-hidden="true" style={{ transform: "rotate(180deg)", opacity: .5 }} />
        </button>

        {appliedCode && discount === 0 && (
          <div className="jf-bless-deny" role="status" aria-live="polite">
            <span aria-hidden="true">🎟️</span>
            <span>
              {!isCodeValid(appliedCode)
                ? "โค้ดนี้ยังไม่เปิดใช้ หรือหมดเวลาแล้ว"
                : "โค้ดนี้ต้องสั่งขั้นต่ำ " + baht(appliedCode.minSpend) + " ก่อนนะ"}
              {" "}— ยอดเต็มจะเข้ากระปุกตามเดิมนะ
            </span>
          </div>
        )}

        {appliedCode && discount > 0 && (
          <div className="jf-discount-box">
            <div className="jf-discount-line"><span>ยอดรวม</span><span>{baht(orderTotal)}</span></div>
            <div className="jf-discount-line save"><span>ส่วนลด ({appliedCode.label})</span><span>−{baht(discount)}</span></div>
            <div className="jf-discount-total"><span>ยอดเข้ากระปุก</span><span>{baht(jarTotal)}</span></div>
          </div>
        )}

        {/* --- payment method selector (reuses the delivery-chip pattern) --- */}
        <div className="jf-group jf-deliv-group">
          <div className="jf-group-label">เลือกวิธี “จ่าย” (แบบไม่ต้องจ่าย)</div>
          {blessDeny && (
            <div className="jf-bless-deny" role="status" aria-live="polite">
              <span aria-hidden="true">☁️</span><span>{blessDeny}</span>
            </div>
          )}
          <div className="jf-chips jf-deliv-chips">
            {PAYMENT_METHODS.map((m) => {
              const on = payMethod === m.id;
              return (
                <button key={m.id} className={"jf-chip jf-deliv-chip " + (on ? "on" : "")}
                  onClick={() => setPayMethod(m.id)} aria-pressed={on}>
                  <span className="jf-deliv-emoji" aria-hidden="true">{m.emoji}</span>
                  <span className="jf-deliv-main">{m.label}</span>
                </button>
              );
            })}
          </div>
          <div className="jf-deliv-note">{PAYMENT_METHODS.find((m) => m.id === payMethod).note}</div>

          {payMethod === "transfer" && <SlipUpload slip={slip} setSlip={setSlip} />}
          {payMethod === "card" && (
            <CardForm card={card} setCard={setCard}
              savedCards={savedCards} usedCardId={usedCardId} setUsedCardId={setUsedCardId}
              onDeleteCard={onDeleteCard} />
          )}
        </div>

        <div className="jf-cart-note">
          <Sparkles size={14} /> ทุกวิธีจบลงเหมือนกันหมด — ยอดเข้ากระปุก ไม่มีเงินออกจากบัญชีจริงสักบาท 💛
        </div>
        <div style={{ height: 96 }} />
      </div>
      <button className="jf-cta order" onClick={placeOrder} disabled={empty}>{ctaLabel}</button>
    </div>
  );
}

// Bank-transfer slip upload — pure theater: the chosen image is previewed
// locally via an object URL and NEVER sent anywhere. The object URL is revoked
// on replace/clear (and on commit, by the parent) so no blob leaks.
function SlipUpload({ slip, setSlip }) {
  const pick = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (slip && slip.url) URL.revokeObjectURL(slip.url); // revoke prior before replacing
    setSlip({ url: URL.createObjectURL(f), name: f.name });
  };
  const clear = () => { if (slip && slip.url) URL.revokeObjectURL(slip.url); setSlip(null); };
  return (
    <div className="jf-slot-wrap">
      <div className="jf-deliv-note">อัปสลิป (ปลอม) ก็ได้นะ เราไม่ได้เอาไปใช้จริง 💛</div>
      <input id="jf-slip" type="file" accept="image/*" hidden onChange={pick} />
      {!slip ? (
        <>
          <label htmlFor="jf-slip" className="jf-slip-btn">📎 แนบสลิป (ปลอมก็ได้นะ)</label>
          <div className="jf-slip-row">จะแคปจอ จะรูปแมว จะรูปอะไรก็ได้ทั้งนั้น มันแค่ “ผ่านไปเฉยๆ”</div>
        </>
      ) : (
        <>
          <img className="jf-slip-thumb" src={slip.url} alt={"สลิปที่แนบ: " + slip.name} />
          <div className="jf-slip-row">
            <span>ได้รับสลิปแล้ว (แต่ไม่ได้เปิดดูจริงนะ) ✨</span>
            <label htmlFor="jf-slip" className="jf-slip-relabel">เปลี่ยนสลิป</label>
            <button className="jf-remove" onClick={clear} aria-label="เอาสลิปออก"><X size={16} /></button>
          </div>
        </>
      )}
    </div>
  );
}

// Credit-card form — accepts ANYTHING (no validation; inputMode is just a
// keyboard hint). CVV/expiry/full number are never persisted: only a masked
// record (brand + last4 + holder) is saved, and only on a COMMITTED order when
// "save" is ticked (folded into commitOrder, deduped — see makeCardEntry).
function CardForm({ card, setCard, savedCards, usedCardId, setUsedCardId, onDeleteCard }) {
  const set = (k) => (e) => setCard((c) => ({ ...c, [k]: e.target.value }));
  return (
    <div className="jf-slot-wrap">
      {savedCards.length > 0 && (
        <>
          <div className="jf-group-label" style={{ marginTop: 4 }}>บัตรที่เคยบันทึกไว้</div>
          <div className="jf-chips" style={{ marginBottom: 12 }}>
            {savedCards.map((c) => (
              // Select + delete are TWO sibling buttons (no interactive nesting):
              // the chip "on" outline lives on the select button; the delete sits
              // beside it inside the inline-flex wrapper.
              <span key={c.uid} className="jf-saved-card">
                <button className={"jf-chip " + (usedCardId === c.uid ? "on" : "")}
                  onClick={() => setUsedCardId(c.uid)} aria-pressed={usedCardId === c.uid}>
                  💳 {c.brand} •••• {c.last4} · {c.holder || "ไม่มีชื่อ"}
                </button>
                <button type="button" className="jf-card-del"
                  aria-label={"ลบบัตร " + c.brand + " ลงท้าย " + c.last4}
                  onClick={() => onDeleteCard(c.uid)}>
                  <X size={13} />
                </button>
              </span>
            ))}
            <button className={"jf-chip " + (usedCardId === null ? "on" : "")}
              onClick={() => setUsedCardId(null)} aria-pressed={usedCardId === null}>+ ใช้บัตรใบใหม่</button>
          </div>
        </>
      )}
      {usedCardId === null && (
        <>
          <div className="jf-info-note" role="note">
            <span aria-hidden="true">🔒</span>
            <span><b>ใส่เลขบัตรปลอมๆ ได้เลยนะ</b> ไม่ต้องใส่เลขบัตรจริง — แอปนี้ไม่ตัดเงิน ไม่ตรวจสอบ และไม่ส่งข้อมูลบัตรไปไหนทั้งนั้น 💛</span>
          </div>
          <div className="jf-field">
            <label htmlFor="jf-cnum">หมายเลขบัตร (ปลอมได้)</label>
            <input id="jf-cnum" className="jf-input" inputMode="numeric" placeholder="กรอกมั่วๆ ก็ได้ เช่น 1234 5678 9012 3456" value={card.number} onChange={set("number")} />
          </div>
          <div className="jf-field">
            <label htmlFor="jf-cname">ชื่อบนบัตร (ปลอมได้)</label>
            <input id="jf-cname" className="jf-input" placeholder="เช่น คุณ ใจฟู" value={card.name} onChange={set("name")} />
          </div>
          <div className="jf-field-row">
            <div className="jf-field" style={{ flex: 1 }}>
              <label htmlFor="jf-cexp">วันหมดอายุ (ปลอมได้)</label>
              <input id="jf-cexp" className="jf-input" inputMode="numeric" placeholder="MM/YY" value={card.expiry} onChange={set("expiry")} />
            </div>
            <div className="jf-field" style={{ flex: 1 }}>
              <label htmlFor="jf-ccvv">CVV (ปลอมได้)</label>
              <input id="jf-ccvv" className="jf-input" inputMode="numeric" placeholder="มั่วๆ" value={card.cvv} onChange={set("cvv")} />
            </div>
          </div>
          <label className="jf-save-row">
            <input type="checkbox" checked={card.save} onChange={(e) => setCard((c) => ({ ...c, save: e.target.checked }))} />
            <span>เก็บบัตรนี้ไว้ใช้ครั้งหน้าไหม</span>
          </label>
          <div className="jf-deliv-note">เราเก็บแค่ในเครื่องคุณเอง (4 ตัวท้าย + ชื่อ) ไม่ได้ส่งไปไหนเลยนะ 💛</div>
        </>
      )}
    </div>
  );
}

// Address book — list, set-default, edit, delete, add. Reuses the cart-item row
// look and the CTA. Selecting a row picks it for checkout and returns there.
function AddressBook({ addresses, defaultId, selectedId, onSelect, onSetDefault, onEdit, onDelete, onAdd, back }) {
  return (
    <div className="jf-screen">
      <div className="jf-detail-head between">
        <button className="jf-icon-btn" onClick={back} aria-label="ย้อนกลับ"><ChevronLeft size={22} /></button>
        <div className="jf-head-title">ที่อยู่จัดส่ง</div>
        <div style={{ width: 36 }} />
      </div>
      <div className="jf-detail-scroll">
        {addresses.length === 0 && (
          <div className="jf-chart-empty">ยังไม่มีที่อยู่ — เพิ่มที่อยู่แรกของคุณได้เลย</div>
        )}
        {addresses.map((a) => (
          <div key={a.uid} className={"jf-addr-card " + (selectedId === a.uid ? "on" : "")}>
            <button className="jf-addr-pick" onClick={() => onSelect(a.uid)} aria-pressed={selectedId === a.uid}>
              <div className="jf-addr-label">
                {a.label || "ที่อยู่"}{a.recipient ? " · " + a.recipient : ""}
                {defaultId === a.uid && <span className="jf-addr-default">ค่าเริ่มต้น</span>}
              </div>
              <div className="jf-addr-line">{a.line} {a.subDistrict} {a.district} {a.province} {a.postcode}</div>
              <div className="jf-addr-line">{a.phone}</div>
            </button>
            <div className="jf-addr-actions">
              {defaultId !== a.uid && (
                <button className="jf-addr-act" onClick={() => onSetDefault(a.uid)}>ตั้งเป็นค่าเริ่มต้น</button>
              )}
              <button className="jf-addr-act" onClick={() => onEdit(a)} aria-label="แก้ไขที่อยู่">แก้ไข</button>
              <button className="jf-addr-act danger" onClick={() => onDelete(a.uid)} aria-label="ลบที่อยู่"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
        <div style={{ height: 96 }} />
      </div>
      <button className="jf-cta" onClick={onAdd}><Plus size={18} /> เพิ่มที่อยู่ใหม่</button>
    </div>
  );
}

// Add/edit one address. Non-validating by design (matches the app's frictionless
// tone). Single-line fields stack; the four short fields pair into two rows.
function AddressForm({ draft, setDraft, editing, back, onSave }) {
  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const singles = ADDRESS_FIELDS.filter((f) => !f.row);
  const rows = ADDRESS_FIELDS.filter((f) => f.row);
  const field = (f) => (
    <div className="jf-field" key={f.key} style={f.row ? { flex: 1 } : undefined}>
      <label htmlFor={"jf-af-" + f.key}>{f.label}</label>
      <input id={"jf-af-" + f.key} className="jf-input"
        inputMode={f.inputMode} placeholder={f.placeholder}
        value={draft[f.key]} onChange={set(f.key)} />
    </div>
  );
  return (
    <div className="jf-screen">
      <div className="jf-detail-head between">
        <button className="jf-icon-btn" onClick={back} aria-label="ย้อนกลับ"><ChevronLeft size={22} /></button>
        <div className="jf-head-title">{editing ? "แก้ไขที่อยู่" : "เพิ่มที่อยู่"}</div>
        <div style={{ width: 36 }} />
      </div>
      <div className="jf-detail-scroll">
        {singles.map(field)}
        <div className="jf-field-row">{rows.slice(0, 2).map(field)}</div>
        <div className="jf-field-row">{rows.slice(2, 4).map(field)}</div>
        <div style={{ height: 96 }} />
      </div>
      <button className="jf-cta order" onClick={onSave}><Check size={18} /> {editing ? "บันทึกการแก้ไข" : "บันทึกที่อยู่"}</button>
    </div>
  );
}

// Human-readable window label for a discount code.
const codeWindowLabel = (code) => {
  const w = code.window;
  if (!w) return "ใช้ได้ตลอด";
  if (w.type === "daily") {
    const pad = (n) => String(n).padStart(2, "0");
    return "ใช้ได้ " + pad(w.hStart) + ":00–" + pad(w.hEnd) + ":00 น.";
  }
  if (w.type === "absolute") return "ถึง " + new Date(w.endMs).toLocaleDateString("th-TH");
  return "";
};
// Short discount caption, e.g. "ลด 10%" / "ลด ฿50".
const codeDiscountLabel = (code) =>
  code.kind === "percent" ? "ลด " + code.value + "%" : "ลด " + baht(code.value);

// The "unavailable" reason for an invalid code, by POSITION (not type): an
// absolute code before its start says "not yet"; after its end says "expired".
// Daily windows recur, so "opens again later" is always the right framing.
const codeNaLabel = (code, now = Date.now()) => {
  const w = code.window;
  if (w && w.type === "absolute") return now < w.startMs ? "ยังไม่ถึงเวลา" : "หมดเวลาแล้ว";
  return "ยังไม่ถึงเวลา";
};

// Deals screen: collect non-secret codes into the wallet + redeem a secret code
// by typing it. The wallet (which codes you hold) lives in me; this screen only
// reads it + calls the collect/redeem handlers. NOT deep-linkable (transient).
function Deals({ wallet, onCollect, redeemDraft, setRedeemDraft, onRedeem, msg, back }) {
  const visible = DISCOUNT_CODES.filter((c) => !c.secret);
  return (
    <div className="jf-screen">
      <div className="jf-detail-head between">
        <button className="jf-icon-btn" onClick={back} aria-label="ย้อนกลับ"><ChevronLeft size={22} /></button>
        <div className="jf-head-title">โค้ดส่วนลด</div>
        <div style={{ width: 36 }} />
      </div>
      <div className="jf-detail-scroll">
        <div className="jf-cart-note">
          <Ticket size={14} /> เก็บโค้ดไว้ในกระปุก แล้วเอาไปใช้ตอนยืนยันคำสั่งซื้อ — ส่วนลดจะช่วยให้ยอดเข้ากระปุกน้อยลง แต่ก็ยังเข้ากระปุกนะ 💛
        </div>
        {visible.map((c) => {
          const valid = isCodeValid(c);
          const have = wallet.some((w) => w.codeId === c.id);
          return (
            <div key={c.id} className={"jf-code-card" + (valid ? "" : " unavailable")}>
              <span className="jf-code-emoji" aria-hidden="true">{c.emoji}</span>
              <div className="jf-code-mid">
                <div className="jf-code-label">{c.label}</div>
                <div className="jf-code-discount">{codeDiscountLabel(c)}{c.minSpend > 0 ? " · ขั้นต่ำ " + baht(c.minSpend) : ""}</div>
                <span className="jf-code-time">⏰ {codeWindowLabel(c)}</span>
              </div>
              <div className="jf-code-state">
                {have ? (
                  <span className="jf-code-have"><Check size={14} /> เก็บแล้ว</span>
                ) : !valid ? (
                  <span className="jf-code-na">{codeNaLabel(c)}</span>
                ) : (
                  <button className="jf-code-collect" onClick={() => onCollect(c.id)}>เก็บโค้ด</button>
                )}
              </div>
            </div>
          );
        })}

        <div className="jf-code-form">
          <div className="jf-group-label">มีโค้ดลับ? พิมพ์ตรงนี้เลย</div>
          <div className="jf-code-form-row">
            <input className="jf-input" placeholder="พิมพ์โค้ดลับ เช่น วีไอพีลับ"
              value={redeemDraft} onChange={(e) => setRedeemDraft(e.target.value)}
              aria-label="พิมพ์โค้ดลับ" />
            <button className="jf-code-redeem" onClick={onRedeem}>ใช้</button>
          </div>
          {msg && (
            <div className={msg.ok ? "jf-code-success" : "jf-code-error"} role="status" aria-live="polite">
              <span aria-hidden="true">{msg.ok ? "✨" : "🎟️"}</span><span>{msg.text}</span>
            </div>
          )}
        </div>
        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}

// Checkout code picker: choose ONE collected code to apply to this order. Each
// wallet entry resolves through the catalog; a code that's invalid now or
// doesn't meet minSpend for the current cart is shown disabled with the reason.
function CodePicker({ wallet, base, appliedCodeId, onPick, onClear, goDeals, back }) {
  const rows = wallet
    .map((w) => findCodeById(w.codeId))
    .filter(Boolean);
  return (
    <div className="jf-screen">
      <div className="jf-detail-head between">
        <button className="jf-icon-btn" onClick={back} aria-label="ย้อนกลับ"><ChevronLeft size={22} /></button>
        <div className="jf-head-title">เลือกโค้ดส่วนลด</div>
        <div style={{ width: 36 }} />
      </div>
      <div className="jf-detail-scroll">
        {rows.length === 0 && (
          <div className="jf-chart-empty">ยังไม่มีโค้ดในกระปุก — ไปเก็บโค้ดที่หน้าโค้ดส่วนลดก่อนนะ</div>
        )}
        <button className={"jf-code-card" + (appliedCodeId === null ? " on" : "")} onClick={onClear} style={{ width: "100%", textAlign: "left" }}>
          <span className="jf-code-emoji" aria-hidden="true">🚫</span>
          <div className="jf-code-mid"><div className="jf-code-label">ไม่ใช้โค้ด</div></div>
          <div className="jf-code-state">{appliedCodeId === null && <Check size={16} />}</div>
        </button>
        {rows.map((c) => {
          const valid = isCodeValid(c);
          const d = discountFor(c, base);
          const usable = valid && d > 0;
          const reason = !valid ? "ยังไม่เปิด / หมดเวลา" : "ขั้นต่ำ " + baht(c.minSpend);
          return (
            <button key={c.id} disabled={!usable}
              className={"jf-code-card" + (usable ? "" : " unavailable") + (appliedCodeId === c.id ? " on" : "")}
              onClick={() => usable && onPick(c.id)} style={{ width: "100%", textAlign: "left" }}>
              <span className="jf-code-emoji" aria-hidden="true">{c.emoji}</span>
              <div className="jf-code-mid">
                <div className="jf-code-label">{c.label}</div>
                <div className="jf-code-discount">{usable ? "ลด " + baht(d) : reason}</div>
              </div>
              <div className="jf-code-state">{appliedCodeId === c.id && <Check size={16} />}</div>
            </button>
          );
        })}
        <button className="jf-global-btn" style={{ marginTop: 14 }} onClick={goDeals}>
          <Ticket size={16} /> ไปเก็บโค้ดเพิ่ม
        </button>
        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}

/* "ขอพรจากฟ้า" spin-wheel. Two phases: PRAY (a gentle invite to make a wish /
   say a little prayer before spinning) → SPIN (the wheel turns and settles on a
   slice). The 70% grant/deny is rolled the moment the spin starts; we then pick
   a random slice of the matching kind to land on, so the visual ALWAYS agrees
   with the outcome. On settle we call onGrant (→ proceed to ordering) or onDeny
   (→ back to checkout). Nothing is written here, so a deny is side-effect-free.
   The wheel is drawn with a conic-gradient; reduced-motion skips the long spin. */
const SEG_DEG = 360 / WHEEL_SEGMENTS.length;
// Build the conic-gradient once from the segment colors so the wheel's paint
// always matches WHEEL_SEGMENTS (each slice is a hard-edged colour band).
const WHEEL_GRADIENT =
  "conic-gradient(" +
  WHEEL_SEGMENTS.map((s, i) => `${s.color} ${i * SEG_DEG}deg ${(i + 1) * SEG_DEG}deg`).join(", ") +
  ")";
function Blessing({ onGrant, onDeny, back }) {
  const [phase, setPhase] = useState("pray"); // pray | spinning
  const [angle, setAngle] = useState(0);      // wheel rotation in degrees
  const settleRef = useRef(null);
  useEffect(() => () => { if (settleRef.current) clearTimeout(settleRef.current); }, []);

  const reduced =
    typeof window !== "undefined" && window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const spin = () => {
    if (phase === "spinning") return;
    setPhase("spinning");
    // Decide the outcome first, then choose a matching slice to land on.
    const win = Math.random() < BLESSING_GRANT_P;
    const pool = WHEEL_SEGMENTS.map((s, i) => [s, i]).filter(([s]) => s.win === win);
    const [, idx] = pool[Math.floor(Math.random() * pool.length)];
    // The pointer sits at the top (12 o'clock). To bring slice `idx`'s centre
    // under the pointer, rotate so that centre reaches 0°, plus several full
    // turns for the spin. Slice i spans [i*SEG_DEG, (i+1)*SEG_DEG]; its centre is
    // (i+0.5)*SEG_DEG. We rotate the wheel by (turns*360 - centre).
    const turns = reduced ? 0 : 5;
    const centre = (idx + 0.5) * SEG_DEG;
    const target = turns * 360 - centre;
    // tiny jitter within the slice so it doesn't always stop dead-centre
    const jitter = reduced ? 0 : (Math.random() - 0.5) * (SEG_DEG * 0.6);
    setAngle(target + jitter);
    const wait = reduced ? 200 : 3400; // match the CSS transition duration
    settleRef.current = setTimeout(() => (win ? onGrant() : onDeny()), wait);
  };

  return (
    <div className="jf-screen jf-center jf-pad">
      <div className="jf-bless-head">ขอพรจากฟ้า</div>

      <div className="jf-wheel-wrap">
        <div className="jf-wheel-pointer" aria-hidden="true">▼</div>
        <div
          className={"jf-wheel" + (phase === "spinning" ? " spinning" : "")}
          style={{ transform: `rotate(${angle}deg)`, background: WHEEL_GRADIENT }}
          role="img" aria-label="วงล้อขอพรจากฟ้า"
        >
          {WHEEL_SEGMENTS.map((s, i) => (
            // Spoke: rotate to the slice centre, then translate outward toward the
            // rim (negative Y = up before rotation). 78px ≈ 0.63·radius on the
            // 248px wheel, seating the emoji comfortably between hub and edge.
            <span key={i} className="jf-wheel-label"
              style={{ transform: `rotate(${(i + 0.5) * SEG_DEG}deg) translateY(-78px)` }}>
              <span style={{ transform: `rotate(${-(i + 0.5) * SEG_DEG}deg)` }}>{s.emoji}</span>
            </span>
          ))}
        </div>
        <div className="jf-wheel-hub" aria-hidden="true"><Sparkles size={20} /></div>
      </div>

      {phase === "pray" ? (
        <>
          <div className="jf-bless-pray">
            พนมมือ ตั้งจิตอธิษฐาน แล้วขอพรในใจสักครู่ 🙏<br />
            “ขอให้ฟ้าเปิดทาง ให้ของชิ้นนี้ได้เข้ากระปุกด้วยเทอญ”
          </div>
          <div className="jf-bless-sub">พร้อมแล้วค่อยหมุน — ฟ้าจะใจดีไหม วันนี้ลองดู ✨</div>
          <button className="jf-cta order jf-bless-cta" onClick={spin}>
            <Sparkles size={18} /> สวดมนต์แล้ว หมุนเลย!
          </button>
          <button className="jf-bless-back" onClick={back}>ขอเปลี่ยนวิธีอื่นก่อน</button>
        </>
      ) : (
        <div className="jf-bless-spinning" aria-live="polite">
          กำลังหมุน… ตั้งจิตไว้นะ ฟ้ากำลังพิจารณา ☁️✨
        </div>
      )}
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
        ตอนนี้กระปุกของคุณมี <b>{baht(total)}</b><br />
        ของแพงแค่ไหนก็เก็บเข้ากระปุกได้เหมือนกัน — ฟินตา ฟินใจ ไม่ต้องจ่ายจริง ✨
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
          {d.shipTo && <div className="jf-track-jar">กำลังมุ่งหน้าไปที่ “{d.shipTo}” 📍</div>}
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
        <div className="jf-anon-note">สถิติรวมเก็บแบบไม่ระบุตัวตน — เฉพาะยอดรวม เมนูยอดฮิต ช่วงเวลา วิธีจัดส่ง วิธีชำระเงิน จังหวัดที่สั่ง (เฉพาะชื่อจังหวัด ไม่เก็บที่อยู่เต็ม) อารมณ์ก่อนสั่ง และความรู้สึกหลังสั่ง (นับเป็นภาพรวมเท่านั้น) ไม่มีการเก็บประวัติรายออเดอร์ ไม่มีการเก็บข้อมูลบัตร</div>

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
const PAY_LABELS = [["cod", "ปลายทาง"], ["transfer", "โอนเงิน"], ["card", "บัตรเครดิต"], ["bless", "ขอพรจากฟ้า"]];

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

            <div className="jf-chart-card" style={{ marginTop: 14 }}>
              <div className="jf-chart-title">ประเภทการชำระเงิน</div>
              <CountBars data={g.payMethods || {}} labels={PAY_LABELS} />
            </div>

            <div className="jf-chart-card" style={{ marginTop: 14 }}>
              <div className="jf-chart-title">จังหวัดที่สั่ง</div>
              {!g.provinces || g.provinces.length === 0 ? (
                <div className="jf-chart-empty">ยังไม่มีข้อมูล</div>
              ) : (
                <div className="jf-bars">
                  {g.provinces.map(([prov, n]) => (
                    <div key={prov} className="jf-bar-item">
                      <div className="jf-bar-label"><span>{prov}</span><b>{n}</b></div>
                      <div className="jf-bar-track">
                        <div className="jf-bar-fill" style={{ width: (n / (g.provinces[0][1] || 1)) * 100 + "%" }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
.jf-tabs{ display:flex; gap:7px; margin-top:16px; }
.jf-tab{ flex:1; min-width:0; white-space:nowrap; display:flex; align-items:center; justify-content:center; gap:5px;
  padding:11px 8px; border-radius:14px; font-weight:500; font-size:14px; color:var(--muted);
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

/* checkout: text inputs (the app's first form fields) */
.jf-input{ width:100%; padding:13px 14px; border-radius:14px; border:none; background:var(--card);
  box-shadow:inset 0 0 0 1.5px var(--line); font:inherit; font-size:15px; color:var(--ink); transition:box-shadow .15s; }
.jf-input:focus{ outline:none; box-shadow:inset 0 0 0 1.5px var(--coral); }
.jf-input::placeholder{ color:var(--muted); }
.jf-field{ margin-bottom:12px; }
.jf-field label{ display:block; font-size:12.5px; font-weight:600; color:var(--muted); margin-bottom:6px; }
.jf-field-row{ display:flex; gap:10px; }
.jf-save-row{ display:flex; align-items:center; gap:10px; margin-top:6px; font-size:13.5px; cursor:pointer; }
.jf-save-row input{ width:18px; height:18px; accent-color:var(--coral); }

/* checkout: bank-transfer slip upload */
.jf-slip-btn,.jf-slip-relabel{ display:inline-flex; align-items:center; gap:8px; padding:12px 16px;
  border-radius:14px; background:var(--card); color:var(--coral-d); font-weight:600; font-size:13.5px;
  box-shadow:inset 0 0 0 1.5px var(--line); margin-top:10px; cursor:pointer; }
.jf-slip-relabel{ padding:7px 12px; margin-top:0; }
.jf-slip-thumb{ width:100%; max-height:180px; object-fit:cover; border-radius:14px; margin-top:12px; }
.jf-slip-row{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-top:8px; font-size:12.5px; color:var(--muted); }

/* checkout: address rows / cards */
.jf-addr-row{ width:100%; display:flex; align-items:center; gap:12px; background:var(--card); border-radius:16px;
  padding:13px 14px; margin:6px 0 4px; text-align:left; box-shadow:0 5px 14px -10px rgba(0,0,0,.2); }
.jf-addr-ic{ color:var(--coral-d); flex-shrink:0; display:flex; }
.jf-addr-mid{ flex:1; min-width:0; }
.jf-addr-card{ background:var(--card); border-radius:16px; padding:13px 14px; margin-bottom:11px;
  box-shadow:0 5px 14px -10px rgba(0,0,0,.2); }
.jf-addr-card.on{ box-shadow:inset 0 0 0 2px var(--coral); }
.jf-addr-pick{ width:100%; text-align:left; }
.jf-addr-label{ font-weight:600; font-size:14px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.jf-addr-line{ color:var(--muted); font-size:11.5px; line-height:1.45; margin-top:3px; }
.jf-addr-default{ font-size:10.5px; font-weight:600; color:var(--coral-d); background:#E8F0FB;
  border-radius:99px; padding:2px 8px; }
.jf-addr-actions{ display:flex; gap:8px; margin-top:10px; flex-wrap:wrap; }
.jf-addr-act{ display:flex; align-items:center; font-size:12px; font-weight:600; color:var(--coral-d);
  background:#E8F0FB; border-radius:11px; padding:7px 12px; }
.jf-addr-act.danger{ color:var(--sage-text); background:var(--sage-l); }

/* checkout: info banners (calm blue family) — the blessing-deny notice and the
   "you can type a fake card number" reassurance share one look. */
.jf-bless-deny,.jf-info-note{ display:flex; gap:9px; align-items:flex-start; background:#EAF2FC; color:var(--coral-d);
  border-radius:16px; padding:13px 15px; font-size:12.5px; line-height:1.55; margin-bottom:12px; }
.jf-info-note b{ color:var(--coral-d); }

/* discount: feed entry pill (sits beside the jar pill) */
.jf-top-actions{ display:flex; align-items:center; gap:8px; }
.jf-deal-pill{ display:flex; align-items:center; gap:6px; background:var(--butter); color:#5A3A00;
  font-weight:600; font-size:12.5px; padding:7px 11px; border-radius:99px; transition:transform .12s; }
.jf-deal-pill:active{ transform:scale(.97); }

/* discount: code cards (deals + picker), mirror .jf-addr-card */
.jf-code-card{ display:flex; align-items:flex-start; gap:12px; background:var(--card); border-radius:16px;
  padding:12px 14px; margin-bottom:11px; box-shadow:0 5px 14px -10px rgba(0,0,0,.2); transition:opacity .2s; }
.jf-code-card.unavailable{ opacity:.55; }
.jf-code-card.on{ box-shadow:inset 0 0 0 2px var(--coral); }
.jf-code-emoji{ font-size:26px; flex-shrink:0; line-height:1.2; }
.jf-code-mid{ flex:1; min-width:0; }
.jf-code-label{ font-weight:600; font-size:14px; color:var(--ink); }
.jf-code-discount{ color:var(--coral-d); font-weight:600; font-size:12.5px; margin-top:3px; }
.jf-code-state{ flex-shrink:0; display:flex; align-items:center; color:var(--sage-text); }
.jf-code-collect{ font-size:12.5px; font-weight:600; color:#fff; background:var(--sage);
  border-radius:11px; padding:8px 13px; }
.jf-code-have{ display:flex; align-items:center; gap:5px; font-size:12.5px; font-weight:600; color:var(--sage-text); }
.jf-code-na{ font-size:11.5px; font-weight:600; color:var(--muted); text-align:right; max-width:84px; }

/* discount: time-window pill */
.jf-code-time{ display:inline-flex; align-items:center; gap:4px; margin-top:6px;
  background:var(--sage-l); color:var(--sage-text); padding:3px 9px; border-radius:12px;
  font-size:10.5px; font-weight:600; }
.jf-code-card.unavailable .jf-code-time{ background:var(--line); color:var(--muted); }

/* discount: manual-redeem form (deals screen) */
.jf-code-form{ margin-top:18px; }
.jf-code-form-row{ display:flex; gap:8px; align-items:stretch; margin-top:10px; }
.jf-code-form-row .jf-input{ flex:1; }
.jf-code-redeem{ flex:0 0 auto; padding:0 18px; border-radius:14px; background:var(--ink); color:#fff;
  font-weight:600; font-size:14px; }
.jf-code-success{ display:flex; gap:9px; align-items:flex-start; background:#E7F3EC; color:var(--sage-text);
  border-radius:16px; padding:13px 15px; font-size:12.5px; line-height:1.55; margin-top:12px; }
.jf-code-error{ display:flex; gap:9px; align-items:flex-start; background:#FCEBDC; color:var(--sage-text);
  border-radius:16px; padding:13px 15px; font-size:12.5px; line-height:1.55; margin-top:12px; }

/* discount: checkout breakdown */
.jf-discount-box{ margin:4px 0 12px; }
.jf-discount-line{ display:flex; justify-content:space-between; font-size:13px; font-weight:600;
  color:var(--muted); margin-bottom:6px; }
.jf-discount-line.save{ color:var(--sage-text); }
.jf-discount-total{ display:flex; justify-content:space-between; font-size:15px; font-weight:600;
  color:var(--coral-d); border-top:1px solid var(--line); padding-top:8px; }

/* "ขอพรจากฟ้า" spin wheel */
.jf-bless-head{ font-family:'Mitr'; font-weight:500; font-size:22px; color:var(--coral-d); margin-bottom:4px; }
.jf-wheel-wrap{ position:relative; width:248px; height:248px; margin:14px 0 18px; }
.jf-wheel{ width:100%; height:100%; border-radius:50%;
  box-shadow:0 14px 34px -12px rgba(28,42,68,.45), inset 0 0 0 6px #fff, 0 0 0 3px rgba(28,42,68,.06);
  transition:transform 3.4s cubic-bezier(.17,.67,.21,1); will-change:transform; }
.jf-wheel.spinning{ transition:transform 3.4s cubic-bezier(.17,.67,.21,1); }
/* each label rides a spoke: the outer span rotates to the slice centre and
   translates out to the rim; the inner span counter-rotates so the emoji stays
   upright. The label box is zero-size and pinned at the wheel centre. */
.jf-wheel-label{ position:absolute; left:50%; top:50%; width:0; height:0;
  display:flex; align-items:center; justify-content:center; }
.jf-wheel-label > span{ display:block; font-size:22px; line-height:1; }
.jf-wheel-pointer{ position:absolute; top:-6px; left:50%; transform:translateX(-50%);
  color:var(--sage); font-size:26px; z-index:3; filter:drop-shadow(0 2px 3px rgba(0,0,0,.25)); }
.jf-wheel-hub{ position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
  width:54px; height:54px; border-radius:50%; background:#fff; color:var(--sage);
  display:flex; align-items:center; justify-content:center; z-index:2;
  box-shadow:0 4px 12px -4px rgba(0,0,0,.3); }
.jf-bless-pray{ font-size:14px; line-height:1.7; color:var(--ink); max-width:300px; margin-top:4px; }
.jf-bless-sub{ color:var(--muted); font-size:13px; margin-top:12px; max-width:280px; line-height:1.5; }
.jf-bless-cta{ position:static; margin-top:22px; width:100%; }
.jf-bless-back{ color:var(--muted); font-size:13px; margin-top:14px; text-decoration:underline; }
.jf-bless-spinning{ font-family:'Mitr'; font-weight:500; font-size:16px; color:var(--coral-d);
  margin-top:24px; max-width:280px; line-height:1.6; }

/* checkout: a saved card = select chip + a sibling delete button, inline */
.jf-saved-card{ display:inline-flex; align-items:center; gap:4px; }
.jf-card-del{ display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px;
  border-radius:11px; color:var(--sage-text); background:var(--sage-l); flex-shrink:0; }

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
