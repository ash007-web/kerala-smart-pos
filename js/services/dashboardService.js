// ═══════════════════════════════════════════════════════
// KERALA SMART POS — DASHBOARD SERVICE
// js/services/dashboardService.js
// Uses npm imports (firebase/firestore) via Vite
// ═══════════════════════════════════════════════════════

import { col } from "../firebase.js";
import {
  getDocs, query, where, orderBy, limit,
  getCountFromServer,
} from "firebase/firestore";
import { fetchTransactionsByRange } from "./transactionService.js";
import { addProduct }  from "./productService.js";
import { addCustomer } from "./customerService.js";

export async function getTotalProducts() {
  const snap = await getCountFromServer(col.products());
  return snap.data().count;
}

export async function getTodayRevenue() {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end   = new Date(); end.setHours(23, 59, 59, 999);
  const txs   = await fetchTransactionsByRange(start, end);
  return txs.reduce((s, t) => s + (t.total ?? 0), 0);
}

export async function getLowStockProducts(threshold = 5) {
  const q    = query(col.products(), where("stock", "<=", threshold), orderBy("stock"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getRecentTransactions(n = 10) {
  const q    = query(col.transactions(), orderBy("timestamp", "desc"), limit(n));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getTodaySummary() {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end   = new Date(); end.setHours(23, 59, 59, 999);
  const txs   = await fetchTransactionsByRange(start, end);

  const totalRevenue = txs.reduce((s, t) => s + (t.total ?? 0), 0);
  const billCount    = txs.length;
  const avgBill      = billCount ? totalRevenue / billCount : 0;

  const paymentBreakdown = txs.reduce((acc, t) => {
    const m = t.paymentMethod ?? "other";
    acc[m]  = (acc[m] ?? 0) + (t.total ?? 0);
    return acc;
  }, {});

  const productSales = {};
  txs.forEach(t => (t.items ?? []).forEach(i => {
    productSales[i.name] = (productSales[i.name] ?? 0) + i.qty;
  }));
  const topProducts = Object.entries(productSales)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([name, qty]) => ({ name, qty }));

  return {
    totalRevenue: +totalRevenue.toFixed(2),
    billCount,
    avgBill: Math.round(avgBill),
    paymentBreakdown,
    topProducts,
  };
}

export async function seedDemoData() {
  const products = [
    { name:"Aashirvaad Atta (5kg)",  price:240, stock:22,  category:"staples"    },
    { name:"Tata Salt (1kg)",         price:20,  stock:104, category:"staples"    },
    { name:"Amul Butter (100g)",      price:54,  stock:5,   category:"dairy"      },
    { name:"Maggi Noodles (70g)",     price:14,  stock:200, category:"snacks"     },
    { name:"Sugar (1kg)",             price:42,  stock:45,  category:"staples"    },
    { name:"Toor Dal (1kg)",          price:110, stock:3,   category:"staples"    },
    { name:"Sunflower Oil (1L)",      price:145, stock:30,  category:"staples"    },
    { name:"Bru Coffee (100g)",       price:180, stock:12,  category:"beverages"  },
    { name:"Parle-G Biscuits",        price:10,  stock:150, category:"snacks"     },
    { name:"Colgate Toothpaste 150g", price:75,  stock:28,  category:"toiletries" },
    { name:"Lifebuoy Soap (4pk)",     price:60,  stock:2,   category:"toiletries" },
    { name:"Vim Bar (200g)",          price:22,  stock:60,  category:"household"  },
  ];

  const customers = [
    { name:"Rajesh Kumar", phone:"9876543210", email:"rajesh@email.com", address:"MG Road, Thrissur"  },
    { name:"Priya Singh",  phone:"9876543211", email:"priya@email.com",  address:"Palakkad Highway"   },
    { name:"Anita Sharma", phone:"9876543212", email:"anita@email.com",  address:"Kozhikode North"    },
    { name:"Suresh Gupta", phone:"9876543213", email:"suresh@email.com", address:"Ernakulam"          },
    { name:"Meena Iyer",   phone:"9876543214", email:"meena@email.com",  address:"Trivandrum"         },
    { name:"Vikram Desai", phone:"9876543215", email:"vikram@email.com", address:"Calicut"            },
  ];

  await Promise.all(products.map(p => addProduct(p)));
  await Promise.all(customers.map(c => addCustomer(c)));
  console.log("[KSP] Demo data seeded ✓");
}
