"use strict";

const STORAGE_KEY = "northstar-bank-demo-v1";
const accountColors = ["", "current"];
const demoState = {
  accounts: [
    { id: "acc-savings", name: "Everyday Savings", type: "Savings", number: "•••• 4821", balance: 12450.75 },
    { id: "acc-current", name: "Main Current", type: "Current", number: "•••• 1904", balance: 3820.2 }
  ],
  transactions: [
    { id: "tx-1", type: "deposit", amount: 1250, accountId: "acc-savings", description: "Monthly savings", date: daysAgo(1) },
    { id: "tx-2", type: "withdrawal", amount: 48.5, accountId: "acc-current", description: "Coffee & lunch", date: daysAgo(2) },
    { id: "tx-3", type: "transfer", amount: 300, accountId: "acc-current", relatedAccountId: "acc-savings", description: "Monthly savings", date: daysAgo(4) },
    { id: "tx-4", type: "deposit", amount: 2400, accountId: "acc-current", description: "Salary", date: daysAgo(6) },
    { id: "tx-5", type: "withdrawal", amount: 82.4, accountId: "acc-current", description: "Groceries", date: daysAgo(8) }
  ]
};

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2
});
const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const accountList = document.querySelector("#account-list");
const transactionList = document.querySelector("#transaction-list");
const transactionDialog = document.querySelector("#transaction-dialog");
const accountDialog = document.querySelector("#account-dialog");
const transactionForm = document.querySelector("#transaction-form");
const accountForm = document.querySelector("#account-form");
const toast = document.querySelector("#toast");
let toastTimer;

function isValidState(value) {
  return value && Array.isArray(value.accounts) && Array.isArray(value.transactions)
    && value.accounts.every(account => typeof account.id === "string"
      && typeof account.name === "string" && Number.isFinite(account.balance))
    && value.transactions.every(transaction => typeof transaction.id === "string"
      && Number.isFinite(transaction.amount));
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return structuredClone(demoState);
    const parsed = JSON.parse(saved);
    if (!isValidState(parsed)) throw new Error("Saved demo data has an invalid format.");
    return parsed;
  } catch (error) {
    console.error("Could not load saved banking demo data.", error);
    showToast("Saved data could not be read. Showing the sample accounts.");
    return structuredClone(demoState);
  }
}

let state = loadState();

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error("Could not save banking demo data.", error);
    showToast("Your browser could not save this change. Check storage settings.");
    return false;
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 3300);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function getAccount(accountId) {
  return state.accounts.find(account => account.id === accountId);
}

function renderAccounts() {
  accountList.innerHTML = "";
  if (state.accounts.length === 0) {
    accountList.innerHTML = '<div class="empty-accounts">You have no accounts yet. Open one to get started.</div>';
    return;
  }
  state.accounts.forEach((account, index) => {
    const card = document.createElement("article");
    card.className = "account-card";
    card.innerHTML = `
      <div class="account-top">
        <span class="account-icon ${accountColors[index % accountColors.length]}" aria-hidden="true">${account.type === "Current" ? "▤" : "◈"}</span>
        <div><div class="account-name">${escapeHtml(account.name)}</div><div class="account-type">${escapeHtml(account.type)} account</div></div>
      </div>
      <p class="account-number">${escapeHtml(account.number)}</p>
      <p class="account-balance">${money.format(account.balance)}</p>
      <div class="account-actions">
        <button class="small-button" type="button" data-action="deposit" data-account="${escapeHtml(account.id)}">＋ Add money</button>
        <button class="small-button" type="button" data-action="withdrawal" data-account="${escapeHtml(account.id)}">Withdraw</button>
      </div>`;
    accountList.append(card);
  });
}

