
const $ = id => document.getElementById(id);

const categories = [
    "Food", "Shopping", "Travel", "Rent", "Bills",
    "Health", "Education", "Entertainment",
    "Salary", "Freelancing", "Business", "Other"
];

const icons = {
    Food: "🍔", Shopping: "🛍️", Travel: "🚕",
    Rent: "🏠", Bills: "💡", Health: "💊",
    Education: "📚", Entertainment: "🎬",
    Salary: "💼", Freelancing: "💻",
    Business: "🏢", Other: "📌"
};

const walletNames = ["Cash", "Bank", "UPI", "Credit Card"];

function loadData(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem("finora_" + key)) ?? fallback;
    } catch {
        return fallback;
    }
}

let transactions = loadData("transactions", []);
let budgets = loadData("budgets", []);
let goals = loadData("goals", []);
let currency = loadData("currency", "INR");

let editingId = null;
let editingGoalId = null;

function makeId() {
    return crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now() + Math.random());
}

function saveData() {
    localStorage.setItem("finora_transactions", JSON.stringify(transactions));
    localStorage.setItem("finora_budgets", JSON.stringify(budgets));
    localStorage.setItem("finora_goals", JSON.stringify(goals));
}

function money(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: currency,
        maximumFractionDigits: 0
    }).format(value || 0);
}

function currentMonth() {
    return new Date().toISOString().slice(0, 7);
}

function getMonth(date) {
    return date.slice(0, 7);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function total(type, list = transactions) {
    return list
        .filter(t => t.type === type)
        .reduce((sum, t) => sum + Number(t.amount), 0);
}

function monthExpense(month = currentMonth()) {
    return transactions
        .filter(t =>
            t.type === "expense" &&
            getMonth(t.date) === month
        )
        .reduce((sum, t) => sum + Number(t.amount), 0);
}

function categoryExpense(category) {
    return transactions
        .filter(t =>
            t.type === "expense" &&
            t.category === category &&
            getMonth(t.date) === currentMonth()
        )
        .reduce((sum, t) => sum + t.amount, 0);
}

// Fill category dropdowns
function fillCategories(id) {
    $(id).innerHTML = categories.map(category =>
        `<option value="${category}">
            ${icons[category]} ${category}
        </option>`
    ).join("");
}

fillCategories("tCategory");
fillCategories("bCategory");

$("categoryFilter").innerHTML += categories.map(category =>
    `<option value="${category}">${category}</option>`
).join("");

// Navigation
const pageDetails = {
    dashboard: ["Dashboard", "Your financial overview"],
    transactions: ["Transactions", "Manage your money activity"],
    budgets: ["Budgets", "Control your monthly spending"],
    goals: ["Savings Goals", "Save for your future"],
    analytics: ["Analytics", "Understand your spending habits"],
    wallets: ["My Wallets", "Manage your money"],
    settings: ["Settings", "Customize your experience"]
};

function navigate(page) {
    document.querySelectorAll(".page").forEach(section => {
        section.classList.remove("active");
    });

    document.querySelectorAll(".nav-btn").forEach(button => {
        button.classList.toggle("active", button.dataset.page === page);
    });

    $(page).classList.add("active");

    $("pageTitle").textContent = pageDetails[page][0];
    $("pageSubtitle").textContent = pageDetails[page][1];

    $("sidebar").classList.remove("open");

    render();
}

document.querySelectorAll(".nav-btn").forEach(button => {
    button.addEventListener("click", () => navigate(button.dataset.page));
});

document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => navigate(button.dataset.go));
});

$("menuBtn").addEventListener("click", () => {
    $("sidebar").classList.toggle("open");
});

// Theme
function toggleTheme() {
    document.body.classList.toggle("dark");

    localStorage.setItem(
        "finora_dark",
        document.body.classList.contains("dark")
    );
}

$("themeBtn").addEventListener("click", toggleTheme);
$("settingsTheme").addEventListener("click", toggleTheme);

if (loadData("dark", false)) {
    document.body.classList.add("dark");
}

// Modal controls
function openModal(id) {
    $(id).classList.add("show");
}

