// ═══════════════════════════════════════════════════════
// KERALA SMART POS — ADD CUSTOMER PAGE
// js/pages/add-customer.js
// ═══════════════════════════════════════════════════════

import { addCustomer } from "../services/customerService.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("addCustForm");
  if (!form) return;

  // ── Live avatar preview ─────────────────────────────
  window.updatePreview = function() {
    const name    = document.getElementById("cName").value.trim();
    const phone   = document.getElementById("cPhone").value.trim();
    const initials = name
      ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
      : "?";
    document.getElementById("avatarPreview").textContent = initials;
    document.getElementById("namePreview").textContent   = name || "New Customer";
    document.getElementById("phonePreview").textContent  = phone ? `+91 ${phone}` : "Phone not set";
  };

  // ── Form submit ─────────────────────────────────────
  form.addEventListener("submit", handleCustomerSubmit);

  window.resetForm = function() {
    form.reset();
    updatePreview();
  };

  window.closeSuccess = function() {
    document.getElementById("successOverlay").classList.remove("show");
  };
});

async function handleCustomerSubmit(e) {
  e.preventDefault();
  const name    = document.getElementById("cName").value.trim();
  const phone   = document.getElementById("cPhone").value.trim();
  const email   = document.getElementById("cEmail").value.trim();
  const address = document.getElementById("cAddress").value.trim();

  if (!name || !phone) {
    showToast("Name and phone are required.", "warning");
    return;
  }
  if (!/^[0-9]{10}$/.test(phone)) {
    showToast("Please enter a valid 10-digit phone number.", "warning");
    return;
  }

  const btn = document.getElementById("saveBtn");
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="material-symbols-outlined" style="animation:spin 0.8s linear infinite">progress_activity</span> Saving…`;

  try {
    await addCustomer({ name, phone, email, address });
    document.getElementById("successMsg").textContent = `"${name}" has been registered.`;
    document.getElementById("successOverlay").classList.add("show");
    resetForm();
  } catch(err) {
    showToast("Failed to save: " + err.message, "danger");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}
