// ═══════════════════════════════════════════════════════
// KERALA SMART POS — INVENTORY PAGE
// js/pages/inventory.js
// ═══════════════════════════════════════════════════════

import {
  subscribeProducts, addProduct, addOrMergeProduct,
  updateProduct, updateProductStock, deleteProduct
} from "../services/productService.js";
import { col }            from "../firebase.js";
import { waitForAuth }    from "../firebase.js";
import { doc, addDoc, updateDoc, serverTimestamp, increment } from "firebase/firestore";


const EMOJI = { staples:"🌾", dairy:"🥛", snacks:"🍿", beverages:"☕", toiletries:"🧼", household:"🧹", stationary:"✏️" };

let allItems  = [];
let activeCat = "all";
let searchTerm = "";
let stockFilter = "all"; // 'all' | 'low' | 'oos'
let unsub     = null;
// Stock modal state
let stockProductId   = null;
let stockCurrentVal  = 0;

document.addEventListener("DOMContentLoaded", async () => {
  const invBody  = document.getElementById("invBody");
  const invSearch = document.getElementById("invSearch");
  const catTabs  = document.getElementById("catTabs");

  if (!invBody) return;

  // ── Wait for auth before any Firestore reads ───────────────
  try {
    const user = await waitForAuth();
    console.log("[KSP] Inventory auth ready, shopId:", user.uid);
  } catch {
    return; // redirected to login
  }

  // Loader is handled globally by subscribeProducts in productService
  if (window.lucide) window.lucide.createIcons();

  // ── Real-time listener ────────────────────────────
  unsub = subscribeProducts((products) => {
    allItems = products;
    console.log("[KSP] Inventory loaded:", products.length, "products");
    renderStats();
    renderTable();
  });

  // ── Category tabs ─────────────────────────────────────
  if (catTabs) {
    catTabs.addEventListener("click", (e) => {
      const tab = e.target.closest(".cat-tab");
      if (!tab) return;
      document.querySelectorAll(".cat-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      activeCat = tab.dataset.cat;
      renderTable();
    });
  }

  // ── Expose stock filter for jQuery buttons ──────────────
  window.invFilterByStock = function(type) {
    stockFilter = type; // 'low' | 'oos' | 'all'
    renderTable();
  };

  // ── Search ────────────────────────────────────────────
  if (invSearch) {
    invSearch.addEventListener("input", e => {
      searchTerm = e.target.value.trim().toLowerCase();
      renderTable();
    });
  }

  // ── Keyboard: ESC closes modals ───────────────────────
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      closeModal();
      closeStockModal();
    }
  });

  // ── Add/Edit Product Modal ────────────────────────────
  window.openAddModal = function() {
    document.getElementById("modalTitle").textContent = "Add Product";
    document.getElementById("editId").value  = "";
    document.getElementById("fName").value   = "";
    document.getElementById("fPrice").value  = "";
    document.getElementById("fStock").value  = "";
    document.getElementById("fBarcode").value= "";
    document.getElementById("fCat").value    = "staples";
    const modal = document.getElementById("productModal");
    modal.classList.add("show");
    requestAnimationFrame(() => document.getElementById("fName").focus());
  };

  window.openEditModal = function(id) {
    const p = allItems.find(p => p.id === id);
    if (!p) return;
    document.getElementById("modalTitle").textContent = "Edit Product";
    document.getElementById("editId").value  = id;
    document.getElementById("fName").value   = p.name;
    document.getElementById("fPrice").value  = p.price;
    document.getElementById("fStock").value  = p.stock;
    document.getElementById("fBarcode").value= p.barcode ?? "";
    document.getElementById("fCat").value    = p.category;
    const modal = document.getElementById("productModal");
    modal.classList.add("show");
    requestAnimationFrame(() => document.getElementById("fName").focus());
  };

  window.closeModal = function() {
    document.getElementById("productModal")?.classList.remove("show");
  };

  window.saveProduct = async function() {
    const id      = document.getElementById("editId").value;
    const name    = document.getElementById("fName").value.trim();
    const price   = parseFloat(document.getElementById("fPrice").value);
    const stock   = parseInt(document.getElementById("fStock").value);
    const cat     = document.getElementById("fCat").value;
    const barcode = document.getElementById("fBarcode").value.trim() || null;

    if (!name || isNaN(price) || isNaN(stock)) {
      showToast("Please fill in all required fields", "warning"); return;
    }
    if (price < 0 || stock < 0) {
      showToast("Price and stock cannot be negative", "warning"); return;
    }
    const btn = document.getElementById("saveBtn");
    btn.disabled = true;
    try {
      if (id) {
        await updateProduct(id, { name, price, stock, category: cat, barcode });
        showToast(`"${name}" updated`, "success");
      } else {
        // Use merge logic for new products added from inventory modal
        const result = await addOrMergeProduct({ name, price, stock, category: cat, barcode });
        if (result.merged) {
          showToast(`+${stock} units merged into existing "${name}"`, "success");
        } else {
          showToast(`"${name}" added to inventory`, "success");
        }
      }
      closeModal();
    } catch(e) {
      showToast("Save failed: " + e.message, "danger");
    } finally {
      btn.disabled = false;
    }
  };

  window.handleDelete = async function(id, name) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteProduct(id);
      showToast(`"${name}" deleted`, "info");
    } catch(e) {
      showToast("Delete failed: " + e.message, "danger");
    }
  };

  // Close product modal on backdrop click
  const productModal = document.getElementById("productModal");
  if (productModal) {
    productModal.addEventListener("click", e => {
      if (e.target === e.currentTarget) closeModal();
    });
  }

  // ── Stock Update Modal ────────────────────────────────
  window.openStockModal = function(id) {
    const p = allItems.find(p => p.id === id);
    if (!p) return;
    stockProductId  = id;
    stockCurrentVal = p.stock;

    document.getElementById("stkProductName").textContent = p.name;
    document.getElementById("stkCurrentStock").textContent = p.stock;
    document.getElementById("stkDelta").value = "";
    document.getElementById("stkReason").value = "restock";

    const modal = document.getElementById("stockModal");
    modal.classList.add("show");
    requestAnimationFrame(() => document.getElementById("stkDelta").focus());
  };

  window.closeStockModal = function() {
    document.getElementById("stockModal")?.classList.remove("show");
    stockProductId = null;
  };

  window.applyStockPreset = function(delta) {
    const el = document.getElementById("stkDelta");
    el.value = delta;
    el.focus();
  };

  window.saveStockUpdate = async function() {
    const deltaStr = document.getElementById("stkDelta").value.trim();
    const delta    = parseInt(deltaStr, 10);
    const reason   = document.getElementById("stkReason").value;

    if (deltaStr === "" || isNaN(delta)) {
      showToast("Enter a valid stock change amount", "warning"); return;
    }
    if (delta === 0) {
      showToast("Change amount cannot be zero", "warning"); return;
    }

    const newStock = stockCurrentVal + delta;
    if (newStock < 0) {
      showToast(
        `Cannot reduce below 0. Current: ${stockCurrentVal}, Change: ${delta}, Result: ${newStock}`,
        "warning"
      );
      return;
    }

    const btn = document.getElementById("saveStockBtn");
    btn.disabled = true;

    try {
      const productRef = doc(col.products(), stockProductId);
      const p = allItems.find(p => p.id === stockProductId);

      // Update product stock
      await updateDoc(productRef, {
        stock: newStock,
        updatedAt: serverTimestamp(),
      });

      // Log to inventoryLogs
      await addDoc(col.inventoryLogs(), {
        productId:     stockProductId,
        productName:   p?.name ?? "",
        change:        delta,
        reason,
        billId:        null,
        previousStock: stockCurrentVal,
        newStock,
        timestamp:     serverTimestamp(),
      });

      showToast(
        `Stock ${delta > 0 ? "+" + delta : delta} applied to "${p?.name}". New: ${newStock}`,
        "success"
      );
      closeStockModal();
    } catch(e) {
      showToast("Stock update failed: " + e.message, "danger");
    } finally {
      btn.disabled = false;
    }
  };

  // Close stock modal on backdrop click
  const stockModal = document.getElementById("stockModal");
  if (stockModal) {
    stockModal.addEventListener("click", e => {
      if (e.target === e.currentTarget) closeStockModal();
    });
  }

  window.addEventListener("beforeunload", () => unsub?.());
});

