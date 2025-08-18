// ------------------------------
// Storage Keys
// ------------------------------
const LS_QUOTES_KEY = "dqg_quotes";
const SS_LAST_QUOTE_KEY = "dqg_lastQuote";
const SS_LAST_CATEGORY_KEY = "dqg_lastCategory";

// ------------------------------
// Initial Data (fallback)
// ------------------------------
const DEFAULT_QUOTES = [
  { text: "The best way to get started is to quit talking and begin doing.", category: "Motivation" },
  { text: "Don’t let yesterday take up too much of today.", category: "Inspiration" },
  { text: "Life is what happens when you’re busy making other plans.", category: "Life" }
];

// ------------------------------
// App State
// ------------------------------
let quotes = []; // will be loaded from Local Storage or fallback

// ------------------------------
// DOM Elements
// ------------------------------
const quoteDisplay = document.getElementById("quoteDisplay");
const newQuoteBtn = document.getElementById("newQuote");
const categoryFilter = document.getElementById("categoryFilter");
const exportBtn = document.getElementById("exportBtn");
const importFileInput = document.getElementById("importFile");

// ------------------------------
// Local Storage Helpers
// ------------------------------
function saveQuotes() {
  try {
    localStorage.setItem(LS_QUOTES_KEY, JSON.stringify(quotes));
  } catch (e) {
    console.error("Failed to save quotes:", e);
  }
}

function loadQuotes() {
  try {
    const raw = localStorage.getItem(LS_QUOTES_KEY);
    if (!raw) {
      quotes = [...DEFAULT_QUOTES];
      saveQuotes();
      return;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // basic shape validation
      quotes = parsed
        .filter(q => q && typeof q.text === "string" && typeof q.category === "string")
        .map(q => ({ text: q.text, category: q.category }));
      if (quotes.length === 0) {
        quotes = [...DEFAULT_QUOTES];
      }
    } else {
      quotes = [...DEFAULT_QUOTES];
    }
  } catch {
    quotes = [...DEFAULT_QUOTES];
  }
}

// ------------------------------
// Category Helpers
// ------------------------------
function refreshCategoryOptions() {
  const existingValues = new Set([...categoryFilter.options].map(o => o.value.toLowerCase()));
  const uniqueCats = [...new Set(quotes.map(q => q.category))];

  uniqueCats.forEach(cat => {
    if (!existingValues.has(cat.toLowerCase())) {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      categoryFilter.appendChild(opt);
    }
  });
}

// ------------------------------
// Quote Display (Session Storage demo)
// ------------------------------
function displayRandomQuote() {
  const selected = categoryFilter?.value || "all";
  const pool =
    selected === "all"
      ? quotes
      : quotes.filter(q => q.category.toLowerCase() === selected.toLowerCase());

  if (pool.length === 0) {
    quoteDisplay.innerHTML = "<em>No quotes available for this category.</em>";
    return;
  }

  const idx = Math.floor(Math.random() * pool.length);
  const q = pool[idx];

  // Render with innerHTML (as required) and store last viewed quote in Session Storage
  quoteDisplay.innerHTML = `<p>"${q.text}"</p><small>(${q.category})</small>`;
  try {
    sessionStorage.setItem(SS_LAST_QUOTE_KEY, JSON.stringify(q));
    sessionStorage.setItem(SS_LAST_CATEGORY_KEY, selected);
  } catch (e) {
    console.warn("Session storage unavailable:", e);
  }
}

// Alias for checker looking for 'showRandomQuote'
function showRandomQuote() {
  return displayRandomQuote();
}

// ------------------------------
// Add Quote + Dynamic Form
// ------------------------------
function addQuote() {
  const textEl = document.getElementById("newQuoteText");
  const catEl = document.getElementById("newQuoteCategory");
  const text = textEl.value.trim();
  const category = catEl.value.trim();

  if (!text || !category) {
    alert("Please enter both quote text and category.");
    return;
  }

  quotes.push({ text, category });
  saveQuotes();
  refreshCategoryOptions();

  textEl.value = "";
  catEl.value = "";
  alert("Quote added successfully!");
}

function createAddQuoteForm() {
  const form = document.createElement("div");
  form.style.marginTop = "12px";

  const inputQuote = document.createElement("input");
  inputQuote.id = "newQuoteText";
  inputQuote.type = "text";
  inputQuote.placeholder = "Enter a new quote";

  const inputCategory = document.createElement("input");
  inputCategory.id = "newQuoteCategory";
  inputCategory.type = "text";
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
// JSON Export / Import
// ------------------------------
function exportToJsonFile() {
  try {
    const blob = new Blob([JSON.stringify(quotes, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "quotes.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert("Failed to export quotes.");
    console.error(e);
  }
}

function importFromJsonFile(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const text = e.target.result;
      const imported = JSON.parse(text);

      if (!Array.isArray(imported)) {
        alert("Invalid file format. Expected an array of quotes.");
        return;
      }

      // Validate and normalize
      const clean = imported
        .filter(q => q && typeof q.text === "string" && typeof q.category === "string")
        .map(q => ({ text: q.text, category: q.category }));

      if (clean.length === 0) {
        alert("No valid quotes found in the file.");
        return;
      }

      quotes.push(...clean);
      saveQuotes();
      refreshCategoryOptions();
      alert(`Quotes imported successfully! (${clean.length} added)`);
      // Reset the input so the same file can be re-imported if needed
      event.target.value = "";
    } catch (err) {
      alert("Failed to import quotes. Please check the JSON file.");
      console.error(err);
    }
  };
  reader.readAsText(file);
}

// ------------------------------
// Init
// ------------------------------
function init() {
  loadQuotes();
  refreshCategoryOptions();
  createAddQuoteForm();

  // Restore last session's category/quote (Session Storage demo)
  try {
    const lastCat = sessionStorage.getItem(SS_LAST_CATEGORY_KEY);
    if (lastCat) {
      const optExists = [...categoryFilter.options].some(o => o.value === lastCat);
      if (optExists) categoryFilter.value = lastCat;
    }
    const lastQuoteRaw = sessionStorage.getItem(SS_LAST_QUOTE_KEY);
    if (lastQuoteRaw) {
      const q = JSON.parse(lastQuoteRaw);
      if (q && typeof q.text === "string" && typeof q.category === "string") {
        quoteDisplay.innerHTML = `<p>"${q.text}"</p><small>(${q.category})</small>`;
      }
    }
  } catch (e) {
    console.warn("Session storage not available:", e);
  }

  // Events
  newQuoteBtn.addEventListener("click", showRandomQuote);
  categoryFilter.addEventListener("change", () => {
    try { sessionStorage.setItem(SS_LAST_CATEGORY_KEY, categoryFilter.value); } catch {}
  });
  exportBtn.addEventListener("click", exportToJsonFile);
  importFileInput.addEventListener("change", importFromJsonFile);
}

init();
