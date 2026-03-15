// ═══════════════════════════════════════════════════════
// KERALA SMART POS — FIREBASE SERVICES
// js/firebase.js
// ═══════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, enableIndexedDbPersistence,
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, onSnapshot,
  query, where, orderBy, limit,
  serverTimestamp, writeBatch, increment,
  Timestamp, getCountFromServer
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signOut as fbSignOut,
  GoogleAuthProvider, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ─── CONFIG ─────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyC0YL7SjOboWHyGXg0zhsG4bqCxocH4Jhs",
  authDomain:        "kerala-smart-pos.firebaseapp.com",
  projectId:         "kerala-smart-pos",
  storageBucket:     "kerala-smart-pos.firebasestorage.app",
  messagingSenderId: "928348494735",
  appId:             "1:928348494735:web:871c42b3feaf74ce93c9fa"
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((e) =>
  console.warn("[KSP] Offline persistence:", e.code)
);

export { db, auth };

// ─── SHOP SCOPE ────────────────────────────────────────
// For demo / single-tenant, we use a fixed shopId.
// In production, replace with auth.currentUser.uid
const getShopId = () => auth.currentUser?.uid ?? "demo-shop";

const col = {
  products:      () => collection(db, "shops", getShopId(), "products"),
  customers:     () => collection(db, "shops", getShopId(), "customers"),
  transactions:  () => collection(db, "shops", getShopId(), "transactions"),
  inventoryLogs: () => collection(db, "shops", getShopId(), "inventoryLogs"),
};

// ═══════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function loginWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export async function registerWithEmail(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  await fbSignOut(auth);
  window.location.href = "login.html";
}

export function getCurrentUser() {
  return auth.currentUser;
}

// ═══════════════════════════════════════════════════════
// PRODUCTS — real-time
// ═══════════════════════════════════════════════════════

/** Real-time listener. Returns unsubscribe fn. */
export function subscribeProducts(callback, categoryFilter = null) {
  let q = categoryFilter
    ? query(col.products(), where("category", "==", categoryFilter), orderBy("name"))
    : query(col.products(), orderBy("name"));

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, (err) => console.error("[KSP] subscribeProducts:", err));
}

