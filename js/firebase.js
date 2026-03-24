// ═══════════════════════════════════════════════════════
// KERALA SMART POS — FIREBASE CORE
// js/firebase.js
// ═══════════════════════════════════════════════════════

import { initializeApp }                                          from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
} from "firebase/firestore";
import { getAuth, GoogleAuthProvider, onAuthStateChanged }        from "firebase/auth";

const firebaseConfig = {
  apiKey:            "AIzaSyC0YL7SjOboWHyGXg0zhsG4bqCxocH4Jhs",
  authDomain:        "kerala-smart-pos.firebaseapp.com",
  projectId:         "kerala-smart-pos",
  storageBucket:     "kerala-smart-pos.firebasestorage.app",
  messagingSenderId: "928348494735",
  appId:             "1:928348494735:web:871c42b3feaf74ce93c9fa",
};

// ─── Production Deployment Checklist ────────────────────────────────────────
// For Google Sign-In to work on deployed domains, add your domains to:
//   Firebase Console → Authentication → Settings → Authorized Domains
//
// Required authorized domains for deployment:
//   - localhost                   (always present by default)
//   - your-project.vercel.app    (add this for Vercel)
//   - your-project.pages.dev     (add this for Cloudflare Pages)
//   - your-custom-domain.com     (add any custom domain)
//
// Without this, signInWithPopup() will fail with "auth/unauthorized-domain".
// ───────────────────────────────────────────────────────────────────────────


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Use initializeFirestore with offline persistence (Firebase v10+ API)
// enableIndexedDbPersistence was removed in Firebase v10
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
export const auth           = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// ── Shop ID helpers ─────────────────────────────────────
/**
 * Returns the current user's UID (= shopId).
 * Throws a clear error if called before auth has resolved.
 *
 * Import and call this inside query functions, NOT at module level,
 * so it always reads the live auth state.
 */
export function getShopId() {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    // Don't throw — guard pages should prevent reaching here,
    // but if they don't, fall back and log.
    console.warn("[KSP] getShopId() called before auth resolved. Queries will fail.");
    return null;
  }
  return uid;
}

/**
 * Returns a Promise that resolves to the authenticated user once Firebase
 * Auth has initialized. Useful for page scripts that need to wait for auth
 * before starting Firestore listeners.
 *
 * Usage:
 *   import { waitForAuth } from "../firebase.js";
 *   const user = await waitForAuth();
 *   // now auth.currentUser is definitely set
 */
export function waitForAuth() {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub(); // unsubscribe immediately
      if (user) {
        resolve(user);
      } else {
        // Not logged in — redirect (navigation.js handles this too)
        window.location.href = "login.html";
        reject(new Error("Not authenticated"));
      }
    });
  });
}

// ── Collection accessors ─────────────────────────────────
// These are lazy functions — getShopId() is called each time a query runs,
// so they always reflect the current auth state.
export const col = {
  products:      (shopId) => collection(db, "shops", shopId ?? getShopId(), "products"),
  customers:     (shopId) => collection(db, "shops", shopId ?? getShopId(), "customers"),
  transactions:  (shopId) => collection(db, "shops", shopId ?? getShopId(), "transactions"),
  inventoryLogs: (shopId) => collection(db, "shops", shopId ?? getShopId(), "inventoryLogs"),
  settings:      (shopId) => collection(db, "shops", shopId ?? getShopId(), "config"),
};
