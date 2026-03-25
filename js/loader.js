/**
 * QuickBill Custom Branded Loader
 * components/loader.js
 */

const LOADER_HTML = `
<div id="qb-loader" class="qb-loader hidden">
  <div class="loader-content">
    <svg class="logo" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 2L3 14h7l-1 8 10-12h-7z"/>
    </svg>
    <p class="loader-text">Processing...</p>
  </div>
</div>
`;

/**
 * Ensures the loader HTML exists in the document body.
 */
function ensureLoaderExists() {
  if (!document.getElementById("qb-loader")) {
    const div = document.createElement("div");
    div.innerHTML = LOADER_HTML.trim();
    document.body.appendChild(div.firstChild);
  }
}

/**
 * Shows the branded loader with optional text.
 * @param {string} text - The message to display under the logo.
 */
export function showLoader(text = "Processing...") {
  ensureLoaderExists();
  const loader = document.getElementById("qb-loader");
  const textEl = loader.querySelector(".loader-text");
  if (textEl) textEl.innerText = text;
  loader.classList.remove("hidden");
}

/**
 * Hides the branded loader.
 */
export function hideLoader() {
  const loader = document.getElementById("qb-loader");
  if (loader) {
    loader.classList.add("hidden");
  }
}

/**
 * Cycles through a set of messages while loading.
 * @param {string[]} messages - Array of strings to cycle through.
 * @param {number} interval - Time in ms between changes.
 */
export function showLoaderWithCycling(messages = ["Syncing data...", "Almost there...", "Finalizing..."], interval = 2000) {
  showLoader(messages[0]);
  let i = 1;
  const timer = setInterval(() => {
    const loader = document.getElementById("qb-loader");
    if (!loader || loader.classList.contains("hidden")) {
      clearInterval(timer);
      return;
    }
    showLoader(messages[i % messages.length]);
    i++;
  }, interval);
}
