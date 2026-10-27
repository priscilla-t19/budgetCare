
"use strict";

const STORAGE_KEY = "budgety_transactions_v1";

const elements = {
  balance: document.querySelector("#balance"),
  balanceMessage: document.querySelector("#balance-message"),
  income: document.querySelector("#total-income"),
  expenses: document.querySelector("#total-expenses"),
  month: document.querySelector("#current-month"),
  form: document.querySelector("#transaction-form"),
  description: document.querySelector("#description"),
  amount: document.querySelector("#amount"),
  error: document.querySelector("#form-error"),
  submit: document.querySelector("#submit-btn"),
  list: document.querySelector("#transaction-list"),
  count: document.querySelector("#transaction-count"),
  ring: document.querySelector("#progress-ring"),
  percentage: document.querySelector("#spent-percentage"),
  spentSummary: document.querySelector("#spent-summary"),
  insightMessage: document.querySelector("#insight-message")
};

let transactions = loadTransactions();
let currentType = "inc";
let currentFilter = "all";

const money = new Intl.NumberFormat("en-BW", {
  style: "currency",
  currency: "BWP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function formatMoney(value) {
  return money.format(value).replace("BWP", "P").trim();
}

function loadTransactions() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

    if (!Array.isArray(saved)) return [];

    return saved.filter(item =>
      item &&
      typeof item.id === "string" &&
      ["inc", "exp"].includes(item.type) &&
      typeof item.description === "string" &&
      Number.isFinite(item.value) &&
      item.value > 0 &&
      typeof item.date === "string"
    );
  } catch {
    return [];
  }
}

function saveTransactions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    return true;
  } catch {
    elements.error.textContent =
      "Browser storage is unavailable. Your changes may not persist.";
    return false;
  }
}

function getTotals() {
  const income = transactions
    .filter(item => item.type === "inc")
    .reduce((sum, item) => sum + item.value, 0);

  const expenses = transactions
    .filter(item => item.type === "exp")
    .reduce((sum, item) => sum + item.value, 0);

  return {
    income,
    expenses,
    balance: income - expenses,
    percentage: income > 0 ? expenses / income * 100 : null
  };
}

