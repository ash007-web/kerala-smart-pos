// ═══════════════════════════════════════════════════════
// KERALA SMART POS — NAVIGATION COMPONENT
// js/navigation.js
// ═══════════════════════════════════════════════════════

import { logout, onAuthChange, onAuthChangeWithProvision } from "./services/authService.js";
import { getLowStockProducts } from "./services/dashboardService.js";
import { showToast as _showToast } from "./utils/toast.js";
import { fmtINR as _fmtINR, fmtINRShort as _fmtINRShort, fmtDate as _fmtDate, fmtTime as _fmtTime } from "./utils/formatters.js";

// ─── Expose utilities as window globals ─────────────────
// NOTE: Future improvement → prefer direct ES module imports in page scripts
// e.g. import { showToast } from "../utils/toast.js"
// For now, window globals allow existing inline <script type="module"> blocks to work.
window.showToast    = _showToast;
window.fmtINR       = _fmtINR;
window.fmtINRShort  = _fmtINRShort;
window.fmtDate      = _fmtDate;
window.fmtTime      = _fmtTime;

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

  // Auth guard — redirect to login if not authenticated.
  // onAuthChangeWithProvision also auto-creates the shop doc on first login.
  onAuthChangeWithProvision((user, isNewShop) => {
    if (!user && page !== "login.html") {
      window.location.href = "login.html";
      return;
    }
    buildHeader(user);
    buildSidebar(page);
    loadLowStockBadge();
    applyDarkModePreference();

    // Welcome message on first login
    if (isNewShop) {
      // Delay slightly so the toast module has mounted
      setTimeout(() => {
        showToast(
          `Welcome to Kerala Smart POS, ${user.displayName ?? user.email}! Start by adding your first product.`,
          "success",
          6000
        );
      }, 800);
    }
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Kerala Smart POS logo">
            <!-- Storefront arch -->
            <path d="M3 10.5C3 7.46 7.03 5 12 5C16.97 5 21 7.46 21 10.5" stroke="#412402" stroke-width="1.8" stroke-linecap="round"/>
            <!-- Kathakali eye motif -->
            <ellipse cx="12" cy="10" rx="3" ry="2" stroke="#412402" stroke-width="1.5"/>
            <circle cx="12" cy="10" r="1" fill="#412402"/>
            <!-- Receipt lines -->
            <line x1="7" y1="14" x2="17" y2="14" stroke="#412402" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="8" y1="17" x2="16" y2="17" stroke="#412402" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="9" y1="20" x2="15" y2="20" stroke="#412402" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <div>
          Kerala Smart POS
          <span>Digital Kirana Platform</span>
        </div>
      </a>
      <div class="header-right">
        <button class="icon-btn notif-btn" title="Low stock alerts" onclick="window.location.href='inventory.html'">
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
      // Append badge count to the Inventory nav item
      const inventoryLink = document.querySelector('a[href="inventory.html"]');
      if (inventoryLink && !inventoryLink.querySelector(".nav-badge")) {
        const badge = document.createElement("span");
        badge.className = "nav-badge";
        badge.textContent = low.length;
        inventoryLink.appendChild(badge);
      }
    }
  } catch(e) { /* silent — badge is non-critical */ }
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

// ─── Global: relativeTime ───────────────────────────────

window.relativeTime = (ts) => {
  if (!ts) return "";
  const d    = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  const m    = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return fmtDate(ts);
};