function closeModal(id) {
    $(id).classList.remove("show");
}

document.querySelectorAll("[data-close]").forEach(button => {
    button.addEventListener("click", () => {
        closeModal(button.dataset.close);
    });
});

document.querySelectorAll(".modal-bg").forEach(modal => {
    modal.addEventListener("click", event => {
        if (event.target === modal) closeModal(modal.id);
    });
});

// Transactions
function openTransaction(transaction = null) {
    editingId = transaction?.id || null;

    $("transactionHeading").textContent =
        transaction ? "Edit Transaction" : "Add Transaction";

    $("tType").value = transaction?.type || "expense";
    $("tAmount").value = transaction?.amount || "";
    $("tCategory").value = transaction?.category || "Food";
    $("tWallet").value = transaction?.wallet || "Cash";
    $("tDate").value =
        transaction?.date || new Date().toISOString().slice(0, 10);
    $("tMethod").value = transaction?.method || "UPI";
    $("tNote").value = transaction?.note || "";

    openModal("transactionModal");
}

$("addBtn").addEventListener("click", () => openTransaction());
$("transactionAddBtn").addEventListener("click", () => openTransaction());

$("transactionForm").addEventListener("submit", event => {
    event.preventDefault();

    const amount = Number($("tAmount").value);

    if (!Number.isFinite(amount) || amount <= 0) {
        alert("Please enter a valid amount.");
        return;
    }

    const transaction = {
        id: editingId || makeId(),
        type: $("tType").value,
        amount,
        category: $("tCategory").value,
        wallet: $("tWallet").value,
        date: $("tDate").value,
        method: $("tMethod").value,
        note: $("tNote").value.trim()
    };

    if (!transaction.date) {
        alert("Please select a date.");
        return;
    }

    if (editingId) {
        transactions = transactions.map(t =>
            t.id === editingId ? transaction : t
        );
    } else {
        transactions.push(transaction);
    }

    saveData();
    closeModal("transactionModal");
    render();
});

function deleteTransaction(id) {
    if (!confirm("Do you want to delete this transaction?")) return;

    transactions = transactions.filter(t => t.id !== id);

    saveData();
    render();
}

function renderTransactions() {
    const search = $("search").value.toLowerCase();
    const type = $("typeFilter").value;
    const category = $("categoryFilter").value;
    const month = $("monthFilter").value;

    const filtered = transactions.filter(t => {
        const matchesSearch =
            [t.note, t.category, t.wallet, t.method]
                .join(" ").toLowerCase().includes(search);

        return (
            (type === "all" || t.type === type) &&
            (category === "all" || t.category === category) &&
            (!month || getMonth(t.date) === month) &&
            matchesSearch
        );
    }).sort((a, b) => b.date.localeCompare(a.date));

    $("allList").innerHTML = filtered.length
        ? filtered.map(t => `
            <tr>
                <td>${escapeHTML(t.date)}</td>
                <td>${icons[t.category] || "📌"} ${escapeHTML(t.category)}</td>
                <td>${escapeHTML(t.note || "—")}</td>
                <td>${escapeHTML(t.wallet)}</td>
                <td><span class="badge">${t.type}</span></td>
                <td class="${t.type === "income" ? "green" : "red"}">
                    ${t.type === "income" ? "+" : "−"}${money(t.amount)}
                </td>
                <td>
                    <button class="secondary-btn" data-edit="${t.id}">Edit</button>
                    <button class="danger-btn" data-delete="${t.id}">Delete</button>
                </td>
            </tr>
        `).join("")
        : `<tr><td colspan="7" class="empty">No transactions found.</td></tr>`;

    $("allList").querySelectorAll("[data-edit]").forEach(button => {
        button.addEventListener("click", () => {
            const transaction = transactions.find(t => t.id === button.dataset.edit);
            if (transaction) openTransaction(transaction);
        });
    });

    $("allList").querySelectorAll("[data-delete]").forEach(button => {
        button.addEventListener("click", () => {
            deleteTransaction(button.dataset.delete);
        });
    });
}

["search", "typeFilter", "categoryFilter", "monthFilter"].forEach(id => {
    $(id).addEventListener("input", renderTransactions);
});

