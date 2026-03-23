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
  { href:"index.html",      icon:"layout-dashboard",     label:"Dashboard"  },
  { href:"pos.html",        icon:"calculator",           label:"New Bill"   },
  { href:"inventory.html",  icon:"package",              label:"Inventory"  },
  { href:"customers.html",  icon:"users",                label:"Customers"  },
  { href:"ledger.html",     icon:"receipt-text",         label:"Ledger"     },
  { href:"reports.html",    icon:"bar-chart-3",          label:"Reports"    },
];

const BOTTOM_ITEMS = [
  { href:"settings.html",   icon:"settings",             label:"Settings"   },
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
      <div style="display:flex;align-items:center;">
        <button class="icon-btn mobile-menu-toggle" onclick="toggleSidebar()">
           <i data-lucide="menu"></i>
        </button>
        <a href="index.html" class="logo" style="text-decoration:none;">
          <div class="logo-mark">
            <img src="./assets/logo/quickbill-mark.svg" alt="QuickBill Logo Mark" style="width: 24px; height: 24px;">
          </div>
          <div>
            QuickBill POS
            <span>Seamless Retailing</span>
          </div>
        </a>
      </div>
      <div class="header-right">
        <button class="icon-btn notif-btn" title="Low stock alerts" onclick="window.location.href='inventory.html'">
          <i data-lucide="bell"></i>
          <span class="notif-dot" id="notifDot" style="display:none;"></span>
        </button>
        <button class="icon-btn" title="Toggle dark mode" id="darkToggleBtn" onclick="toggleDarkMode()">
          <i data-lucide="moon" id="darkIcon"></i>
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
        <i data-lucide="${item.icon}"></i>
        <span class="nav-label">${item.label}</span>
      </a>`;
  };

  el.innerHTML = `
    <nav class="ksp-sidebar anim-slide">
      <div class="sidebar-section-label">Main</div>
      ${NAV_ITEMS.map(makeItem).join("")}
      <div class="sidebar-bottom">
        ${BOTTOM_ITEMS.map(makeItem).join("")}
        <button class="nav-item" onclick="handleLogout()" style="width:100%;min-height:44px;background:transparent;color:var(--color-danger);border:none;cursor:pointer;">
          <i data-lucide="log-out"></i>
          <span class="nav-label">Logout</span>
        </button>
      </div>
    </nav>
  `;
  
  if (window.lucide) {
      window.lucide.createIcons();
  }
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
    if (icon) {
        icon.setAttribute("data-lucide", "sun");
        // We re-render specifically this icon
        if (window.lucide) window.lucide.createIcons();
    }
  }
}

window.toggleDarkMode = function() {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem("ksp-dark", isDark);
  const icon = document.getElementById("darkIcon");
  if (icon) {
      icon.setAttribute("data-lucide", isDark ? "sun" : "moon");
      // Since changing an attribute directly doesn't automatically hot-swap the SVG via lucide in all cases natively, 
      // easiest way is replacing innerHTML or creating a fresh icon object:
      icon.innerHTML = `<i data-lucide="${isDark ? 'sun' : 'moon'}" id="darkIcon"></i>`;
      if (window.lucide) window.lucide.createIcons();
  }
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
  return fmtDate(ts);
};

window.toggleSidebar = function() {
  const sidebar = document.getElementById("sidebar");
  if (sidebar) {
    sidebar.classList.toggle("active");
  }
};
