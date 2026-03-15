// ═══════════════════════════════════════════════════════
// KERALA SMART POS — CUSTOMER SERVICE
// js/services/customerService.js
// Uses npm imports (firebase/firestore) via Vite
// ═══════════════════════════════════════════════════════

import { col } from "../firebase.js";
import {
  doc, addDoc, updateDoc, deleteDoc,
  getDocs, onSnapshot, query, orderBy,
  serverTimestamp,
} from "firebase/firestore";

export function subscribeCustomers(callback) {
  const q = query(col.customers(), orderBy("name"));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    (err)  => console.error("[KSP] subscribeCustomers:", err)
  );
}

export const listenCustomersRealtime = subscribeCustomers;

export async function getCustomers() {
  const snap = await getDocs(query(col.customers(), orderBy("name")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function searchCustomers(queryStr) {
  const all = await getCustomers();
  const q   = queryStr.toLowerCase();
  return all.filter(c =>
    c.name.toLowerCase().includes(q) ||
    (c.phone || "").includes(q) ||
    (c.email || "").toLowerCase().includes(q)
  );
}

export async function addCustomer({ name, phone, email = "", address = "" }) {
  return addDoc(col.customers(), {
    name, phone, email, address,
    totalSpent: 0,
    billCount:  0,
    createdAt:  serverTimestamp(),
  });
}

export async function updateCustomer(id, updates) {
  return updateDoc(doc(col.customers(), id), {
    ...updates, updatedAt: serverTimestamp(),
  });
}

export async function deleteCustomer(customerId) {
  return deleteDoc(doc(col.customers(), customerId));
}
