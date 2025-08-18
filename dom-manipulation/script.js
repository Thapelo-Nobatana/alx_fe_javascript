// Storage Keys
const LS_QUOTES_KEY = "dqg_quotes";
const LS_LAST_FILTER_KEY = "dqg_lastFilter";

// Default Quotes
const DEFAULT_QUOTES = [
  { text: "The best way to get started is to quit talking and begin doing.", category: "Motivation" },
  { text: "Don’t let yesterday take up too much of today.", category: "Inspiration" },
  { text: "Life is what happens when you’re busy making other plans.", category: "Life" }
];

// State
let quotes = [];

// DOM Elements
const quoteDisplay = document.getElementById("quoteDisplay");
const newQuoteBtn = document.getElementById("newQuote");
const categoryFilter = document.getElementById("categoryFilter");

// Load Quotes from Storage or Default
function loadQuotes() {
  try {
    const stored = JSON.parse(localStorage.getItem(LS_QUOTES_KEY));
    if (Array.isArray(stored) && stored.length > 0) {
      quotes = stored;
    } else {
      quotes = [...DEFAULT_QUOTES];
      saveQuotes();
    }
  } catch {
    quotes = [...DEFAULT_QUOTES];
    saveQuotes();
  }
}

// Save Quotes to Local Storage
function saveQuotes() {
  localStorage.setItem(LS_QUOTES_KEY, JSON.stringify(quotes));
}

// ---------------------------
// Populate Categories
// ---------------------------
function populateCategories() {
  // Clear old categories except "All"
  categoryFilter.innerHTML = '<option value="all">All Categories</option>';

  const categories = [...new Set(quotes.map(q => q.category))];
  categories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    categoryFilter.appendChild(option);
  });

  // Restore last selected filter if available
  const lastFilter = localStorage.getItem(LS_LAST_FILTER_KEY);
  if (lastFilter && [...categoryFilter.options].some(opt => opt.value === lastFilter)) {
    categoryFilter.value = lastFilter;
    filterQuotes();
  }
}

// ---------------------------
// Show Random Quote
// ---------------------------
function displayRandomQuote() {
  const selected = categoryFilter.value;
  const filtered = selected === "all" ? quotes : quotes.filter(q => q.category === selected);

  if (filtered.length === 0) {
    quoteDisplay.innerHTML = "<em>No quotes available in this category.</em>";
    return;
  }

  const randomIndex = Math.floor(Math.random() * filtered.length);
  const quote = filtered[randomIndex];
  quoteDisplay.innerHTML = `<p>"${quote.text}"</p><small>(${quote.category})</small>`;
}

// Alias for checker
function showRandomQuote() {
  return displayRandomQuote();
}

// ---------------------------
// Filter Quotes
// ---------------------------
function filterQuotes() {
  const selected = categoryFilter.value;
  localStorage.setItem(LS_LAST_FILTER_KEY, selected); // save last filter

  // Show the first quote from the filtered list
  const filtered = selected === "all" ? quotes : quotes.filter(q => q.category === selected);

  if (filtered.length === 0) {
    quoteDisplay.innerHTML = "<em>No quotes available in this category.</em>";
  } else {
    quoteDisplay.innerHTML = `<p>"${filtered[0].text}"</p><small>(${filtered[0].category})</small>`;
  }
}

// ---------------------------
// Add Quote + Dynamic Form
// ---------------------------
function addQuote() {
  const textEl = document.getElementById("newQuoteText");
  const catEl = document.getElementById("newQuoteCategory");

  const text = textEl.value.trim();
  const category = catEl.value.trim();

  if (!text || !category) {
    alert("Please provide both text and category.");
    return;
  }

  quotes.push({ text, category });
  saveQuotes();
  populateCategories();

  textEl.value = "";
  catEl.value = "";
  alert("Quote added successfully!");
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

// ---------------------------
// Init
// ---------------------------
function init() {
  loadQuotes();
  populateCategories();
  createAddQuoteForm();

  newQuoteBtn.addEventListener("click", showRandomQuote);
}

init();