export async function addProduct({ name, price, stock, category, barcode = null }) {
  return addDoc(col.products(), {
    name, price: +price, stock: +stock,
    category, barcode,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateProduct(id, updates) {
  return updateDoc(doc(col.products(), id), { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteProduct(id) {
  return deleteDoc(doc(col.products(), id));
}

// ═══════════════════════════════════════════════════════
// CUSTOMERS — real-time
// ═══════════════════════════════════════════════════════

export function subscribeCustomers(callback) {
  const q = query(col.customers(), orderBy("name"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function addCustomer({ name, phone, email = "", address = "" }) {
  return addDoc(col.customers(), {
    name, phone, email, address,
    totalSpent: 0, billCount: 0,
    createdAt: serverTimestamp(),
  });
}

export async function updateCustomer(id, updates) {
  return updateDoc(doc(col.customers(), id), { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteCustomer(id) {
  return deleteDoc(doc(col.customers(), id));
}

// ═══════════════════════════════════════════════════════
// TRANSACTIONS — atomic batch write
// ═══════════════════════════════════════════════════════

/**
 * Complete a POS sale. Single atomic Firestore batch:
 *   • Creates transaction doc
 *   • Decrements stock for each item
 *   • Writes an inventory log per item
 *   • Updates customer totalSpent/billCount (if linked)
 */
export async function completeSale({ items, paymentMethod, customerId = null, taxRate = 0.18 }) {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const tax      = +(subtotal * taxRate).toFixed(2);
  const total    = +(subtotal + tax).toFixed(2);
  const billId   = "QB-" + Date.now().toString(36).toUpperCase();

  const batch = writeBatch(db);

  // 1. Transaction doc
  const txRef = doc(col.transactions());
  batch.set(txRef, {
    billId,
    items: items.map(i => ({
      productId: i.id, name: i.name,
      price: i.price, qty: i.qty,
      lineTotal: +(i.price * i.qty).toFixed(2),
    })),
    subtotal, tax, total,
    paymentMethod,
    customerId: customerId ?? null,
    status: "paid",
    timestamp: serverTimestamp(),
  });

  // 2. Stock decrement + 3. Inventory log
  for (const item of items) {
    batch.update(doc(col.products(), item.id), {
      stock: increment(-item.qty),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(col.inventoryLogs()), {
      productId: item.id, productName: item.name,
      change: -item.qty, reason: "sale", billId,
      timestamp: serverTimestamp(),
    });
  }

  // 4. Customer stats
  if (customerId) {
    batch.update(doc(col.customers(), customerId), {
      totalSpent: increment(total),
      billCount:  increment(1),
      updatedAt:  serverTimestamp(),
    });
  }

  await batch.commit();
  return { billId, total, txId: txRef.id };
}

/** Real-time listener for latest N transactions */
export function subscribeTransactions(callback, n = 50) {
  const q = query(col.transactions(), orderBy("timestamp", "desc"), limit(n));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

/** Fetch transactions between two Date objects */
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

// ═══════════════════════════════════════════════════════
// DASHBOARD ANALYTICS
// ═══════════════════════════════════════════════════════

export async function getTodaySummary() {
  const start = new Date(); start.setHours(0,0,0,0);
  const end   = new Date(); end.setHours(23,59,59,999);
  const txs   = await fetchTransactionsByRange(start, end);

  const totalRevenue = txs.reduce((s, t) => s + (t.total ?? 0), 0);
  const billCount    = txs.length;
  const avgBill      = billCount ? totalRevenue / billCount : 0;

  const paymentBreakdown = txs.reduce((acc, t) => {
    const m = t.paymentMethod ?? "other";
    acc[m] = (acc[m] ?? 0) + t.total;
    return acc;
  }, {});

  // Top products
  const productSales = {};
  txs.forEach(t => (t.items ?? []).forEach(i => {
    productSales[i.name] = (productSales[i.name] ?? 0) + i.qty;
  }));
  const topProducts = Object.entries(productSales)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([name, qty]) => ({ name, qty }));

  return {
    totalRevenue: +totalRevenue.toFixed(2),
    billCount, avgBill: Math.round(avgBill),
    paymentBreakdown, topProducts,
  };
}

export async function getLowStockProducts(threshold = 5) {
  const q = query(col.products(), where("stock", "<=", threshold), orderBy("stock"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ═══════════════════════════════════════════════════════
// SEED DEMO DATA (run once to populate Firestore)
// ═══════════════════════════════════════════════════════
export async function seedDemoData() {
  const products = [
    { name:"Aashirvaad Atta (5kg)",  price:240, stock:22, category:"staples" },
    { name:"Tata Salt (1kg)",         price:20,  stock:104,category:"staples" },
    { name:"Amul Butter (100g)",      price:54,  stock:5,  category:"dairy"   },
    { name:"Maggi Noodles (70g)",     price:14,  stock:200,category:"snacks"  },
    { name:"Sugar (1kg)",             price:42,  stock:45, category:"staples" },
    { name:"Toor Dal (1kg)",          price:110, stock:3,  category:"staples" },
    { name:"Sunflower Oil (1L)",      price:145, stock:30, category:"staples" },
    { name:"Bru Coffee (100g)",       price:180, stock:12, category:"beverages"},
    { name:"Parle-G Biscuits",        price:10,  stock:150,category:"snacks"  },
    { name:"Colgate Toothpaste 150g", price:75,  stock:28, category:"toiletries"},
    { name:"Lifebuoy Soap (4pk)",     price:60,  stock:2,  category:"toiletries"},
    { name:"Vim Bar (200g)",          price:22,  stock:60, category:"household"},
  ];
  for (const p of products) await addProduct(p);

  const customers = [
    { name:"Rajesh Kumar",  phone:"9876543210", email:"rajesh@email.com",  address:"MG Road, Thrissur" },
    { name:"Priya Singh",   phone:"9876543211", email:"priya@email.com",   address:"Palakkad Highway" },
    { name:"Anita Sharma",  phone:"9876543212", email:"anita@email.com",   address:"Kozhikode North" },
    { name:"Suresh Gupta",  phone:"9876543213", email:"suresh@email.com",  address:"Ernakulam" },
    { name:"Meena Iyer",    phone:"9876543214", email:"meena@email.com",   address:"Trivandrum" },
    { name:"Vikram Desai",  phone:"9876543215", email:"vikram@email.com",  address:"Calicut" },
  ];
  for (const c of customers) await addCustomer(c);

  console.log("[KSP] Demo data seeded ✓");
}
