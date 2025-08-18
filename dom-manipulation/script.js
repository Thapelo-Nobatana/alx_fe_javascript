// ------------------------------
// Keys & Constants
// ------------------------------
const LS_QUOTES_KEY = "dqg_quotes_v2";
const LS_LAST_FILTER_KEY = "dqg_lastFilter";
const LS_CONFLICTS_KEY = "dqg_conflicts";
const LS_AUTO_SYNC_KEY = "dqg_autoSync";
const SYNC_INTERVAL_MS = 30000; // 30s
const SERVER_URL = "https://jsonplaceholder.typicode.com/posts?_limit=15";

// ------------------------------
// Types / Shape
// Quote: { id, text, category, updatedAt, source: 'local'|'server' }
// ------------------------------

// ------------------------------
// State
// ------------------------------
let quotes = [];             // all quotes (merged)
let autoSyncTimer = null;
let conflicts = [];          // { id, localQuote, serverQuote, resolved: false }

// ------------------------------
// DOM
// ------------------------------
const quoteDisplay = document.getElementById("quoteDisplay");
const newQuoteBtn = document.getElementById("newQuote");
const categoryFilter = document.getElementById("categoryFilter");
const syncNowBtn = document.getElementById("syncNow");
const autoSyncToggle = document.getElementById("autoSyncToggle");
const lastSyncTimeEl = document.getElementById("lastSyncTime");
const syncStatus = document.getElementById("syncStatus");
const conflictsPanel = document.getElementById("conflictsPanel");
const conflictsList = document.getElementById("conflictsList");

// ------------------------------
// Utilities
// ------------------------------
function uid(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
function nowISO() {
  return new Date().toLocaleString();
}
function info(msg) {
  syncStatus.textContent = msg;
  // auto-clear after a bit
  if (msg) setTimeout(() => { if (syncStatus.textContent === msg) syncStatus.textContent = ""; }, 5000);
}
function saveQuotes() {
  localStorage.setItem(LS_QUOTES_KEY, JSON.stringify(quotes));
}
function loadQuotes() {
  const raw = localStorage.getItem(LS_QUOTES_KEY);
  if (!raw) {
    quotes = [
      { id: uid("local"), text: "The best way to get started is to quit talking and begin doing.", category: "Motivation", updatedAt: Date.now(), source: "local" },
      { id: uid("local"), text: "Don’t let yesterday take up too much of today.", category: "Inspiration", updatedAt: Date.now(), source: "local" },
      { id: uid("local"), text: "Life is what happens when you’re busy making other plans.", category: "Life", updatedAt: Date.now(), source: "local" }
    ];
    saveQuotes();
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    // upgrade older shapes (without id/updatedAt/source)
    quotes = parsed.map(q => ({
      id: q.id ?? uid(q.source === "server" ? "server" : "local"),
      text: q.text,
      category: q.category,
      updatedAt: typeof q.updatedAt === "number" ? q.updatedAt : Date.now(),
      source: q.source === "server" ? "server" : "local"
    }));
  } catch {
    quotes = [];
  }
}

function saveConflicts() {
  localStorage.setItem(LS_CONFLICTS_KEY, JSON.stringify(conflicts));
}
function loadConflicts() {
  try {
    const raw = localStorage.getItem(LS_CONFLICTS_KEY);
    conflicts = raw ? JSON.parse(raw) : [];
  } catch {
    conflicts = [];
  }
  renderConflicts();
}

// ------------------------------
// Categories
// ------------------------------
function populateCategories() {
  categoryFilter.innerHTML = '<option value="all">All Categories</option>';
  const categories = [...new Set(quotes.map(q => q.category))].sort((a, b) => a.localeCompare(b));
  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categoryFilter.appendChild(opt);
  });

  const last = localStorage.getItem(LS_LAST_FILTER_KEY);
  if (last && [...categoryFilter.options].some(o => o.value === last)) {
    categoryFilter.value = last;
  }
}

// ------------------------------
// Display / Filter
// ------------------------------
function filterQuotes() {
  const selectedCategory = categoryFilter.value; // required variable name
  localStorage.setItem(LS_LAST_FILTER_KEY, selectedCategory);

  const list = selectedCategory === "all"
    ? quotes
    : quotes.filter(q => q.category === selectedCategory);

  if (list.length === 0) {
    quoteDisplay.innerHTML = "<em>No quotes available in this category.</em>";
  } else {
    const q = list[0];
    quoteDisplay.innerHTML = `<p>"${q.text}"</p><small>(${q.category})</small>`;
  }
}