function renderTransactions() {
  const filter = document.querySelector("#transaction-filter").value;
  const filtered = state.transactions
    .filter(transaction => filter === "all" || transaction.type === filter)
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);
  transactionList.innerHTML = "";
  document.querySelector("#empty-transactions").hidden = filtered.length !== 0;
  filtered.forEach(transaction => {
    const account = getAccount(transaction.accountId);
    const related = getAccount(transaction.relatedAccountId);
    const row = document.createElement("tr");
    const title = transaction.description || (transaction.type === "transfer" ? "Account transfer" : transaction.type);
    const symbol = transaction.type === "deposit" ? "↓" : transaction.type === "withdrawal" ? "↑" : "↗";
    const accountLabel = transaction.type === "transfer" && related
      ? `${account ? escapeHtml(account.name) : "Account"} → ${escapeHtml(related.name)}`
      : account ? escapeHtml(account.name) : "Account";
    const amountPrefix = transaction.type === "deposit" ? "+" : "−";
    row.innerHTML = `
      <td><span class="transaction-name"><span class="transaction-icon ${transaction.type}" aria-hidden="true">${symbol}</span>${escapeHtml(title)}</span></td>
      <td>${accountLabel}</td>
      <td>${dateFormat.format(new Date(transaction.date))}</td>
      <td class="${transaction.type === "deposit" ? "amount-positive" : "amount-negative"}">${amountPrefix}${money.format(transaction.amount)}</td>`;
    transactionList.append(row);
  });
}

function renderSummary() {
  const total = state.accounts.reduce((sum, account) => sum + account.balance, 0);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthTransactions = state.transactions.filter(transaction => new Date(transaction.date) >= monthStart);
  const incoming = monthTransactions.filter(transaction => transaction.type === "deposit")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const outgoing = monthTransactions.filter(transaction => transaction.type === "withdrawal")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  document.querySelector("#total-balance").textContent = money.format(total);
  document.querySelector("#money-in").textContent = money.format(incoming);
  document.querySelector("#money-out").textContent = money.format(outgoing);
  document.querySelector("#account-count").textContent = String(state.accounts.length);
}

function render() {
  renderSummary();
  renderAccounts();
  renderTransactions();
}

function refreshAccountOptions(selectedId) {
  const source = document.querySelector("#source-account");
  const destination = document.querySelector("#destination-account");
  source.innerHTML = state.accounts.map(account =>
    `<option value="${escapeHtml(account.id)}">${escapeHtml(account.name)} — ${money.format(account.balance)}</option>`
  ).join("");
  destination.innerHTML = state.accounts.map(account =>
    `<option value="${escapeHtml(account.id)}">${escapeHtml(account.name)}</option>`
  ).join("");
  if (selectedId && getAccount(selectedId)) source.value = selectedId;
  updateDestinationOptions();
}

function updateDestinationOptions() {
  const sourceId = document.querySelector("#source-account").value;
  const destination = document.querySelector("#destination-account");
  Array.from(destination.options).forEach(option => {
    option.disabled = option.value === sourceId;
  });
  if (destination.value === sourceId) {
    const next = Array.from(destination.options).find(option => !option.disabled);
    if (next) destination.value = next.value;
  }
}

function openTransaction(type, accountId) {
  if (state.accounts.length === 0) {
    showToast("Open an account before making a transaction.");
    return;
  }
  transactionForm.reset();
  document.querySelector("#transaction-error").textContent = "";
  document.querySelector("#transaction-type").value = type;
  document.querySelector("#transaction-title").textContent = type === "deposit"
    ? "Add money" : type === "withdrawal" ? "Withdraw money" : "Transfer money";
  refreshAccountOptions(accountId);
  updateTransactionFields();
  transactionDialog.showModal();
}

function updateTransactionFields() {
  const isTransfer = document.querySelector("#transaction-type").value === "transfer";
  document.querySelector("#destination-field").hidden = !isTransfer;
  document.querySelector("#destination-account").required = isTransfer;
  if (isTransfer && state.accounts.length < 2) {
    document.querySelector("#transaction-error").textContent = "Add another account before making a transfer.";
  } else {
    document.querySelector("#transaction-error").textContent = "";
  }
}

function createTransaction(type, amount, accountId, description, relatedAccountId) {
  return {
    id: crypto.randomUUID(),
    type,
    amount,
    accountId,
    relatedAccountId,
    description: description.trim() || (type === "transfer" ? "Account transfer" : type === "deposit" ? "Cash deposit" : "Cash withdrawal"),
    date: new Date().toISOString()
  };
}

