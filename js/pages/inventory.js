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


const EMOJI = { staples:"🌾", dairy:"🥛", snacks:"🍿", beverages:"☕", toiletries:"🧼", household:"🧹" };

let allItems  = [];
let activeCat = "all";
let searchTerm = "";
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

  // Show loading state
  invBody.innerHTML = `<tr><td colspan="6"><div class="empty-state">
    <span class="material-symbols-outlined" style="animation:spin 1s linear infinite;font-size:2rem">progress_activity</span>
    <p>Loading inventory…</p>
  </div></td></tr>`;

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
  const statsEl = document.getElementById("invStats");
  if (!statsEl) return;
  const total = allItems.length;
  const low   = allItems.filter(p => p.stock <= 5 && p.stock > 0).length;
  const oos   = allItems.filter(p => p.stock <= 0).length;
  statsEl.innerHTML = `
    <div class="inv-stat"><div class="inv-stat-label">TOTAL PRODUCTS</div><div class="inv-stat-value">${total}</div></div>
    <div class="inv-stat"><div class="inv-stat-label">LOW STOCK</div><div class="inv-stat-value" style="color:var(--gold-400)">${low}</div></div>
    <div class="inv-stat"><div class="inv-stat-label">OUT OF STOCK</div><div class="inv-stat-value" style="color:var(--red-400)">${oos}</div></div>
  `;
}

function renderTable() {
  const tbody = document.getElementById("invBody");
  if (!tbody) return;
  let items = allItems;
  if (activeCat !== "all") items = items.filter(p => p.category === activeCat);
  if (searchTerm) items = items.filter(p => p.name.toLowerCase().includes(searchTerm));

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><span class="material-symbols-outlined">inventory_2</span><p>No items found</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(p => {
    const low = p.stock <= 5 && p.stock > 0;
    const oos = p.stock <= 0;
    const statusBadge = oos
      ? `<span class="badge badge-danger">Out of Stock</span>`
      : low
      ? `<span class="badge badge-warning">Low Stock</span>`
      : `<span class="badge badge-success">In Stock</span>`;
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
        <td class="mono" style="font-weight:700;">${fmtINR(p.price)}</td>
        <td><strong>${p.stock}</strong> units</td>
        <td>${statusBadge}</td>
        <td>
          <div class="row-actions">
            <button class="action-btn stock" onclick="openStockModal('${p.id}')" title="Update Stock">
              <span class="material-symbols-outlined">package_2</span>
            </button>
            <button class="action-btn edit" onclick="openEditModal('${p.id}')" title="Edit">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="action-btn del" onclick="handleDelete('${p.id}','${p.name.replace(/'/g,"\\'")}' )" title="Delete">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </td>
      </tr>`;
  }).join("");
}
