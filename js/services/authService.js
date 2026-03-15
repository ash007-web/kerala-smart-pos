// ═══════════════════════════════════════════════════════
// KERALA SMART POS — AUTH SERVICE
// js/services/authService.js
// Uses npm imports (firebase/auth) via Vite
// ═══════════════════════════════════════════════════════

import { auth, googleProvider } from "../firebase.js";
import {
  onAuthStateChanged,
  signOut,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { provisionShop } from "./shopService.js";

// Re-export so callers can import from one place
export { provisionShop };

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}
export const loginWithEmail = login;

export async function signup(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}
export const registerWithEmail = signup;

export async function googleLogin() {
  return signInWithPopup(auth, googleProvider);
}
export const loginWithGoogle = googleLogin;

export async function logout() {
  await signOut(auth);
  window.location.href = "login.html";
}

export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Combined auth-state listener that also provisions the shop on first login.
 * Use this instead of onAuthChange in navigation.js so every page benefits.
 *
 * @param {(user: import("firebase/auth").User|null, isNewShop: boolean) => void} callback
 */
export function onAuthChangeWithProvision(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const { isNew } = await provisionShop(user);
        callback(user, isNew);
      } catch (e) {
        console.error("[KSP] Shop provision failed:", e);
        callback(user, false); // still allow login even if provision fails
      }
    } else {
      callback(null, false);
    }
  });
}