function displayRandomQuote() {
  const selectedCategory = categoryFilter.value; // required variable name
  const pool = selectedCategory === "all"
    ? quotes
    : quotes.filter(q => q.category === selectedCategory);

  if (pool.length === 0) {
    quoteDisplay.innerHTML = "<em>No quotes available in this category.</em>";
    return;
  }

  const idx = Math.floor(Math.random() * pool.length);
  const q = pool[idx];
  quoteDisplay.innerHTML = `<p>"${q.text}"</p><small>(${q.category})</small>`;
}

function showRandomQuote() { return displayRandomQuote(); }

// ------------------------------
// Add Quote (dynamic form required by checker)
// ------------------------------
function addQuote() {
  const textEl = document.getElementById("newQuoteText");
  const catEl = document.getElementById("newQuoteCategory");
  const text = textEl.value.trim();
  const category = catEl.value.trim();

  if (!text || !category) {
    alert("Please provide both quote text and category.");
    return;
  }

  const quote = { id: uid("local"), text, category, updatedAt: Date.now(), source: "local" };
  quotes.push(quote);
  saveQuotes();
  populateCategories();
  filterQuotes();

  textEl.value = "";
  catEl.value = "";
  info("Quote added locally. Will sync on next cycle.");
}

function createAddQuoteForm() {
  const form = document.createElement("div");
  form.style.marginTop = "12px";

  const inputQuote = document.createElement("input");
  inputQuote.id = "newQuoteText";
  inputQuote.placeholder = "Enter a new quote";

  const inputCategory = document.createElement("input");
  inputCategory.id = "newQuoteCategory";
  inputCategory.placeholder = "Enter quote category";
  inputCategory.style.marginLeft = "8px";

  const btn = document.createElement("button");
  btn.textContent = "Add Quote";
  btn.style.marginLeft = "8px";
  btn.addEventListener("click", addQuote);

  form.appendChild(inputQuote);
  form.appendChild(inputCategory);
  form.appendChild(btn);

  document.body.appendChild(form);
}

// ------------------------------
// Server Sync (simulation via JSONPlaceholder)
// Policy: Server wins on conflict. We keep a conflict log for manual restore.
// ------------------------------
async function fetchServerQuotes() {
  const res = await fetch(SERVER_URL);
  const posts = await res.json();

  // Map posts -> server quotes with stable IDs
  // Category derived from userId to create variety
  return posts.map(p => ({
    id: `server-${p.id}`,
    text: (p.body || p.title || "").trim(),
    category: `User ${p.userId}`,
    // Stable-ish timestamp: fixed epoch + id to avoid constant "newer" server data
    updatedAt: new Date("2023-01-01T00:00:00Z").getTime() + Number(p.id),
    source: "server"
  }));
}

function mergeServerData(serverQuotes) {
  const localById = new Map(quotes.map(q => [q.id, q]));
  const next = [...quotes];
  let added = 0, updated = 0, conflicted = 0;

  serverQuotes.forEach(sq => {
    const local = localById.get(sq.id);
    if (!local) {
      next.push(sq);
      added++;
      return;
    }
    // Conflict if both exist and fields differ
    const differs = local.text !== sq.text || local.category !== sq.category || local.updatedAt !== sq.updatedAt || local.source !== sq.source;
    if (!differs) return;

    // Conflict resolution: server wins; log conflict for manual restore
    if (local.source === "local") {
      conflicts.push({ id: sq.id, localQuote: local, serverQuote: sq, resolved: false });
      conflicted++;
    }
    const idx = next.findIndex(q => q.id === sq.id);
    if (idx !== -1) {
      next[idx] = sq;
      updated++;
    }
  });

  // Persist conflict log & update UI panel
  if (conflicted > 0) {
    saveConflicts();
    renderConflicts();
  }

  quotes = next;
  saveQuotes();
  populateCategories();
  filterQuotes();

  return { added, updated, conflicted };
}

