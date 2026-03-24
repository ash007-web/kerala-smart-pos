// vite.config.js
// Vite dev server configuration for Kerala Smart POS
// Multi-page app — each HTML file is its own entry point.
import { defineConfig } from "vite";

export default defineConfig({
  // Serve files from project root
  root: ".",

  // Root-relative base path — required for Vercel/Netlify/Firebase Hosting
  base: "/",

  // Build output directory
  build: {
    outDir: "dist",
    // Support top-level await in module scripts (used by waitForAuth())
    target: "esnext",
    // Multi-page app: declare every HTML file as an entry
    rollupOptions: {
      input: {
        login:       "login.html",
        index:       "index.html",
        pos:         "pos.html",
        inventory:   "inventory.html",
        customers:   "customers.html",
        ledger:      "ledger.html",
        reports:     "reports.html",
        settings:    "settings.html",
        addProduct:  "add-product.html",
        addCustomer: "add-customer.html",
      },
    },
  },

  // Dev server options
  server: {
    port: 3000,
    open: "login.html",   // auto-open login page
    // HMR (Hot Module Replacement) is on by default
  },

  // Optimise firebase (large package) for fast dev startup
  optimizeDeps: {
    include: ["firebase/app", "firebase/auth", "firebase/firestore"],
  },
});
