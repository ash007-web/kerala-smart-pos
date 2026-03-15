// ═══════════════════════════════════════════════════════
// KERALA SMART POS — POS PAGE
// js/pages/pos.js
// ═══════════════════════════════════════════════════════

import { subscribeProducts } from "../services/productService.js";
import { completeSale }      from "../services/transactionService.js";
import { waitForAuth }       from "../firebase.js";

const EMOJI = { staples:"🌾", dairy:"🥛", snacks:"🍿", beverages:"☕", toiletries:"🧼", household:"🧹" };
const TAX   = 0.18;

let allProducts  = [];
let filteredProds= [];
let cart         = [];
let activeMethod = "cash";
let activeCat    = "all";
let unsub        = null;

document.addEventListener("DOMContentLoaded", async () => {
  const searchInput = document.getElementById("searchInput");
  const productsGrid = document.getElementById("productsGrid");
  const billItems = document.getElementById("billItems");
  const categoryChips = document.querySelector(".category-chips");
  const paymentMethods = document.querySelector(".payment-methods");

  if (!productsGrid) return;

  // ── Wait for auth to resolve before touching Firestore ─────
  // Without this, auth.currentUser is null and all queries hit
  // shops/demo-shop instead of the real user's shop.
  let shopId;
  try {
    const user = await waitForAuth();
    shopId = user.uid;
    console.log("[KSP] POS auth ready, shopId:", shopId);
  } catch {
    return; // waitForAuth redirects to login.html on failure
  }

  // Show loading state
  productsGrid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
    <span class="material-symbols-outlined" style="animation:spin 1s linear infinite;font-size:2rem">progress_activity</span>
    <p>Loading products…</p>
  </div>`;

  let firstLoad = true;
  function startListener() {
    if (unsub) unsub();
    unsub = subscribeProducts((products) => {
      allProducts = products;
      console.log("[KSP] Loaded products:", products.length);
      firstLoad = false;
      applyFilters();
    }, activeCat === "all" ? null : activeCat);
  }
  startListener();

  function applyFilters() {
    const term = searchInput?.value.trim().toLowerCase() ?? "";
    filteredProds = allProducts.filter(p =>
      (activeCat === "all" || p.category === activeCat) &&
      (!term || p.name.toLowerCase().includes(term))
    );
    renderGrid();
  }

  // ── UI Event Mappings ──────────────────────────────────
  if (searchInput) {
    searchInput.addEventListener("input", applyFilters);
  }

  if (categoryChips) {
    categoryChips.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      activeCat = chip.dataset.cat;
      startListener();
    });
  }

  if (paymentMethods) {
    paymentMethods.addEventListener("click", (e) => {
      const btn = e.target.closest(".pay-btn");
      if (!btn) return;
      document.querySelectorAll(".pay-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeMethod = btn.dataset.method;
    });
  }

  // ── Exposed Globals for HTML ────────────────────────────
  window.addToCart = function(id) {
    const p = allProducts.find(p => p.id === id);
    if (!p || p.stock <= 0) return;
    const item = cart.find(i => i.id === id);
    if (item) {
      if (item.qty >= p.stock) { showToast(`Max stock: ${p.stock}`, "warning"); return; }
      item.qty++;
    } else {
      cart.push({ id:p.id, name:p.name, price:p.price, category:p.category, qty:1 });
    }
    animCard(id);
    renderBill(); renderGrid();
  };

  window.changeQty = function(id, delta) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) { cart = cart.filter(i => i.id !== id); }
    renderBill(); renderGrid();
  };

  window.removeItem = function(id) {
    cart = cart.filter(i => i.id !== id);
    renderBill(); renderGrid();
  };

  window.clearBill = function() {
    if (!cart.length) return;
    if (!confirm("Clear all items from the bill?")) return;
    cart = [];
    renderBill(); renderGrid();
  };

  window.completeBill = async function() {
    if (!cart.length) return;
    const btn = document.getElementById("completeBtn");
    btn.disabled = true;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = `<span class="material-symbols-outlined" style="animation:spin 0.8s linear infinite">progress_activity</span> Processing…`;
    try {
      const { billId, total } = await completeSale({
        items: cart.map(i => ({ id:i.id, name:i.name, price:i.price, qty:i.qty })),
        paymentMethod: activeMethod,
        taxRate: TAX,
      });
      // Show success
      document.getElementById("successRef").textContent   = `Bill #${billId}`;
      document.getElementById("successTotal").textContent = fmtINR(total);
      document.getElementById("successMethod").textContent= activeMethod.toUpperCase();
      document.getElementById("successOverlay").classList.add("show");
      cart = [];
      renderBill(); renderGrid();
      showToast(`Bill #${billId} — payment received!`, "success");
    } catch(e) {
      console.error("[KSP] Sale failed:", e);
      showToast("Transaction failed: " + e.message, "danger");
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  };

  window.closeSuccess = function() {
    document.getElementById("successOverlay").classList.remove("show");
  };

  // Keyboard shortcuts
  document.addEventListener("keydown", e => {
    if (e.key === "/" && document.activeElement.tagName !== "INPUT") {
      e.preventDefault();
      searchInput?.focus();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") completeBill();
  });

  window.addEventListener("beforeunload", () => unsub?.());
});