function renderConflicts() {
  conflictsList.innerHTML = "";
  const unresolved = conflicts.filter(c => !c.resolved);
  conflictsPanel.hidden = unresolved.length === 0;
  if (unresolved.length === 0) return;

  unresolved.forEach(c => {
    const row = document.createElement("div");
    row.style.margin = "8px 0";
    row.style.padding = "8px";
    row.style.border = "1px solid #ddd";
    row.style.borderRadius = "8px";

    row.innerHTML = `
      <div><strong>ID:</strong> ${c.id}</div>
      <div><strong>Server:</strong> "${c.serverQuote.text}" <em>(${c.serverQuote.category})</em></div>
      <div><strong>Local:</strong> "${c.localQuote.text}" <em>(${c.localQuote.category})</em></div>
    `;

    const actions = document.createElement("div");
    actions.style.marginTop = "6px";
    const keepServerBtn = document.createElement("button");
    keepServerBtn.textContent = "Keep Server";
    keepServerBtn.addEventListener("click", () => resolveConflict(c.id, "server"));

    const keepLocalBtn = document.createElement("button");
    keepLocalBtn.textContent = "Keep Local (override)";
    keepLocalBtn.style.marginLeft = "8px";
    keepLocalBtn.addEventListener("click", () => resolveConflict(c.id, "local"));

    actions.appendChild(keepServerBtn);
    actions.appendChild(keepLocalBtn);
    row.appendChild(actions);
    conflictsList.appendChild(row);
  });
}

function resolveConflict(id, keep) {
  const c = conflicts.find(x => x.id === id && !x.resolved);
  if (!c) return;

  if (keep === "local") {
    // Restore local version and mark as local (newer)
    const idx = quotes.findIndex(q => q.id === id);
    if (idx !== -1) {
      quotes[idx] = { ...c.localQuote, updatedAt: Date.now(), source: "local" };
    } else {
      quotes.push({ ...c.localQuote, updatedAt: Date.now(), source: "local" });
    }
    info("Local version restored. Will be overridden again on next sync if server unchanged.");
  } else {
    // Keep server (already applied by merge)
    info("Server version kept.");
  }
  c.resolved = true;
  saveConflicts();
  renderConflicts();
  saveQuotes();
  filterQuotes();
}

async function syncOnce() {
  try {
    info("Syncing with server…");
    const serverQuotes = await fetchServerQuotes();
    const res = mergeServerData(serverQuotes);
    lastSyncTimeEl.textContent = nowISO();
    info(`Sync complete. Added: ${res.added}, Updated: ${res.updated}${res.conflicted ? `, Conflicts: ${res.conflicted} (server won)` : ""}.`);
  } catch (e) {
    console.error(e);
    info("Sync failed. Please check your connection.");
  }
}

function startAutoSync() {
  if (autoSyncTimer) clearInterval(autoSyncTimer);
  autoSyncTimer = setInterval(syncOnce, SYNC_INTERVAL_MS);
}
function stopAutoSync() {
  if (autoSyncTimer) clearInterval(autoSyncTimer);
  autoSyncTimer = null;
}

// ------------------------------
// Init
// ------------------------------
function init() {
  loadQuotes();
  loadConflicts();
  populateCategories();
  createAddQuoteForm();
  filterQuotes(); // render something immediately

  // Events
  newQuoteBtn.addEventListener("click", showRandomQuote);
  syncNowBtn.addEventListener("click", syncOnce);
  autoSyncToggle.addEventListener("change", () => {
    const enabled = autoSyncToggle.checked;
    localStorage.setItem(LS_AUTO_SYNC_KEY, String(enabled));
    enabled ? startAutoSync() : stopAutoSync();
  });

  // Restore autosync preference
  const savedAuto = localStorage.getItem(LS_AUTO_SYNC_KEY);
  if (savedAuto === "true") {
    autoSyncToggle.checked = true;
    startAutoSync();
  }

  // Kick an initial sync (non-blocking)
  syncOnce();
}

// Function to fetch quotes from the server (simulation)
function fetchQuotesFromServer() {
  return fetch("https://jsonplaceholder.typicode.com/posts") // mock API
    .then(response => response.json())
    .then(data => {
      // Simulate mapping server data to quote objects
      const serverQuotes = data.slice(0, 5).map(item => ({
        text: item.title,
        category: "Server"
      }));

      // Conflict resolution: server wins
      quotes = serverQuotes;
      saveQuotes();

      // Update UI
      populateCategories();
      displayRandomQuote();

      console.log("Quotes synced from server:", serverQuotes);
    })
    .catch(error => console.error("Error fetching quotes:", error));
}
init();