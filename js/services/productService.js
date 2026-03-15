// ═══════════════════════════════════════════════════════
// KERALA SMART POS — PRODUCT SERVICE
// js/services/productService.js
// ═══════════════════════════════════════════════════════

import { col } from "../firebase.js";
import {
  doc, addDoc, updateDoc, deleteDoc,
  getDocs, onSnapshot, query, where, orderBy,
  serverTimestamp, increment,
} from "firebase/firestore";

export function subscribeProducts(callback, categoryFilter = null) {
  const q = categoryFilter
    ? query(col.products(), where("category", "==", categoryFilter), orderBy("name"))
    : query(col.products(), orderBy("name"));

  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    (err)  => console.error("[KSP] subscribeProducts:", err)
  );
}

export const listenProductsRealtime = subscribeProducts;

export async function getProducts() {
  const snap = await getDocs(query(col.products(), orderBy("name")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Add a product, or merge stock if a product with the same name (case-insensitive)
 * or barcode already exists.
 *
 * @param {{ name:string, price:number, stock:number, category:string, barcode?:string|null }} product
 * @returns {{ merged: boolean, id: string }}
 */
export async function addOrMergeProduct({ name, price, stock, category, barcode = null }) {
  const nameNormalized = name.trim().toLowerCase();

  // 1. Search by normalized name
  const nameQ = query(col.products(), where("nameNormalized", "==", nameNormalized));
  const nameSnap = await getDocs(nameQ);

  if (!nameSnap.empty) {
    const existing = nameSnap.docs[0];
    await updateDoc(doc(col.products(), existing.id), {
      stock: increment(+stock),
      updatedAt: serverTimestamp(),
    });
    return { merged: true, id: existing.id, existingStock: existing.data().stock };
  }

  // 2. If barcode provided, search by barcode
  if (barcode) {
    const barcodeQ = query(col.products(), where("barcode", "==", barcode));
    const barcodeSnap = await getDocs(barcodeQ);
    if (!barcodeSnap.empty) {
      const existing = barcodeSnap.docs[0];
      await updateDoc(doc(col.products(), existing.id), {
        stock: increment(+stock),
        updatedAt: serverTimestamp(),
      });
      return { merged: true, id: existing.id, existingStock: existing.data().stock };
    }
  }

  // 3. Create new product
  const ref = await addDoc(col.products(), {
    name: name.trim(),
    nameNormalized,
    price: +price,
    stock: +stock,
    category,
    barcode: barcode || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { merged: false, id: ref.id };
}

/**
 * Legacy addProduct — creates a new document regardless of duplicates.
 * Use addOrMergeProduct() for new product submissions.
 */
export async function addProduct({ name, price, stock, category, barcode = null }) {
  const nameNormalized = name.trim().toLowerCase();
  return addDoc(col.products(), {
    name: name.trim(),
    nameNormalized,
    price: +price,
    stock: +stock,
    category,
    barcode: barcode || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateProduct(id, updates) {
  return updateDoc(doc(col.products(), id), {
    ...updates,
    // Sync nameNormalized if name is being updated
    ...(updates.name ? { nameNormalized: updates.name.trim().toLowerCase() } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function updateProductStock(productId, newStock) {
  if (newStock < 0) throw new Error("Stock cannot be negative.");
  return updateDoc(doc(col.products(), productId), {
    stock: +newStock,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProduct(productId) {
  return deleteDoc(doc(col.products(), productId));
}