accountList.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (button) openTransaction(button.dataset.action, button.dataset.account);
});

document.querySelector("#add-account").addEventListener("click", () => {
  accountForm.reset();
  document.querySelector("#account-error").textContent = "";
  accountDialog.showModal();
});
document.querySelector("#add-account-secondary").addEventListener("click", () => document.querySelector("#add-account").click());
document.querySelector("#transaction-type").addEventListener("change", updateTransactionFields);
document.querySelector("#source-account").addEventListener("change", updateDestinationOptions);
document.querySelector("#transaction-filter").addEventListener("change", renderTransactions);

document.querySelectorAll("[data-close]").forEach(button => {
  button.addEventListener("click", () => button.closest("dialog").close());
});

transactionForm.addEventListener("submit", event => {
  event.preventDefault();
  const type = document.querySelector("#transaction-type").value;
  const amount = Number(document.querySelector("#transaction-amount").value);
  const amountInCents = Math.round(amount * 100);
  const account = getAccount(document.querySelector("#source-account").value);
  const relatedAccountId = document.querySelector("#destination-account").value;
  const error = document.querySelector("#transaction-error");
  error.textContent = "";
  if (!account || !Number.isFinite(amountInCents) || amountInCents <= 0) {
    error.textContent = "Choose an account and enter an amount greater than zero.";
    return;
  }
  if (type === "transfer" && (!getAccount(relatedAccountId) || account.id === relatedAccountId)) {
    error.textContent = "Choose a different account to receive the transfer.";
    return;
  }
  const accountBalanceInCents = Math.round(account.balance * 100);
  if ((type === "withdrawal" || type === "transfer") && amountInCents > accountBalanceInCents) {
    error.textContent = "There isn't enough money in this account for that transaction.";
    return;
  }
  const previousState = structuredClone(state);
  const roundedAmount = amountInCents / 100;
  const description = document.querySelector("#transaction-note").value;
  account.balance = (accountBalanceInCents + (type === "deposit" ? amountInCents : -amountInCents)) / 100;
  if (type === "transfer") {
    const destinationAccount = getAccount(relatedAccountId);
    destinationAccount.balance = (Math.round(destinationAccount.balance * 100) + amountInCents) / 100;
  }
  state.transactions.unshift(createTransaction(type, roundedAmount, account.id, description, type === "transfer" ? relatedAccountId : undefined));
  if (!saveState()) {
    state = previousState;
    return;
  }
  render();
  transactionDialog.close();
  showToast(type === "transfer" ? "Transfer completed." : type === "deposit" ? "Deposit recorded." : "Withdrawal recorded.");
});

accountForm.addEventListener("submit", event => {
  event.preventDefault();
  const name = document.querySelector("#account-name").value.trim();
  const error = document.querySelector("#account-error");
  error.textContent = "";
  if (!name) {
    error.textContent = "Enter a name for your account.";
    return;
  }
  if (state.accounts.some(account => account.name.toLowerCase() === name.toLowerCase())) {
    error.textContent = "You already have an account with that name.";
    return;
  }
  const digits = String(Math.floor(1000 + Math.random() * 9000));
  state.accounts.push({
    id: crypto.randomUUID(),
    name,
    type: document.querySelector("#account-type").value,
    number: `•••• ${digits}`,
    balance: 0
  });
  if (!saveState()) {
    state.accounts.pop();
    return;
  }
  render();
  accountDialog.close();
  showToast("Your new account is ready.");
});

document.querySelector("#reset-demo").addEventListener("click", () => {
  if (!window.confirm("Reset all demo accounts and transactions to the sample data?")) return;
  const previousState = state;
  state = structuredClone(demoState);
  if (!saveState()) {
    state = previousState;
    return;
  }
  render();
  showToast("Demo data reset.");
});

document.querySelector("#today-label").textContent = new Intl.DateTimeFormat("en", {
  weekday: "long", day: "numeric", month: "long"
}).format(new Date()).toUpperCase();

render();
