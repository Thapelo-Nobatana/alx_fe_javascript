// ===== Global Variables =====
let quotes = JSON.parse(localStorage.getItem("quotes")) || [
  { text: "The best way to get started is to quit talking and begin doing.", category: "Motivation" },
  { text: "Don’t let yesterday take up too much of today.", category: "Inspiration" }
];

// ===== Storage Helpers =====
function saveQuotes() {
  localStorage.setItem("quotes", JSON.stringify(quotes));
}

function saveLastViewedQuote(quote) {
  sessionStorage.setItem("lastViewedQuote", JSON.stringify(quote));
}

// ===== Quote Display =====
function showRandomQuote() {
  const randomIndex = Math.floor(Math.random() * quotes.length);
  const quote = quotes[randomIndex];
  document.getElementById("quoteDisplay").textContent = `"${quote.text}" - ${quote.category}`;
  saveLastViewedQuote(quote);
}

function displayRandomQuote() {
  showRandomQuote();
}

// ===== Add Quote =====
function createAddQuoteForm() {
  const text = document.getElementById("quote").value.trim();
  const category = document.getElementById("category").value.trim();

  if (text && category) {
    const newQuote = { text, category };
    quotes.push(newQuote);
    saveQuotes();
    populateCategories();
    postQuoteToServer(newQuote);
    alert("Quote added!");
  } else {
    alert("Please fill in both fields.");
  }
}

// ===== Category Filtering =====
function populateCategories() {
  const categoryFilter = document.getElementById("categoryFilter");
  const uniqueCategories = [...new Set(quotes.map(q => q.category))];
  categoryFilter.innerHTML = `<option value="all">All Categories</option>`;
  uniqueCategories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    categoryFilter.appendChild(option);
  });

  // Restore last selected filter
  const lastFilter = localStorage.getItem("selectedCategory");
  if (lastFilter) {
    categoryFilter.value = lastFilter;
    filterQuotes();
  }
}

function filterQuotes() {
  const selectedCategory = document.getElementById("categoryFilter").value;
  localStorage.setItem("selectedCategory", selectedCategory);

  const filtered = selectedCategory === "all"
    ? quotes
    : quotes.filter(q => q.category === selectedCategory);

  const display = document.getElementById("quoteDisplay");
  display.innerHTML = "";
  filtered.forEach(q => {
    const p = document.createElement("p");
    p.textContent = `"${q.text}" - ${q.category}`;
    display.appendChild(p);
  });
}

// ===== Import/Export JSON =====
function exportToJsonFile() {
  const blob = new Blob([JSON.stringify(quotes)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "quotes.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importFromJsonFile(event) {
  const fileReader = new FileReader();
  fileReader.onload = function(e) {
    const importedQuotes = JSON.parse(e.target.result);
    quotes.push(...importedQuotes);
    saveQuotes();
    populateCategories();
    alert("Quotes imported successfully!");
  };
  fileReader.readAsText(event.target.files[0]);
}

// ===== Server Sync =====
function fetchQuotesFromServer() {
  fetch("https://jsonplaceholder.typicode.com/posts")
    .then(res => res.json())
    .then(serverQuotes => {
      // Conflict resolution: server wins
      quotes = serverQuotes.map(item => ({
        text: item.title || `Quote ${item.id}`,
        category: "Server"
      }));
      saveQuotes();
      populateCategories();
      filterQuotes();
      console.log("Quotes synced from server");
    })
    .catch(err => console.error("Error fetching server quotes:", err));
}

function postQuoteToServer(quote) {
  fetch("https://jsonplaceholder.typicode.com/posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(quote)
  })
    .then(res => res.json())
    .then(data => {
      console.log("Quote posted to server:", data);
    })
    .catch(err => console.error("Error posting quote:", err));
}

// ===== Init =====
window.onload = function() {
  populateCategories();

  const lastViewed = sessionStorage.getItem("lastViewedQuote");
  if (lastViewed) {
    const q = JSON.parse(lastViewed);
    document.getElementById("quoteDisplay").textContent = `"${q.text}" - ${q.category}`;
  } else {
    displayRandomQuote();
  }

  // Periodic sync
  setInterval(fetchQuotesFromServer, 30000);
};