// Budgets
function openBudget() {
    $("bAmount").value = "";
    openModal("budgetModal");
}

$("budgetAddBtn").addEventListener("click", openBudget);

$("budgetForm").addEventListener("submit", event => {
    event.preventDefault();

    const category = $("bCategory").value;
    const amount = Number($("bAmount").value);

    if (!Number.isFinite(amount) || amount <= 0) {
        alert("Enter a valid budget.");
        return;
    }

    const existing = budgets.find(b => b.category === category);

    if (existing) {
        existing.amount = amount;
    } else {
        budgets.push({
            id: makeId(),
            category,
            amount
        });
    }

    saveData();
    closeModal("budgetModal");
    render();
});

function deleteBudget(id) {
    if (!confirm("Remove this budget?")) return;

    budgets = budgets.filter(b => b.id !== id);
    saveData();
    render();
}

function budgetHTML(budget) {
    const spent = categoryExpense(budget.category);
    const percentage = spent / budget.amount * 100;

    return `
        <div class="budget-item">
            <div class="budget-line">
                <span>${icons[budget.category]} ${escapeHTML(budget.category)}</span>
                <span>${money(spent)} <small>/ ${money(budget.amount)}</small></span>
            </div>

            <div class="track">
                <div class="fill"
                    style="width:${Math.min(percentage, 100)}%;
                    background:${percentage > 100 ? 'var(--red)' : 'var(--primary)'}">
                </div>
            </div>

            <div style="display:flex;justify-content:space-between;margin-top:7px;font-size:11px;color:var(--muted)">
                <span>${percentage.toFixed(0)}% used</span>
                <span>${percentage > 100 ? "Over budget" : money(budget.amount - spent) + " remaining"}</span>
            </div>
        </div>
    `;
}

// Savings Goals
function openGoal(goal = null) {
    editingGoalId = goal?.id || null;

    $("goalHeading").textContent =
        goal ? "Edit Savings Goal" : "Create Savings Goal";

    $("gName").value = goal?.name || "";
    $("gTarget").value = goal?.target || "";
    $("gSaved").value = goal?.saved || 0;
    $("gDate").value = goal?.date || "";

    openModal("goalModal");
}

$("goalAddBtn").addEventListener("click", () => openGoal());

$("goalForm").addEventListener("submit", event => {
    event.preventDefault();

    const target = Number($("gTarget").value);
    const saved = Number($("gSaved").value);

    if (!Number.isFinite(target) || target <= 0 ||
        !Number.isFinite(saved) || saved < 0) {
        alert("Please enter valid amounts.");
        return;
    }

    const goal = {
        id: editingGoalId || makeId(),
        name: $("gName").value.trim(),
        target,
        saved: Math.min(saved, target),
        date: $("gDate").value
    };

    if (editingGoalId) {
        goals = goals.map(g =>
            g.id === editingGoalId ? goal : g
        );
    } else {
        goals.push(goal);
    }

    saveData();
    closeModal("goalModal");
    render();
});

function deleteGoal(id) {
    if (!confirm("Delete this savings goal?")) return;

    goals = goals.filter(g => g.id !== id);
    saveData();
    render();
}

function goalHTML(goal) {
    const percentage = Math.min(100, goal.saved / goal.target * 100);

    return `
        <div class="goal-item">
            <div class="goal-top">
                <span>🎯 ${escapeHTML(goal.name)}</span>
                <small>${percentage.toFixed(0)}%</small>
            </div>

            <div class="track">
                <div class="fill" style="width:${percentage}%"></div>
            </div>

            <div style="display:flex;justify-content:space-between;margin-top:7px;font-size:11px;color:var(--muted)">
                <span>${money(goal.saved)} saved</span>
                <span>${money(goal.target)} target</span>
            </div>

            <div style="display:flex;gap:7px;margin-top:12px">
                <button class="secondary-btn" data-goal-edit="${goal.id}">Edit / Add Savings</button>
                <button class="danger-btn" data-goal-delete="${goal.id}">Delete</button>
            </div>
        </div>
    `;
}

