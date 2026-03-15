// ═══════════════════════════════════════════════════════
// KERALA SMART POS — TOAST NOTIFICATION UTILITY
// js/utils/toast.js
// ═══════════════════════════════════════════════════════

const ICONS = {
  success: "check_circle",
  danger:  "error",
  warning: "warning",
  info:    "info",
};

let container = null;

function getContainer() {
  if (!container) {
    container = document.querySelector(".toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      document.body.appendChild(container);
    }
  }
  return container;
}

/**
 * Show a toast notification.
 * @param {string} message  - Text to display
 * @param {"success"|"danger"|"warning"|"info"} type - Visual style
 * @param {number} [duration=3500] - Auto-dismiss delay in ms
 */
export function showToast(message, type = "info", duration = 3500) {
  const c = getContainer();
  const icon = ICONS[type] ?? ICONS.info;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="material-symbols-outlined">${icon}</span>
    <span style="flex:1">${message}</span>
    <button onclick="this.closest('.toast').remove()"
      style="background:none;border:none;cursor:pointer;color:inherit;padding:0;display:flex;align-items:center;">
      <span class="material-symbols-outlined" style="font-size:1rem">close</span>
    </button>`;

  c.appendChild(toast);

  // Trigger enter animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add("show"));
  });

  // Auto-dismiss
  const timer = setTimeout(() => dismissToast(toast), duration);
  toast.addEventListener("mouseenter", () => clearTimeout(timer));
  toast.addEventListener("mouseleave", () => {
    setTimeout(() => dismissToast(toast), 1500);
  });
}

function dismissToast(toast) {
  toast.classList.remove("show");
  toast.addEventListener("transitionend", () => toast.remove(), { once: true });
}
