// Initial Quotes
let quotes = [
  { text: "The best way to get started is to quit talking and begin doing.", category: "Motivation" },
  { text: "Don’t let yesterday take up too much of today.", category: "Inspiration" },
  { text: "Life is what happens when you’re busy making other plans.", category: "Life" }
];

// DOM Elements
const quoteDisplay = document.getElementById("quoteDisplay");
const newQuoteBtn = document.getElementById("newQuote");
const categoryFilter = document.getElementById("categoryFilter");

// ✅ Function to display random quote
function displayRandomQuote() {
  const selectedCategory = categoryFilter.value;
  let filteredQuotes = quotes;

  if (selectedCategory !== "all") {
    filteredQuotes = quotes.filter(q => q.category.toLowerCase() === selectedCategory.toLowerCase());
  }

  if (filteredQuotes.length === 0) {
    quoteDisplay.innerHTML = "<em>No quotes available for this category.</em>";
    return;
  }

  const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
  const quote = filteredQuotes[randomIndex];
  quoteDisplay.innerHTML = `<p>"${quote.text}"</p><small>(${quote.category})</small>`;
}

// ✅ Function to add a new quote
function addQuote() {
  const newQuoteText = document.getElementById("newQuoteText").value.trim();
  const newQuoteCategory = document.getElementById("newQuoteCategory").value.trim();

  if (newQuoteText === "" || newQuoteCategory === "") {
    alert("Please enter both quote text and category.");
    return;
  }

  const newQuote = { text: newQuoteText, category: newQuoteCategory };
  quotes.push(newQuote);

  // Add category to filter dropdown if not already present
  if (![...categoryFilter.options].some(opt => opt.value.toLowerCase() === newQuoteCategory.toLowerCase())) {
    const option = document.createElement("option");
    option.value = newQuoteCategory;
    option.textContent = newQuoteCategory;
    categoryFilter.appendChild(option);
  }

  document.getElementById("newQuoteText").value = "";
  document.getElementById("newQuoteCategory").value = "";
  alert("Quote added successfully!");
}

// ✅ Function to dynamically create the Add Quote form
function createAddQuoteForm() {
  const formDiv = document.createElement("div");

  const inputQuote = document.createElement("input");
  inputQuote.id = "newQuoteText";
  inputQuote.type = "text";
  inputQuote.placeholder = "Enter a new quote";

  const inputCategory = document.createElement("input");
  inputCategory.id = "newQuoteCategory";
  inputCategory.type = "text";
  inputCategory.placeholder = "Enter quote category";

  const addButton = document.createElement("button");
  addButton.textContent = "Add Quote";
  addButton.addEventListener("click", addQuote);

  formDiv.appendChild(inputQuote);
  formDiv.appendChild(inputCategory);
  formDiv.appendChild(addButton);

  document.body.appendChild(formDiv);
}

// Initialize categories
function showRandomQuote() {
  const categories = [...new Set(quotes.map(q => q.category))];
  categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });
}

// Event Listeners
newQuoteBtn.addEventListener("click", displayRandomQuote);

// Initialize App
initCategories();
createAddQuoteForm(); // ✅ build the form dynamically