function attachGoalActions(container) {
    $(container).querySelectorAll("[data-goal-edit]").forEach(button => {
        button.addEventListener("click", () => {
            const goal = goals.find(g => g.id === button.dataset.goalEdit);
            if (goal) openGoal(goal);
        });
    });

    $(container).querySelectorAll("[data-goal-delete]").forEach(button => {
        button.addEventListener("click", () => {
            deleteGoal(button.dataset.goalDelete);
        });
    });
}

// Charts
function renderCharts() {
    const year = Number($("chartYear").value) || new Date().getFullYear();

    const data = Array.from({ length: 12 }, (_, index) => {
        const month = `${year}-${String(index + 1).padStart(2, "0")}`;

        const monthTransactions = transactions.filter(
            t => getMonth(t.date) === month
        );

        return {
            income: total("income", monthTransactions),
            expense: total("expense", monthTransactions)
        };
    });

    const max = Math.max(1, ...data.flatMap(d => [d.income, d.expense]));

    $("monthlyChart").innerHTML = data.map((d, index) => `
        <div class="bar-group">
            <div class="bars">
                <div class="bar"
                    title="Income: ${money(d.income)}"
                    style="height:${d.income / max * 100}%">
                </div>
                <div class="bar secondary-bar"
                    title="Expenses: ${money(d.expense)}"
                    style="height:${d.expense / max * 100}%">
                </div>
            </div>
            <span class="bar-label">${new Date(year, index).toLocaleString("en", {month:"short"})}</span>
        </div>
    `).join("");
}

$("chartYear").innerHTML = Array.from(
    { length: 7 },
    (_, i) => new Date().getFullYear() - 3 + i
).map(year =>
    `<option value="${year}">${year}</option>`
).join("");

$("chartYear").value = new Date().getFullYear();
$("chartYear").addEventListener("change", renderCharts);

function renderCategoryChart(elementId) {
    const data = {};

    transactions
        .filter(t => t.type === "expense")
        .forEach(t => {
            data[t.category] = (data[t.category] || 0) + t.amount;
        });

    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...entries.map(item => item[1]));

    $(elementId).innerHTML = entries.length
        ? entries.slice(0, 8).map(([category, amount]) => `
            <div class="category-item">
                <div class="category-icon">${icons[category] || "📌"}</div>
                <div>
                    <div class="category-name">${escapeHTML(category)}</div>
                    <div class="track">
                        <div class="fill" style="width:${amount / max * 100}%"></div>
                    </div>
                </div>
                <div class="category-amount">${money(amount)}</div>
            </div>
        `).join("")
        : `<div class="empty">Your spending breakdown will appear here.</div>`;
}

// Wallets
function renderWallets() {
    const walletIcons = {
        Cash: "💵",
        Bank: "🏦",
        UPI: "📱",
        "Credit Card": "💳"
    };

    $("walletGrid").innerHTML = walletNames.map(wallet => {
        const balance = transactions
            .filter(t => t.wallet === wallet)
            .reduce((sum, t) =>
                sum + (t.type === "income" ? t.amount : -t.amount), 0
            );

        return `
            <div class="wallet-card">
                <h4>${walletIcons[wallet]} ${wallet}</h4>
                <h2>${money(balance)}</h2>
                <small>Net recorded transactions</small>
            </div>
        `;
    }).join("");
}

