// ═══════════════════════════════════════════════════════
// KERALA SMART POS — FORMATTERS UTILITY
// js/utils/formatters.js
// ═══════════════════════════════════════════════════════

/**
 * Format a number as Indian Rupee (e.g. ₹1,24,500.00)
 */
export function fmtINR(n) {
  const num = Number(n) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format a number as compact INR (e.g. ₹1.2L, ₹45K)
 */
export function fmtINRShort(n) {
  const num = Number(n) || 0;
  if (num >= 100000) return "₹" + (num / 100000).toFixed(1) + "L";
  if (num >= 1000)   return "₹" + (num / 1000).toFixed(1) + "K";
  return fmtINR(num);
}

/**
 * Format a Firestore Timestamp or Date as a date string
 * @param {import("firebase/firestore").Timestamp | Date | null} ts
 */
export function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Format a Firestore Timestamp or Date as a time string
 * @param {import("firebase/firestore").Timestamp | Date | null} ts
 */
export function fmtTime(ts) {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