// ── Render helpers ────────────────────────────────────────

function renderStats() {
  const total = allItems.length;
  const low   = allItems.filter(p => p.stock <= 5 && p.stock > 0).length;
  const oos   = allItems.filter(p => p.stock <= 0).length;
  // Update stat elements directly if they exist (IDs set in inventory.html)
  const elTotal = document.getElementById("statTotal");
  const elLow   = document.getElementById("statLow");
  const elOut   = document.getElementById("statOut");
  if (elTotal) { elTotal.textContent = total; elTotal.classList.add("amount"); }
  if (elLow)   { elLow.textContent   = low;   elLow.classList.add("amount"); }
  if (elOut)   { elOut.textContent   = oos;   elOut.classList.add("amount"); }
  if (window.lucide) window.lucide.createIcons();
}

function renderTable() {
  const tbody = document.getElementById("invBody");
  if (!tbody) return;
  let items = allItems;
  if (activeCat !== "all") items = items.filter(p => p.category === activeCat);
  if (searchTerm) items = items.filter(p => p.name.toLowerCase().includes(searchTerm));
  // Stock filter from jQuery buttons
  if (stockFilter === "low") items = items.filter(p => p.stock > 0 && p.stock <= 5);
  if (stockFilter === "oos") items = items.filter(p => p.stock <= 0);

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i data-lucide="package-search" style="width:48px;height:48px;opacity:0.3"></i><p>No items found</p></div></td></tr>`;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  tbody.innerHTML = items.map(p => {
    const low = p.stock <= 5 && p.stock > 0;
    const oos = p.stock <= 0;
    const statusBadge = oos
      ? `<span class="badge" style="background:#fee2e2;color:var(--color-danger)">Out of Stock</span>`
      : low
      ? `<span class="badge" style="background:#fef3c7;color:var(--color-warning)">Low Stock</span>`
      : `<span class="badge" style="background:#d1fae5;color:var(--color-success)">In Stock</span>`;
    return `
      <tr class="anim-fade">
        <td>
          <div class="item-cell">
            <div class="item-emoji">${EMOJI[p.category] ?? '📦'}</div>
            <div>
              <div class="item-info-name">${p.name}</div>
              <div class="item-info-cat">${p.category}${p.barcode ? ` · #${p.barcode}` : ''}</div>
            </div>
          </div>
        </td>
        <td class="amount">${fmtINR(p.price)}</td>
        <td><strong>${p.stock}</strong> units</td>
        <td>${statusBadge}</td>
        <td>
          <div class="row-actions">
            <button class="action-btn stock" onclick="openStockModal('${p.id}')" title="Update Stock">
              <i data-lucide="package-plus"></i>
            </button>
            <button class="action-btn edit" onclick="openEditModal('${p.id}')" title="Edit">
              <i data-lucide="pencil"></i>
            </button>
            <button class="action-btn del" onclick="handleDelete('${p.id}','${p.name.replace(/'/g,"\\'")}' )" title="Delete">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </td>
      </tr>`;
  }).join("");
  if (window.lucide) window.lucide.createIcons();
}