// Main dashboard and page updates
function render() {
    const income = total("income");
    const expense = total("expense");

    $("totalBalance").textContent = money(income - expense);
    $("totalIncome").textContent = money(income);
    $("totalExpense").textContent = money(expense);
    $("monthExpense").textContent = money(monthExpense());

    $("dashboardBudgets").innerHTML = budgets.length
        ? budgets.slice(0, 4).map(budgetHTML).join("")
        : `<div class="empty">No budgets yet. Create your first budget.</div>`;

    $("budgetList").innerHTML = budgets.length
        ? budgets.map(b => `
            ${budgetHTML(b)}
            <button class="danger-btn" data-budget-delete="${b.id}">Remove Budget</button>
        `).join("")
        : `<div class="empty">Create your first budget.</div>`;

    $("dashboardGoals").innerHTML = goals.length
        ? goals.slice(0, 3).map(goalHTML).join("")
        : `<div class="empty">No savings goals yet.</div>`;

    $("goalList").innerHTML = goals.length
        ? goals.map(goalHTML).join("")
        : `<div class="empty">Create your first savings goal.</div>`;

    $("recentList").innerHTML = transactions.length
        ? transactions.slice()
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 5)
            .map(t => `
                <tr>
                    <td>${escapeHTML(t.date)}</td>
                    <td>${icons[t.category] || "📌"} ${escapeHTML(t.category)}</td>
                    <td>${escapeHTML(t.note || "—")}</td>
                    <td>${escapeHTML(t.wallet)}</td>
                    <td class="${t.type === "income" ? "green" : "red"}">
                        ${t.type === "income" ? "+" : "−"}${money(t.amount)}
                    </td>
                </tr>
            `).join("")
        : `<tr><td colspan="5" class="empty">No transactions yet.</td></tr>`;

    renderCategoryChart("categoryChart");
    renderCategoryChart("analyticsChart");
    renderTransactions();
    renderCharts();
    renderWallets();

    const expenses = transactions.filter(t => t.type === "expense");

    $("avgExpense").textContent = money(
        expenses.length ? expense / expenses.length : 0
    );

    $("transactionCount").textContent = transactions.length;

    $("savingRate").textContent =
        (income ? Math.max(0, (income - expense) / income * 100) : 0).toFixed(1) + "%";

    $("highestExpense").textContent = money(
        Math.max(0, ...expenses.map(t => t.amount))
    );

    $("budgetList").querySelectorAll("[data-budget-delete]").forEach(button => {
        button.addEventListener("click", () => {
            deleteBudget(button.dataset.budgetDelete);
        });
    });

    attachGoalActions("goalList");
    attachGoalActions("dashboardGoals");
}

// Export CSV
function exportCSV() {
    const rows = [
        ["Date", "Type", "Category", "Description", "Wallet", "Method", "Amount"],
        ...transactions.map(t => [
            t.date, t.type, t.category, t.note,
            t.wallet, t.method, t.amount
        ])
    ];

    const csv = rows.map(row =>
        row.map(value =>
            '"' + String(value ?? "").replace(/"/g, '""') + '"'
        ).join(",")
    ).join("\n");

    downloadFile(
        new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
        "finora-transactions.csv"
    );
}

// Backup
function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function backupData() {
    const backup = {
        transactions,
        budgets,
        goals,
        currency,
        version: 1
    };

    downloadFile(
        new Blob([JSON.stringify(backup, null, 2)], {
            type: "application/json"
        }),
        "finora-backup.json"
    );
}

function restoreData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);

            if (
                !Array.isArray(data.transactions) ||
                !Array.isArray(data.budgets) ||
                !Array.isArray(data.goals)
            ) {
                throw new Error("Invalid backup");
            }

            if (!confirm("Replace your current data with this backup?")) return;

            transactions = data.transactions;
            budgets = data.budgets;
            goals = data.goals;

            if (["INR", "USD", "EUR", "GBP"].includes(data.currency)) {
                currency = data.currency;
            }

            localStorage.setItem("finora_currency", JSON.stringify(currency));
            $("currency").value = currency;

            saveData();
            render();

            alert("Backup restored successfully!");
        } catch {
            alert("Invalid backup file.");
        } finally {
            event.target.value = "";
        }
    };

    reader.readAsText(file);
}

function resetAll() {
    if (!confirm("Delete all transactions, budgets and savings goals?")) return;

    transactions = [];
    budgets = [];
    goals = [];

    saveData();
    render();
}

// Settings
$("currency").value = currency;

$("currency").addEventListener("change", () => {
    currency = $("currency").value;
    localStorage.setItem("finora_currency", JSON.stringify(currency));
    render();
});

$("exportBtn").addEventListener("click", exportCSV);
$("backupBtn").addEventListener("click", backupData);
$("restoreBtn").addEventListener("click", () => $("restoreFile").click());
$("restoreFile").addEventListener("change", restoreData);
$("resetBtn").addEventListener("click", resetAll);

// Start application
render();
