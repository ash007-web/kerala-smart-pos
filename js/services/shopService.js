// ═══════════════════════════════════════════════════════
// KERALA SMART POS — SHOP SERVICE
// js/services/shopService.js
//
// Handles first-login shop provisioning.
// Flow: User logs in → provisionShop() called → if shops/{uid}
// does not exist, create it with default settings.
// ═══════════════════════════════════════════════════════

import { db, auth } from "../firebase.js";
import {
  doc, getDoc, setDoc, serverTimestamp,
} from "firebase/firestore";

/**
 * Provision a shop document for the current user on first login.
 * Safe to call on every login — uses setDoc with { merge: true }
 * so it never overwrites existing data.
 *
 * Firestore path: shops/{uid}
 *
 * @param {import("firebase/auth").User} user
 * @returns {Promise<{ isNew: boolean }>}
 */
export async function provisionShop(user) {
  if (!user?.uid) throw new Error("No authenticated user.");

  const shopRef = doc(db, "shops", user.uid);
  const shopSnap = await getDoc(shopRef);

  if (shopSnap.exists()) {
    // Shop already set up — just update last login timestamp
    await setDoc(shopRef, { lastLoginAt: serverTimestamp() }, { merge: true });
    return { isNew: false };
  }

  // First login — create the shop document
  const displayName = user.displayName ?? user.email?.split("@")[0] ?? "My Store";

  await setDoc(shopRef, {
    // ── Identity ──────────────────────────────────────
    ownerId:   user.uid,
    ownerEmail: user.email ?? null,
    ownerName:  user.displayName ?? null,

    // ── Business settings (from settings collection spec) ──
    storeName:      `${displayName}'s Store`,
    taxRate:        0.18,          // 18% GST default
    currency:       "INR",
    receiptFooter:  "Thank you for shopping with us! | Kerala Smart POS",
    lowStockThreshold: 5,

    // ── Timestamps ────────────────────────────────────
    createdAt:    serverTimestamp(),
    lastLoginAt:  serverTimestamp(),

    // ── Plan ──────────────────────────────────────────
    plan: "free",
  });

  console.info("[KSP] Shop provisioned for:", user.email);
  return { isNew: true };
}

/**
 * Read the current shop's settings document.
 * Returns null if the shop hasn't been provisioned yet.
 */
export async function getShopSettings() {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  const snap = await getDoc(doc(db, "shops", uid));
  return snap.exists() ? snap.data() : null;
}