function renderDashboard() {
  const totals = getTotals();

  elements.balance.textContent = formatMoney(totals.balance);
  elements.income.textContent = formatMoney(totals.income);
  elements.expenses.textContent = formatMoney(totals.expenses);

  elements.balanceMessage.textContent =
    totals.balance < 0
      ? "Your expenses are higher than your income."
      : "Your financial picture at a glance";

  elements.percentage.textContent =
    totals.percentage === null
      ? "—"
      : `${Math.round(totals.percentage)}%`;

  elements.spentSummary.textContent =
    `${formatMoney(totals.expenses)} of ${formatMoney(totals.income)}`;

  const progress = totals.percentage === null
    ? 0
    : Math.min(100, Math.max(0, totals.percentage));

  elements.ring.style.background =
    `conic-gradient(var(--pink) ${progress}%, #eef1f4 ${progress}%)`;

  if (totals.income === 0) {
    elements.insightMessage.textContent =
      "Add income to see how much of it you've spent.";
  } else if (totals.percentage > 100) {
    elements.insightMessage.textContent =
      "Your spending has exceeded your recorded income.";
  } else if (totals.percentage >= 80) {
    elements.insightMessage.textContent =
      "You're spending most of your income. Keep an eye on expenses.";
  } else {
    elements.insightMessage.textContent =
      "You're keeping some of your income available. Keep tracking!";
  }
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderTransactions() {
  elements.list.replaceChildren();
  elements.count.textContent = transactions.length;

  const filtered = transactions.filter(item =>
    currentFilter === "all" || item.type === currentFilter
  );

  if (filtered.length === 0) {
    const empty = createElement("div", "empty-state");
    empty.append(
      createElement("div", "empty-icon", "◇"),
      createElement("h3", "", "No transactions yet"),
      createElement(
        "p",
        "",
        currentFilter === "all"
          ? "Add your first transaction to start tracking your money."
          : "There are no transactions in this category."
      )
    );
    elements.list.append(empty);
    return;
  }

  const totals = getTotals();

  filtered.forEach(item => {
    const row = createElement("article", "transaction-item");
    const icon = createElement(
      "span",
      `transaction-icon ${item.type}`,
      item.type === "inc" ? "↓" : "↑"
    );

    const info = createElement("div", "transaction-info");
    info.append(
      createElement("strong", "", item.description),
      createElement(
        "small",
        "",
        new Date(item.date).toLocaleDateString("en-BW", {
          day: "numeric",
          month: "short",
          year: "numeric"
        })
      )
    );

    const right = createElement("div", "transaction-right");
    right.append(
      createElement(
        "span",
        `transaction-value ${item.type}`,
        `${item.type === "inc" ? "+" : "−"} ${formatMoney(item.value)}`
      )
    );

    if (item.type === "exp") {
      const percentage = totals.income > 0
        ? `${Math.round(item.value / totals.income * 100)}% of income`
        : "No income recorded";

      right.append(
        createElement("small", "transaction-percentage", percentage)
      );
    }

    const deleteButton = createElement("button", "delete-btn", "×");
    deleteButton.type = "button";
    deleteButton.setAttribute(
      "aria-label",
      `Delete ${item.description}`
    );
    deleteButton.dataset.id = item.id;

    row.append(icon, info, right, deleteButton);
    elements.list.append(row);
  });
}

function render() {
  renderDashboard();
  renderTransactions();
}

function setTransactionType(type) {
  currentType = type;

  document.querySelectorAll(".type-btn").forEach(button => {
    const active = button.dataset.type === type;
    button.classList.toggle("active", active);
    button.classList.toggle(
      "expense-active",
      active && type === "exp"
    );
    button.setAttribute("aria-pressed", String(active));
  });

  elements.submit.classList.toggle("expense-mode", type === "exp");
  elements.submit.textContent =
    type === "inc" ? "＋ Add income" : "＋ Add expense";
}

function addTransaction(event) {
  event.preventDefault();
  elements.error.textContent = "";

  const description = elements.description.value.trim();
  const value = Number(elements.amount.value);

  if (!description) {
    elements.error.textContent = "Please enter a description.";
    elements.description.focus();
    return;
  }

  if (!Number.isFinite(value) || value <= 0) {
    elements.error.textContent = "Enter an amount greater than zero.";
    elements.amount.focus();
    return;
  }

  const amount = Math.round((value + Number.EPSILON) * 100) / 100;

  if (!Number.isSafeInteger(Math.round(amount * 100))) {
    elements.error.textContent = "This amount is too large.";
    return;
  }

  const id = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const transaction = {
    id,
    type: currentType,
    description,
    value: amount,
    date: new Date().toISOString()
  };

  transactions.unshift(transaction);
  saveTransactions();
  render();

  elements.form.reset();
  elements.description.focus();
}

function deleteTransaction(id) {
  transactions = transactions.filter(item => item.id !== id);
  saveTransactions();
  render();
}

function setFilter(filter) {
  currentFilter = filter;

  document.querySelectorAll(".filter-btn").forEach(button => {
    const active = button.dataset.filter === filter;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  renderTransactions();
}

function initialize() {
  elements.month.textContent = new Date().toLocaleDateString("en-BW", {
    month: "long",
    year: "numeric"
  });

  document.querySelectorAll(".type-btn").forEach(button => {
    button.addEventListener("click", () => {
      setTransactionType(button.dataset.type);
    });
  });

  document.querySelectorAll(".filter-btn").forEach(button => {
    button.addEventListener("click", () => {
      setFilter(button.dataset.filter);
    });
  });

  elements.form.addEventListener("submit", addTransaction);

  elements.list.addEventListener("click", event => {
    const button = event.target.closest(".delete-btn");

    if (button) {
      deleteTransaction(button.dataset.id);
    }
  });

  setTransactionType("inc");
  render();
}

initialize();
