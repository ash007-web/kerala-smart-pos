// ═══════════════════════════════════════════════════════
// KERALA SMART POS — ADD PRODUCT PAGE
// js/pages/add-product.js
// ═══════════════════════════════════════════════════════

import { addOrMergeProduct } from "../services/productService.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("addProductForm");
  const catChips = document.getElementById("catChips");
  const pCategory = document.getElementById("pCategory");

  if (!form) return;

  // ── Category chip selection ─────────────────────────
  catChips.addEventListener("click", (e) => {
    const chip = e.target.closest(".cat-chip");
    if (!chip) return;
    document.querySelectorAll(".cat-chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    pCategory.value = chip.dataset.cat;
  });

  // ── Form submit ─────────────────────────────────────
  form.addEventListener("submit", handleProductSubmit);

  window.resetForm = function() {
    form.reset();
    document.querySelectorAll(".cat-chip").forEach(c => c.classList.remove("active"));
    const defaultChip = document.querySelector("[data-cat='staples']");
    if (defaultChip) defaultChip.classList.add("active");
    pCategory.value = "staples";
  };

  window.closeSuccess = function() {
    document.getElementById("successOverlay").classList.remove("show");
  };
});

async function handleProductSubmit(e) {
  e.preventDefault();
  const name     = document.getElementById("pName").value.trim();
  const price    = parseFloat(document.getElementById("pPrice").value);
  const stock    = parseInt(document.getElementById("pStock").value, 10);
  const category = document.getElementById("pCategory").value;
  const barcode  = document.getElementById("pBarcode").value.trim();

  if (!name || isNaN(price) || isNaN(stock)) {
    showToast("Please fill all required fields.", "warning");
    return;
  }
  if (price < 0 || stock < 0) {
    showToast("Price and stock cannot be negative.", "warning");
    return;
  }

  const btn = document.getElementById("saveBtn");
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="material-symbols-outlined" style="animation:spin 0.8s linear infinite">progress_activity</span> Saving…`;

  try {
    const result = await addOrMergeProduct({
      name, price, stock, category, barcode: barcode || null,
    });

    if (result.merged) {
      const newTotal = (result.existingStock || 0) + stock;
      document.getElementById("successMsg").textContent =
        `${stock} units added to existing "${name}" stock. Total now: ${newTotal} units.`;
    } else {
      document.getElementById("successMsg").textContent =
        `"${name}" added to Firestore inventory.`;
    }
    document.getElementById("successOverlay").classList.add("show");
    resetForm();
  } catch(err) {
    showToast("Failed to save: " + err.message, "danger");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}