// ── Helpers ──────────────────────────────────────────────

function renderGrid() {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;
  if (filteredProds.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><span class="material-symbols-outlined">search_off</span><p>No products found</p></div>`;
    return;
  }
  grid.innerHTML = filteredProds.map(p => {
    const inCart  = cart.find(i => i.id === p.id);
    const low     = p.stock <= 5 && p.stock > 0;
    const oos     = p.stock <= 0;
    return `
      <div class="product-card ${inCart?'in-cart':''} ${oos?'out-of-stock':''} anim-fade-up"
           data-id="${p.id}" onclick="addToCart('${p.id}')">
        ${low && !oos ? `<div class="low-chip">Low</div>` : ""}
        ${inCart      ? `<div class="cart-badge">${inCart.qty}</div>` : ""}
        <span class="product-emoji">${EMOJI[p.category]??'📦'}</span>
        <div class="product-name">${p.name}</div>
        <div class="product-cat">${p.category}</div>
        <div class="product-footer">
          <span class="product-price">${fmtINR(p.price)}</span>
          <span class="product-stock ${low?'low':''}">${p.stock}</span>
        </div>
        <button class="add-btn" onclick="event.stopPropagation();addToCart('${p.id}')" ${oos?'disabled':''}>
          <span class="material-symbols-outlined">add</span>
        </button>
      </div>`;
  }).join("");
}

function renderBill() {
  const el      = document.getElementById("billItems");
  const summary = document.getElementById("billSummary");
  const btn     = document.getElementById("completeBtn");
  if (!el) return;

  if (cart.length === 0) {
    el.innerHTML = `
      <div class="empty-bill">
        <span class="material-symbols-outlined">shopping_basket</span>
        <p>No items added</p>
        <small>Tap a product or press / to search</small>
      </div>`;
    if (summary) summary.style.display = "none";
    if (btn)     btn.disabled = true;
    return;
  }

  el.innerHTML = cart.map(i => `
    <div class="bill-item">
      <div style="flex:1;min-width:0;">
        <div class="bill-item-name">${i.name}</div>
        <div class="bill-item-unit">${fmtINR(i.price)} each</div>
      </div>
      <div class="qty-ctrl">
        <button class="qty-btn" onclick="changeQty('${i.id}',-1)"><span class="material-symbols-outlined">remove</span></button>
        <span class="qty-val">${i.qty}</span>
        <button class="qty-btn" onclick="changeQty('${i.id}',1)"><span class="material-symbols-outlined">add</span></button>
      </div>
      <span class="item-total">${fmtINR(i.price * i.qty)}</span>
      <button class="remove-item" onclick="removeItem('${i.id}')"><span class="material-symbols-outlined">close</span></button>
    </div>`).join("");

  const sub  = cart.reduce((s,i) => s + i.price * i.qty, 0);
  const tax  = +(sub * TAX).toFixed(2);
  const tot  = +(sub + tax).toFixed(2);

  document.getElementById("subtotal").textContent = fmtINR(sub);
  document.getElementById("taxAmt").textContent   = fmtINR(tax);
  document.getElementById("totalAmt").textContent = fmtINR(tot);
  if (summary) summary.style.display = "block";
  if (btn)     btn.disabled = false;
}

function animCard(id) {
  const el = document.querySelector(`[data-id="${id}"]`);
  if (!el) return;
  el.classList.remove("anim-pop");
  void el.offsetWidth;
  el.classList.add("anim-pop");
}
