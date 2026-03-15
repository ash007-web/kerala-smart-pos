// ═══════════════════════════════════════════════════════
// KERALA SMART POS — SHOP CONTEXT
// js/services/shopContext.js
//
// Centralized, safe shop ID access.
// Import getShopId() from here in all service and page files.
// ═══════════════════════════════════════════════════════

import { auth, waitForAuth } from "../firebase.js";

/**
 * Get the current shop ID (= Firebase Auth UID).
 * Returns null if called before auth has resolved — do not use for queries.
 */
export function getShopId() {
  return auth.currentUser?.uid ?? null;
}

/**
 * Get the shopId, throwing if not authenticated.
 * Use inside service functions that should only ever run when logged in.
 */
export function requireShopId() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("[KSP] Cannot access Firestore: user is not authenticated.");
  return uid;
}

/**
 * Wait for Firebase Auth to initialize and return the confirmed user.
 * Use at the top of any page's DOMContentLoaded handler that starts Firestore listeners:
 *
 *   const user = await waitForAuth();
 *   const shopId = user.uid;
 *   startMyListener(shopId);
 */
export { waitForAuth };
