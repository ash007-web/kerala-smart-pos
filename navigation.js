// ═══════════════════════════════════════════════════════
// KERALA SMART POS — NAVIGATION COMPONENT
// js/navigation.js
// ═══════════════════════════════════════════════════════

import { logout, onAuthChange, getLowStockProducts } from "./firebase.js";

const NAV_ITEMS = [
  { href:"index.html",      icon:"dashboard",     label:"Dashboard"  },
  { href:"pos.html",        icon:"point_of_sale", label:"New Bill"   },
  { href:"inventory.html",  icon:"inventory_2",   label:"Inventory"  },
  { href:"customers.html",  icon:"group",         label:"Customers"  },
  { href:"ledger.html",     icon:"receipt_long",  label:"Ledger"     },
  { href:"reports.html",    icon:"bar_chart",     label:"Reports"    },
];

const BOTTOM_ITEMS = [
  { href:"settings.html",   icon:"settings",      label:"Settings"   },
];

document.addEventListener("DOMContentLoaded", () => {
  const page = location.pathname.split("/").pop() || "index.html";
  if (page === "login.html") return;

  // Auth guard
  onAuthChange((user) => {
    if (!user && page !== "login.html") {
      window.location.href = "login.html";
      return;
    }
    buildHeader(user);
    buildSidebar(page);
    loadLowStockBadge();
    applyDarkModePreference();
  });
});

function buildHeader(user) {
  const el = document.getElementById("navbar");
  if (!el) return;
  const initials = user?.displayName
    ? user.displayName.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()
    : user?.email?.slice(0,2).toUpperCase() ?? "KS";

  el.innerHTML = `
    <header class="ksp-header anim-fade">
      <a href="index.html" class="logo" style="text-decoration:none;">
        <div class="logo-mark">
          <span class="material-symbols-outlined">storefront</span>
        </div>
        <div>
          Kerala Smart POS
          <span>Digital Kirana Platform</span>
        </div>
      </a>
      <div class="header-right">
        <button class="icon-btn notif-btn" title="Alerts" onclick="window.location.href='inventory.html'">
          <span class="material-symbols-outlined">notifications</span>
          <span class="notif-dot" id="notifDot" style="display:none;"></span>
        </button>
        <button class="icon-btn" title="Toggle dark mode" id="darkToggleBtn" onclick="toggleDarkMode()">
          <span class="material-symbols-outlined" id="darkIcon">dark_mode</span>
        </button>
        <div class="user-avatar" title="${user?.email ?? ''}" onclick="window.location.href='settings.html'">${initials}</div>
      </div>
    </header>
  `;
}

function buildSidebar(activePage) {
  const el = document.getElementById("sidebar");
  if (!el) return;

  const makeItem = (item) => {
    const active = activePage === item.href ? "active" : "";
    return `
      <a href="${item.href}" class="nav-item ${active}" title="${item.label}">
        <span class="material-symbols-outlined">${item.icon}</span>
        <span>${item.label}</span>
        ${item.badge ? `<span class="nav-badge" id="lowStockBadge">${item.badge}</span>` : ""}
      </a>`;
  };

  el.innerHTML = `
    <nav class="ksp-sidebar anim-slide">
      <div class="sidebar-section-label">Main</div>
      ${NAV_ITEMS.map(makeItem).join("")}
      <div class="sidebar-bottom">
        ${BOTTOM_ITEMS.map(makeItem).join("")}
        <button class="nav-item" onclick="handleLogout()" style="width:100%;background:transparent;color:var(--red-400);">
          <span class="material-symbols-outlined">logout</span>
          <span>Logout</span>
        </button>
      </div>
    </nav>
  `;
}

async function loadLowStockBadge() {
  try {
    const low = await getLowStockProducts(5);
    if (low.length > 0) {
      const dot = document.getElementById("notifDot");
      if (dot) dot.style.display = "block";
      // Add badge to Inventory nav item
      const inventoryLink = document.querySelector('a[href="inventory.html"]');
      if (inventoryLink && !inventoryLink.querySelector(".nav-badge")) {
        const badge = document.createElement("span");
        badge.className = "nav-badge";
        badge.textContent = low.length;
        inventoryLink.appendChild(badge);
      }
    }
  } catch(e) { /* silent */ }
}

window.handleLogout = async function() {
  if (confirm("Are you sure you want to logout?")) await logout();
};

// ─── Dark mode ──────────────────────────────────────────
function applyDarkModePreference() {
  if (localStorage.getItem("ksp-dark") === "true") {
    document.body.classList.add("dark");
    const icon = document.getElementById("darkIcon");
    if (icon) icon.textContent = "light_mode";
  }
}

window.toggleDarkMode = function() {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem("ksp-dark", isDark);
  const icon = document.getElementById("darkIcon");
  if (icon) icon.textContent = isDark ? "light_mode" : "dark_mode";
};

// ─── Utility: show toast ─────────────────────────────────
let toastContainer;
window.showToast = function(message, type = "info", icon = null) {
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }
  const icons = { success:"check_circle", danger:"error", warning:"warning", info:"info" };
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span class="material-symbols-outlined">${icon ?? icons[type] ?? "info"}</span>${message}`;
  toastContainer.appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 350);
  }, 3000);
};

// ─── Utility: format currency ────────────────────────────
window.fmtINR = (n) =>
  "₹" + (+n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

window.fmtINRShort = (n) => {
  n = +n;
  if (n >= 1_00_000) return "₹" + (n / 1_00_000).toFixed(1) + "L";
  if (n >= 1_000)    return "₹" + (n / 1_000).toFixed(1) + "K";
  return "₹" + n.toLocaleString("en-IN");
};

window.fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
};

window.fmtTime = (ts) => {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" });
};

window.relativeTime = (ts) => {
  if (!ts) return "";
  const d   = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  const m    = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return fmtDate(ts);
};
