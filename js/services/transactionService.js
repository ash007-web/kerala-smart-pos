// ═══════════════════════════════════════════════════════
// KERALA SMART POS — TRANSACTION SERVICE
// js/services/transactionService.js
// Uses npm imports (firebase/firestore) via Vite
// ═══════════════════════════════════════════════════════

import { db, col } from "../firebase.js";
import {
  doc, getDoc, getDocs, onSnapshot, query,
  where, orderBy, limit,
  serverTimestamp, runTransaction, increment,
  Timestamp,
} from "firebase/firestore";

export function subscribeTransactions(callback, n = 50) {
  const q = query(col.transactions(), orderBy("timestamp", "desc"), limit(n));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    (err)  => console.error("[KSP] subscribeTransactions:", err)
  );
}

export const listenTransactionsRealtime = subscribeTransactions;

export async function getTransactions() {
  const snap = await getDocs(query(col.transactions(), orderBy("timestamp", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchTransactionsByRange(start, end) {
  const q = query(
    col.transactions(),
    where("timestamp", ">=", Timestamp.fromDate(start)),
    where("timestamp", "<=", Timestamp.fromDate(end)),
    orderBy("timestamp", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getTodaySales() {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end   = new Date(); end.setHours(23, 59, 59, 999);
  return fetchTransactionsByRange(start, end);
}

export async function getMonthlySales() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return fetchTransactionsByRange(start, end);
}

export async function createTransaction({
  items,
  paymentMethod,
  customerId = null,
  taxRate    = 0.18,
}) {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const tax      = +(subtotal * taxRate).toFixed(2);
  const total    = +(subtotal + tax).toFixed(2);
  const billId   = "QB-" + Date.now().toString(36).toUpperCase();

  const txRef = doc(col.transactions());

  await runTransaction(db, async (transaction) => {
    // 1. Check stock for all items
    for (const item of items) {
      const productRef = doc(col.products(), item.id);
      const productSnap = await transaction.get(productRef);
      if (!productSnap.exists()) {
        throw new Error(`Product ${item.name} not found.`);
      }
      const currentStock = productSnap.data().stock || 0;
      if (currentStock < item.qty) {
        throw new Error(`Insufficient stock for ${item.name}. Available: ${currentStock}`);
      }
    }

    // 2. Create transaction document
    transaction.set(txRef, {
      billId,
      items: items.map(i => ({
        productId: i.id,
        name:      i.name,
        price:     i.price,
        qty:       i.qty,
        lineTotal: +(i.price * i.qty).toFixed(2),
      })),
      subtotal, tax, total,
      paymentMethod,
      customerId: customerId ?? null,
      status:    "paid",
      timestamp: serverTimestamp(),
    });

    // 3. Update stock and create logs
    for (const item of items) {
      transaction.update(doc(col.products(), item.id), {
        stock:     increment(-item.qty),
        updatedAt: serverTimestamp(),
      });

      const logRef = doc(col.inventoryLogs());
      transaction.set(logRef, {
        productId:   item.id,
        productName: item.name,
        change:      -item.qty,
        reason:      "sale",
        billId,
        timestamp:   serverTimestamp(),
      });
    }

    // 4. Update customer stats if applicable
    if (customerId) {
      transaction.update(doc(col.customers(), customerId), {
        totalSpent: increment(total),
        billCount:  increment(1),
        updatedAt:  serverTimestamp(),
      });
    }
  });

  return { billId, total, txId: txRef.id };
}

export const completeSale = createTransaction;
