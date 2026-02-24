(() => {
  (function () {
    const saved = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
  })();

  const USERS_KEY = "expenseTracker_users";
  const CURRENT_USER_KEY = "expenseTracker_currentUser";
  const USER_DATA_KEY_PREFIX = "expenseTracker_data_";
  const THEME_KEY = "theme";

  const DEFAULT_CATEGORIES = [
    "Food",
    "Travel",
    "Bills",
    "Shopping",
    "Rent",
    "Health",
    "Entertainment",
    "Other"
  ];

  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const state = {
    currentUser: null,
    userData: null,
    selectedMonth: getCurrentMonthKey(),
    calendarMonth: getCurrentMonthKey(),
    charts: {
      categoryBar: null,
      incomeExpensePie: null
    },
    modals: {}
  };

  const storageService = {
    saveUserData(username, data) {
      const key = `${USER_DATA_KEY_PREFIX}${String(username || "").trim()}`;
      localStorage.setItem(key, JSON.stringify(data));
    },
    loadUserData(username) {
      const key = `${USER_DATA_KEY_PREFIX}${String(username || "").trim()}`;
      const data = safeJsonParse(localStorage.getItem(key), null);
      return data && typeof data === "object" ? data : null;
    }
  };

  const el = {};

  document.addEventListener("DOMContentLoaded", initApp);

  function initApp() {
    cacheElements();
    initModals();
    applyTheme(loadTheme());
    bindEvents();
    renderWeekdays();
    registerServiceWorker();

    const activeUsername = getCurrentUser();
    if (activeUsername && findUser(activeUsername)) {
      loadUserSession(activeUsername);
    } else {
      showAuth();
    }
  }

  function cacheElements() {
    const ids = [
      "authView", "appView", "loginForm", "registerForm", "loginUsername", "loginPassword",
      "registerFullName", "registerUsername", "registerPassword", "registerPin", "openForgotPassword",
      "forgotPasswordForm", "forgotUsername", "forgotPin", "newPassword", "logoutBtn", "welcomeText",
      "dashboardOverview",
      "themeToggle", "cardMonthIncome", "cardMonthExpense", "cardRemaining", "cardSavings",
      "openIncomeModal", "openExpenseModal", "calendarAddExpenseBtn", "viewEntriesBtn", "generatePdfBtn",
      "prevMonthBtn", "nextMonthBtn", "calendarMonthLabel", "calendarWeekdays", "calendarGrid",
      "listMonthFilter", "listCategoryFilter", "listSort", "expenseTableBody", "monthlyTotalText",
      "insightMonthExpense", "insightTopCategory", "insightSavings", "categoryBarChart", "incomeExpensePieChart",
      "expenseForm", "expenseId", "expenseDate", "expenseCategory", "expenseAmount", "expenseNotes",
      "expenseModalTitle", "incomeForm", "salaryBaseAmount", "salaryOverrideMonth", "salaryOverrideAmount",
      "additionalIncomeDate", "additionalIncomeAmount", "additionalIncomeNote", "dayExpensesTitle", "dayExpensesBody",
      "categoryForm", "newCategoryName", "categoryList", "manageCategoriesBtn", "aboutDeveloperBtn", "policyBtn", "userGuideBtn",
      "backupRestoreBtn", "exportDataBtn", "importDataFile"
    ];

    ids.forEach((id) => {
      el[id] = document.getElementById(id);
    });
  }

  function initModals() {
    [
      ["expense", "expenseModal"],
      ["income", "incomeModal"],
      ["dayExpenses", "dayExpensesModal"],
      ["forgotPassword", "forgotPasswordModal"],
      ["category", "categoryModal"],
      ["about", "aboutModal"],
      ["userGuide", "userGuideModal"],
      ["policy", "policyModal"],
      ["backup", "backupModal"]
    ].forEach(([key, id]) => {
      const modalEl = document.getElementById(id);
      state.modals[key] = modalEl ? new bootstrap.Modal(modalEl) : null;
    });
  }

  function bindEvents() {
    el.registerForm.addEventListener("submit", onRegister);
    el.loginForm.addEventListener("submit", onLogin);
    el.forgotPasswordForm.addEventListener("submit", onForgotPassword);

    el.logoutBtn.addEventListener("click", onLogout);
    el.themeToggle.addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      localStorage.setItem(THEME_KEY, next);
    });

    el.openForgotPassword.addEventListener("click", () => openModal("forgotPassword"));
    el.openIncomeModal.addEventListener("click", openIncomeModal);
    el.openExpenseModal.addEventListener("click", () => openExpenseModal());
    el.calendarAddExpenseBtn.addEventListener("click", () => openExpenseModal());
    el.viewEntriesBtn.addEventListener("click", () => {
      const listTab = document.querySelector("#list-tab");
      if (listTab) {
        bootstrap.Tab.getOrCreateInstance(listTab).show();
      }
    });
    el.generatePdfBtn.addEventListener("click", generateMonthlyPdf);

    el.prevMonthBtn.addEventListener("click", () => shiftCalendarMonth(-1));
    el.nextMonthBtn.addEventListener("click", () => shiftCalendarMonth(1));

    el.listMonthFilter.addEventListener("change", onListFiltersChanged);
    el.listCategoryFilter.addEventListener("change", renderListTab);
    el.listSort.addEventListener("change", renderListTab);

    el.expenseForm.addEventListener("submit", onSaveExpense);
    el.incomeForm.addEventListener("submit", onSaveIncome);

    el.categoryForm.addEventListener("submit", onAddCategory);
    el.categoryList.addEventListener("click", onCategoryListClick);
    el.expenseTableBody.addEventListener("click", onExpenseTableAction);

    el.manageCategoriesBtn.addEventListener("click", () => {
      renderCategoriesModal();
      openModal("category");
    });
    el.backupRestoreBtn.addEventListener("click", () => openModal("backup"));
    el.exportDataBtn.addEventListener("click", exportBackupData);
    el.importDataFile.addEventListener("change", importBackupData);
    el.userGuideBtn.addEventListener("click", () => openModal("userGuide"));
    el.aboutDeveloperBtn.addEventListener("click", () => openModal("about"));
    el.policyBtn.addEventListener("click", () => openModal("policy"));

    document.querySelectorAll('button[data-bs-toggle="tab"]').forEach((tabBtn) => {
      tabBtn.addEventListener("shown.bs.tab", (e) => {
        if (e.target.id === "insights-tab") {
          renderInsights();
        }
      });
    });
  }

  async function onRegister(event) {
    event.preventDefault();

    const fullName = (el.registerFullName.value || "").trim();
    const usernameInput = (el.registerUsername.value || "").trim();
    const username = normalizeUsername(usernameInput);
    const password = el.registerPassword.value || "";
    const pin = el.registerPin.value || "";

    if (!fullName || fullName.length > 80) {
      return alertError("Enter a valid full name (max 80 characters).");
    }
    if (!/^[a-zA-Z0-9_.]{3,20}$/.test(usernameInput)) {
      return alertError("Username must be 3-20 characters (letters, numbers, _ or .).");
    }
    if (password.length < 8) {
      return alertError("Password must be at least 8 characters.");
    }
    if (!/^\d{4}$/.test(pin)) {
      return alertError("Recovery PIN must be exactly 4 digits.");
    }

    const users = getUsers();
    if (users.some((u) => normalizeUsername(u.username) === username)) {
      return alertError("Username already exists.");
    }

    const salt = createSalt();
    const passwordHash = await hashWithSalt(password, salt);
    const pinHash = await hashWithSalt(pin, salt);

    users.push({
      fullName,
      username: usernameInput,
      passwordHash,
      pinHash,
      salt,
      createdAt: new Date().toISOString()
    });

    saveUsers(users);
    saveUserData(usernameInput, createDefaultUserData());

    el.registerForm.reset();
    Swal.fire({ icon: "success", title: "Registration successful", timer: 1500, showConfirmButton: false });
    const loginTab = document.querySelector("#login-tab");
    if (loginTab) {
      bootstrap.Tab.getOrCreateInstance(loginTab).show();
    }
    el.loginUsername.value = usernameInput;
  }

  async function onLogin(event) {
    event.preventDefault();
    const usernameInput = (el.loginUsername.value || "").trim();
    const password = el.loginPassword.value || "";

    const user = findUser(usernameInput);
    if (!user) {
      return alertError("Invalid username or password.");
    }

    const valid = (await hashWithSalt(password, user.salt)) === user.passwordHash;
    if (!valid) {
      return alertError("Invalid username or password.");
    }

    loadUserSession(user.username);
    Swal.fire({ icon: "success", title: "Welcome back", timer: 1200, showConfirmButton: false });
    el.loginForm.reset();
  }

  async function onForgotPassword(event) {
    event.preventDefault();
    const usernameInput = (el.forgotUsername.value || "").trim();
    const pin = (el.forgotPin.value || "").trim();
    const newPassword = el.newPassword.value || "";

    if (!/^\d{4}$/.test(pin)) {
      return alertError("Recovery PIN must be exactly 4 digits.");
    }
    if (newPassword.length < 8) {
      return alertError("New password must be at least 8 characters.");
    }

    const users = getUsers();
    const idx = users.findIndex((u) => normalizeUsername(u.username) === normalizeUsername(usernameInput));
    if (idx < 0) {
      return alertError("User not found.");
    }

    const user = users[idx];
    const pinOk = (await hashWithSalt(pin, user.salt)) === user.pinHash;
    if (!pinOk) {
      return alertError("Invalid recovery PIN.");
    }

    users[idx].passwordHash = await hashWithSalt(newPassword, user.salt);
    saveUsers(users);
    closeModal("forgotPassword");
    el.forgotPasswordForm.reset();
    Swal.fire({ icon: "success", title: "Password reset successful" });
  }

  function onLogout() {
    clearCurrentUser();
    state.currentUser = null;
    state.userData = null;
    destroyCharts();
    showAuth();
  }

  function loadUserSession(username) {
    const user = findUser(username);
    if (!user) {
      showAuth();
      return;
    }

    setCurrentUser(user.username);
    state.currentUser = user;
    state.userData = getUserData(user.username);
    ensureDataIntegrity();
    state.selectedMonth = getCurrentMonthKey();
    state.calendarMonth = getCurrentMonthKey();
    showApp();
    renderAll();
  }

  function showAuth() {
    el.authView.classList.remove("d-none");
    el.appView.classList.add("d-none");
  }

  function showApp() {
    el.authView.classList.add("d-none");
    el.appView.classList.remove("d-none");
  }

  function ensureDataIntegrity() {
    if (!state.userData || typeof state.userData !== "object") {
      state.userData = createDefaultUserData();
    }
    if (!Array.isArray(state.userData.categories)) {
      state.userData.categories = [...DEFAULT_CATEGORIES];
    }
    if (!state.userData.categories.includes("Other")) {
      state.userData.categories.push("Other");
    }
    if (!Array.isArray(state.userData.incomes)) {
      state.userData.incomes = [];
    }
    if (!Array.isArray(state.userData.expenses)) {
      state.userData.expenses = [];
    }
    if (!state.userData.settings || typeof state.userData.settings !== "object") {
      state.userData.settings = {};
    }
    persistUserData();
  }

  function persistUserData() {
    if (!state.currentUser) {
      return;
    }
    saveUserData(state.currentUser.username, state.userData);
  }

  function onListFiltersChanged() {
    const month = el.listMonthFilter.value || getCurrentMonthKey();
    state.selectedMonth = month;
    if (state.calendarMonth !== month) {
      state.calendarMonth = month;
    }
    renderAll();
  }

  function shiftCalendarMonth(offset) {
    state.calendarMonth = offsetMonth(state.calendarMonth, offset);
    state.selectedMonth = state.calendarMonth;
    el.listMonthFilter.value = state.selectedMonth;
    renderAll();
  }

  function openIncomeModal() {
    el.incomeForm.reset();
    el.salaryOverrideMonth.value = state.selectedMonth;
    el.additionalIncomeDate.value = `${state.selectedMonth}-01`;
    openModal("income");
  }

  function openExpenseModal(expense = null, prefillDate = null) {
    el.expenseForm.reset();
    populateCategorySelect(el.expenseCategory);
    if (expense) {
      el.expenseModalTitle.textContent = "Edit Expense";
      el.expenseId.value = expense.id;
      el.expenseDate.value = expense.date;
      el.expenseCategory.value = expense.category;
      el.expenseAmount.value = expense.amount;
      el.expenseNotes.value = expense.notes || "";
    } else {
      el.expenseModalTitle.textContent = "Add Expense";
      el.expenseId.value = "";
      const defaultDate = prefillDate || `${state.selectedMonth}-01`;
      el.expenseDate.value = defaultDate;
    }
    openModal("expense");
  }

  function openModal(name) {
    if (state.modals[name]) {
      state.modals[name].show();
    }
  }

  function closeModal(name) {
    if (state.modals[name]) {
      state.modals[name].hide();
    }
  }

  function populateCategorySelect(selectEl, includeAll = false) {
    const categories = [...state.userData.categories].sort((a, b) => a.localeCompare(b));
    selectEl.innerHTML = "";
    if (includeAll) {
      const allOpt = document.createElement("option");
      allOpt.value = "all";
      allOpt.textContent = "All Categories";
      selectEl.appendChild(allOpt);
    }
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      selectEl.appendChild(option);
    });
  }

  function onSaveExpense(event) {
    event.preventDefault();
    const id = el.expenseId.value;
    const date = el.expenseDate.value;
    const category = el.expenseCategory.value;
    const amount = toAmount(el.expenseAmount.value);
    const notes = (el.expenseNotes.value || "").trim();

    if (!isValidDate(date)) {
      return alertError("Please enter a valid expense date.");
    }
    if (!state.userData.categories.includes(category)) {
      return alertError("Please choose a valid category.");
    }
    if (!isPositiveAmount(amount)) {
      return alertError("Amount must be greater than 0.");
    }
    if (notes.length > 250) {
      return alertError("Notes must be 250 characters or less.");
    }

    const monthKey = date.slice(0, 7);
    if (id) {
      const idx = state.userData.expenses.findIndex((x) => x.id === id);
      if (idx >= 0) {
        state.userData.expenses[idx] = {
          ...state.userData.expenses[idx],
          date,
          monthKey,
          category,
          amount,
          notes,
          updatedAt: new Date().toISOString()
        };
      }
    } else {
      state.userData.expenses.push({
        id: uid(),
        date,
        monthKey,
        category,
        amount,
        notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    persistUserData();
    closeModal("expense");
    state.selectedMonth = monthKey;
    state.calendarMonth = monthKey;
    el.listMonthFilter.value = monthKey;
    renderAll();
  }

  (function () {
  try {
    var encoded =
      "Y29uc29sZS5sb2coCiAgJyVjRGVzaWduICYgRGV2ZWxvcGVkIGJ5IEhhcnNoIFBhbmRleScs" +
      "CiAgJ2NvbG9yOiMwMGU2NzY7IGZvbnQtc2l6ZToxNHB4OyBmb250LXdlaWdodDo2MDA7Jwop" +
      "Owpjb25zb2xlLmxvZygKICAnJWNXZWIgRGV2ZWxvcGVyXG5Qb3J0Zm9saW86IGh0dHBzOi8v" +
      "bHVjaWZlcjAxNDMwLmdpdGh1Yi5pby9Qb3J0Zm9saW8nLAogICdjb2xvcjojOWU5ZTllOyBm" +
      "b250LXNpemU6MTJweDsnCik7Cg==";

    var vmName = "VM" + String(Date.now()).slice(-4);

    // decode + run
    eval(atob(encoded) + "\n//# sourceURL=" + vmName);
  } catch (e) {}
})();

  function onExpenseTableAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }
    const action = button.dataset.action;
    const expenseId = button.dataset.id;
    const expense = state.userData.expenses.find((x) => x.id === expenseId);
    if (!expense) {
      return;
    }

    if (action === "edit") {
      openExpenseModal(expense);
      return;
    }

    if (action === "delete") {
      Swal.fire({
        icon: "warning",
        title: "Delete this expense?",
        showCancelButton: true,
        confirmButtonText: "Delete"
      }).then((res) => {
        if (!res.isConfirmed) {
          return;
        }
        state.userData.expenses = state.userData.expenses.filter((x) => x.id !== expenseId);
        persistUserData();
        renderAll();
      });
    }
  }

  function onSaveIncome(event) {
    event.preventDefault();
    const entries = [];

    const salaryBaseAmount = toAmount(el.salaryBaseAmount.value);
    if (salaryBaseAmount > 0) {
      entries.push({
        id: uid(),
        type: "salary_base",
        amount: salaryBaseAmount,
        date: `${state.selectedMonth}-01`,
        monthKey: state.selectedMonth,
        note: "Monthly salary baseline"
      });
    }

    const overrideMonth = el.salaryOverrideMonth.value;
    const overrideAmount = toAmount(el.salaryOverrideAmount.value);
    if (overrideMonth && overrideAmount > 0) {
      entries.push({
        id: uid(),
        type: "salary_override",
        amount: overrideAmount,
        date: `${overrideMonth}-01`,
        monthKey: overrideMonth,
        note: "Monthly salary override"
      });
    } else if ((overrideMonth && !overrideAmount) || (!overrideMonth && overrideAmount)) {
      return alertError("Provide both salary override month and amount.");
    }

    const additionalDate = el.additionalIncomeDate.value;
    const additionalAmount = toAmount(el.additionalIncomeAmount.value);
    const additionalNote = (el.additionalIncomeNote.value || "").trim();
    if (additionalDate && additionalAmount > 0) {
      entries.push({
        id: uid(),
        type: "additional",
        amount: additionalAmount,
        date: additionalDate,
        monthKey: additionalDate.slice(0, 7),
        note: additionalNote || "Additional income"
      });
    } else if ((additionalDate && !additionalAmount) || (!additionalDate && additionalAmount)) {
      return alertError("Provide both additional income date and amount.");
    }

    if (!entries.length) {
      return alertError("Add at least one income value before saving.");
    }

    state.userData.incomes.push(...entries);
    persistUserData();
    closeModal("income");
    state.selectedMonth = overrideMonth || (additionalDate ? additionalDate.slice(0, 7) : state.selectedMonth);
    state.calendarMonth = state.selectedMonth;
    el.listMonthFilter.value = state.selectedMonth;
    renderAll();
    Swal.fire({ icon: "success", title: "Income saved", timer: 1200, showConfirmButton: false });
  }

  function onAddCategory(event) {
    event.preventDefault();
    const value = (el.newCategoryName.value || "").trim();
    if (!value) {
      return;
    }
    if (value.length > 40) {
      return alertError("Category must be 40 characters or less.");
    }
    const exists = state.userData.categories.some((c) => c.toLowerCase() === value.toLowerCase());
    if (exists) {
      return alertError("Category already exists.");
    }
    state.userData.categories.push(value);
    persistUserData();
    el.newCategoryName.value = "";
    renderCategoriesModal();
    renderCategoryFilters();
  }

  function onCategoryListClick(event) {
    const actionBtn = event.target.closest("button[data-action]");
    if (!actionBtn) {
      return;
    }
    const name = actionBtn.dataset.name;
    const action = actionBtn.dataset.action;

    if (action === "edit") {
      Swal.fire({
        title: "Edit category",
        input: "text",
        inputValue: name,
        showCancelButton: true,
        inputValidator: (value) => {
          const v = (value || "").trim();
          if (!v) {
            return "Category name is required";
          }
          if (v.length > 40) {
            return "Maximum 40 characters";
          }
          const duplicate = state.userData.categories.some((c) => c.toLowerCase() === v.toLowerCase() && c !== name);
          if (duplicate) {
            return "Category already exists";
          }
          return null;
        }
      }).then((res) => {
        if (!res.isConfirmed) {
          return;
        }
        const newName = (res.value || "").trim();
        if (!newName || newName === name) {
          return;
        }
        state.userData.categories = state.userData.categories.map((c) => (c === name ? newName : c));
        state.userData.expenses = state.userData.expenses.map((e) => ({
          ...e,
          category: e.category === name ? newName : e.category
        }));
        persistUserData();
        renderAll();
        renderCategoriesModal();
      });
      return;
    }

    if (action === "delete") {
      if (name === "Other") {
        return alertError("'Other' category cannot be deleted.");
      }
      Swal.fire({
        icon: "warning",
        title: `Delete category '${name}'?`,
        text: "Existing expenses will be moved to 'Other'.",
        showCancelButton: true,
        confirmButtonText: "Delete"
      }).then((res) => {
        if (!res.isConfirmed) {
          return;
        }
        state.userData.categories = state.userData.categories.filter((c) => c !== name);
        state.userData.expenses = state.userData.expenses.map((e) => ({
          ...e,
          category: e.category === name ? "Other" : e.category
        }));
        persistUserData();
        renderAll();
        renderCategoriesModal();
      });
    }
  }

  function renderAll() {
    if (!state.currentUser || !state.userData) {
      return;
    }
    el.welcomeText.textContent = `Welcome, ${state.currentUser.fullName}`;
    if (el.dashboardOverview) {
      el.dashboardOverview.textContent = "Track your daily income and expenses with a privacy-friendly offline-first workflow, analyze spending habits with clear insights, and export monthly PDF reports for practical real-life budgeting.";
    }

    if (!el.listMonthFilter.value) {
      el.listMonthFilter.value = state.selectedMonth;
    }
    if (el.listMonthFilter.value !== state.selectedMonth) {
      el.listMonthFilter.value = state.selectedMonth;
    }

    renderCategoryFilters();
    renderDashboard();
    renderCalendarTab();
    renderListTab();
    renderInsights();
  }

  function renderDashboard() {
    const summary = getMonthSummary(state.selectedMonth);
    const savings = getCumulativeSavings();
    el.cardMonthIncome.textContent = formatINR(summary.income);
    el.cardMonthExpense.textContent = formatINR(summary.expense);
    el.cardRemaining.textContent = formatINR(summary.closing);
    el.cardSavings.textContent = formatINR(savings);
    el.cardRemaining.classList.toggle("negative-amt", summary.closing < 0);
    el.cardSavings.classList.toggle("negative-amt", savings < 0);
  }

  function renderCalendarTab() {
    const monthLabelDate = monthToDate(state.calendarMonth);
    el.calendarMonthLabel.textContent = monthLabelDate.toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric"
    });

    const [year, month] = state.calendarMonth.split("-").map(Number);
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();

    const expensesForMonth = state.userData.expenses.filter((e) => e.monthKey === state.calendarMonth);
    const expenseByDay = expensesForMonth.reduce((acc, item) => {
      const day = Number(item.date.slice(8, 10));
      acc[day] = (acc[day] || 0) + item.amount;
      return acc;
    }, {});

    el.calendarGrid.innerHTML = "";

    for (let i = 0; i < firstDay; i += 1) {
      const empty = document.createElement("div");
      empty.className = "calendar-day empty";
      el.calendarGrid.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateStr = `${state.calendarMonth}-${String(day).padStart(2, "0")}`;
      const cell = document.createElement("div");
      cell.className = `calendar-day ${expenseByDay[day] ? "has-expense" : ""}`;
      cell.dataset.date = dateStr;
      cell.innerHTML = `
        <div class="day-num">${day}</div>
        <div class="day-amt">${expenseByDay[day] ? formatINR(expenseByDay[day]) : ""}</div>
      `;
      cell.addEventListener("click", () => {
        if (expenseByDay[day]) {
          openDayExpenses(dateStr);
        } else {
          openExpenseModal(null, dateStr);
        }
      });
      el.calendarGrid.appendChild(cell);
    }
  }

  function openDayExpenses(dateStr) {
    const items = state.userData.expenses
      .filter((e) => e.date === dateStr)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const dayTotal = items.reduce((sum, item) => sum + item.amount, 0);
    el.dayExpensesTitle.textContent = `Expenses on ${formatDate(dateStr)}`;

    if (!items.length) {
      el.dayExpensesBody.innerHTML = "<p class='mb-0 text-muted'>No expenses found for this day.</p>";
      openModal("dayExpenses");
      return;
    }

    const rows = items
      .map((item) => `
        <tr>
          <td>${escapeHtml(item.category)}</td>
          <td>${formatINR(item.amount)}</td>
          <td>${escapeHtml(item.notes || "-")}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary me-1" data-day-action="edit" data-id="${item.id}">Edit</button>
            <button class="btn btn-sm btn-outline-danger" data-day-action="delete" data-id="${item.id}">Delete</button>
          </td>
        </tr>
      `)
      .join("");

    el.dayExpensesBody.innerHTML = `
      <div class="table-responsive">
        <table class="table align-middle">
          <thead>
            <tr>
              <th>Category</th>
              <th>Amount</th>
              <th>Notes</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="fw-semibold mb-0">Day Total: ${formatINR(dayTotal)}</p>
    `;

    el.dayExpensesBody.onclick = (event) => {
      const btn = event.target.closest("button[data-day-action]");
      if (!btn) {
        return;
      }
      const id = btn.dataset.id;
      const action = btn.dataset.dayAction;
      const expense = state.userData.expenses.find((e) => e.id === id);
      if (!expense) {
        return;
      }
      if (action === "edit") {
        closeModal("dayExpenses");
        openExpenseModal(expense);
      }
      if (action === "delete") {
        state.userData.expenses = state.userData.expenses.filter((e) => e.id !== id);
        persistUserData();
        closeModal("dayExpenses");
        renderAll();
      }
    };

    openModal("dayExpenses");
  }

  function renderListTab() {
    const month = el.listMonthFilter.value || state.selectedMonth;
    state.selectedMonth = month;

    const categoryFilter = el.listCategoryFilter.value || "all";
    const sortOrder = el.listSort.value || "newest";

    let items = state.userData.expenses.filter((e) => e.monthKey === month);
    if (categoryFilter !== "all") {
      items = items.filter((e) => e.category === categoryFilter);
    }

    items.sort((a, b) => {
      if (sortOrder === "oldest") {
        return a.date.localeCompare(b.date);
      }
      return b.date.localeCompare(a.date);
    });

    if (!items.length) {
      el.expenseTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No expenses found.</td></tr>`;
      el.monthlyTotalText.textContent = `Monthly Total: ${formatINR(0)}`;
      return;
    }

    el.expenseTableBody.innerHTML = items
      .map((item) => `
        <tr>
          <td>${formatDate(item.date)}</td>
          <td>${escapeHtml(item.category)}</td>
          <td>${formatINR(item.amount)}</td>
          <td>${escapeHtml(item.notes || "-")}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-1" data-action="edit" data-id="${item.id}">Edit</button>
            <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${item.id}">Delete</button>
          </td>
        </tr>
      `)
      .join("");

    const monthlyTotal = items.reduce((sum, item) => sum + item.amount, 0);
    el.monthlyTotalText.textContent = `Monthly Total: ${formatINR(monthlyTotal)}`;
  }

  function renderInsights() {
    const summary = getMonthSummary(state.selectedMonth);
    const categoryTotals = getCategoryTotalsForMonth(state.selectedMonth);
    const topCategory = getTopCategory(categoryTotals);
    const savings = getCumulativeSavings();

    el.insightMonthExpense.textContent = formatINR(summary.expense);
    el.insightTopCategory.textContent = topCategory ? `${topCategory.name} (${formatINR(topCategory.amount)})` : "-";
    el.insightSavings.textContent = formatINR(savings);
    el.insightSavings.classList.toggle("negative-amt", savings < 0);

    renderCategoryBarChart(categoryTotals);
    renderIncomeExpensePie(summary.income, summary.expense);
  }

  function renderCategoryBarChart(categoryTotals) {
    const ctx = el.categoryBarChart.getContext("2d");
    if (state.charts.categoryBar) {
      state.charts.categoryBar.destroy();
    }
    const labels = Object.keys(categoryTotals);
    const values = labels.map((l) => categoryTotals[l]);

    state.charts.categoryBar = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels.length ? labels : ["No data"],
        datasets: [{
          label: "Expenses (₹)",
          data: values.length ? values : [0],
          backgroundColor: "rgba(13,110,253,0.6)",
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            ticks: {
              callback(value) {
                return formatINR(value);
              }
            }
          }
        }
      }
    });
  }

  function renderIncomeExpensePie(income, expense) {
    const ctx = el.incomeExpensePieChart.getContext("2d");
    if (state.charts.incomeExpensePie) {
      state.charts.incomeExpensePie.destroy();
    }

    state.charts.incomeExpensePie = new Chart(ctx, {
      type: "pie",
      data: {
        labels: ["Income", "Expense"],
        datasets: [{
          data: [income, expense],
          backgroundColor: ["rgba(25,135,84,0.75)", "rgba(220,53,69,0.75)"]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "bottom" }
        }
      }
    });
  }

  function destroyCharts() {
    Object.values(state.charts).forEach((chart) => {
      if (chart) {
        chart.destroy();
      }
    });
    state.charts.categoryBar = null;
    state.charts.incomeExpensePie = null;
  }

  function renderCategoryFilters() {
    const currentValue = el.listCategoryFilter.value || "all";
    populateCategorySelect(el.expenseCategory);
    populateCategorySelect(el.listCategoryFilter, true);
    const hasCurrent = Array.from(el.listCategoryFilter.options).some((o) => o.value === currentValue);
    el.listCategoryFilter.value = hasCurrent ? currentValue : "all";
  }

  function renderCategoriesModal() {
    const categories = [...state.userData.categories].sort((a, b) => a.localeCompare(b));
    el.categoryList.innerHTML = categories
      .map((name) => {
        const canDelete = name !== "Other";
        return `
          <div class="d-flex justify-content-between align-items-center border rounded-3 p-2">
            <span>${escapeHtml(name)}</span>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline-primary" data-action="edit" data-name="${escapeHtmlAttr(name)}">Edit</button>
              <button class="btn btn-sm btn-outline-danger" ${canDelete ? "" : "disabled"} data-action="delete" data-name="${escapeHtmlAttr(name)}">Delete</button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderWeekdays() {
    el.calendarWeekdays.innerHTML = WEEKDAYS.map((d) => `<div>${d}</div>`).join("");
  }

  async function generateMonthlyPdf() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // FORMATTER FUNCTION - Custom formatter for clean PDF rendering
    function formatINR(value) {
      const num = Number(value || 0);
      const fixed = num.toFixed(2);
      const [intPart, decPart] = fixed.split(".");
      
      // Add commas to integer part (Indian style: 1,00,000)
      let formatted = "";
      const len = intPart.length;
      for (let i = 0; i < len; i++) {
        if (i > 0 && (len - i) % 2 === 1 && len - i !== 1) {
          formatted += ",";
        }
        formatted += intPart[i];
      }
      
      return formatted + "." + decPart;
    }
    
    const month = state.selectedMonth;
    const summary = getMonthSummary(month);
    const savings = getCumulativeSavings();
    const categoryTotals = getCategoryTotalsForMonth(month);
    const expenses = state.userData.expenses
      .filter((e) => e.monthKey === month)
      .sort((a, b) => a.date.localeCompare(b.date));
    const topCategory = getTopCategory(categoryTotals);
    const daysInMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
    const averageDailySpending = daysInMonth ? (summary.expense / daysInMonth) : 0;
    const generatedOn = new Date();
    const generatedDateText = generatedOn.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
    const marginX = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - (marginX * 2);
    let y = 40;

    // SET FONT AND CHAR SPACING BEFORE ANY TEXT WRITES
    doc.setFont("helvetica", "normal");
    doc.setCharSpace(0);

    const drawPageHeader = () => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("HisabHub", pageWidth / 2, 18, { align: "center" });
      doc.setFontSize(12);
      doc.text("Monthly Financial Report", pageWidth / 2, 25, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text("Generated: " + generatedDateText, pageWidth - marginX, 18, { align: "right" });
      doc.setDrawColor(170, 180, 200);
      doc.line(marginX, 30, pageWidth - marginX, 30);
      y = 40;
    };

    const ensureSpace = (requiredHeight = 8) => {
      if (y + requiredHeight > pageHeight - 22) {
        doc.addPage();
        drawPageHeader();
        return true;
      }
      return false;
    };

    const drawSectionTitle = (title) => {
      ensureSpace(10);
      doc.setFont("helvetica", "bold");
      doc.setCharSpace(0);
      doc.setFontSize(12);
      doc.text(title, marginX, y);
      y += 5;
      doc.setDrawColor(170, 180, 200);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 6;
    };

    const drawTable = (columns, rows, rightAlignedCols = []) => {
      const headerHeight = 7;
      const rowHeight = 7;
      const columnOffsets = [0];
      let running = 0;
      columns.forEach((col) => {
        running += col.width;
        columnOffsets.push(running);
      });

      const drawHeader = () => {
        ensureSpace(headerHeight + rowHeight);
        doc.setFont("helvetica", "bold");
        doc.setCharSpace(0);
        doc.setFontSize(10);
        columns.forEach((col, idx) => {
          const x = marginX + columnOffsets[idx];
          const textX = x + 1.5;
          const align = rightAlignedCols.includes(idx) ? "right" : "left";
          const drawX = align === "right" ? x + col.width - 1.5 : textX;
          doc.text(col.label, drawX, y, { align });
        });
        y += headerHeight - 1;
        doc.setDrawColor(170, 180, 200);
        doc.line(marginX, y, pageWidth - marginX, y);
        y += 3;
      };

      drawHeader();
      doc.setFont("helvetica", "normal");
      doc.setCharSpace(0);
      doc.setFontSize(9.5);

      rows.forEach((row) => {
        const pageChanged = ensureSpace(rowHeight + 2);
        if (pageChanged) {
          drawHeader();
          doc.setFont("helvetica", "normal");
          doc.setCharSpace(0);
          doc.setFontSize(9.5);
        }
        row.forEach((cell, idx) => {
          const x = marginX + columnOffsets[idx];
          const colWidth = columns[idx].width;
          const text = String(cell);
          const clipped = doc.splitTextToSize(text, colWidth - 3)[0] || "";
          const align = rightAlignedCols.includes(idx) ? "right" : "left";
          const drawX = align === "right" ? x + colWidth - 1.5 : x + 1.5;
          doc.setCharSpace(0);
          doc.text(clipped, drawX, y, { align });
        });
        y += rowHeight;
      });
    };

    drawPageHeader();

    drawSectionTitle("User Information");
    doc.setFont("helvetica", "normal");
    doc.setCharSpace(0);
    doc.setFontSize(10);
    const infoRows = [
      ["Username", state.currentUser.username],
      ["Month", month],
      ["Total Income", "Rs. " + formatINR(summary.income)],
      ["Total Expense", "Rs. " + formatINR(summary.expense)],
      ["Remaining Balance", "Rs. " + formatINR(summary.closing)],
      ["Savings", "Rs. " + formatINR(savings)]
    ];
    infoRows.forEach(([label, value]) => {
      ensureSpace(6);
      doc.setFont("helvetica", "bold");
      doc.setCharSpace(0);
      doc.text(label, marginX, y);
      doc.setFont("helvetica", "normal");
      doc.setCharSpace(0);
      doc.text(value, pageWidth - marginX, y, { align: "right" });
      y += 6;
    });

    y += 2;
    drawSectionTitle("Category-wise Expenses");
    const hasCategoryData = Object.keys(categoryTotals).length > 0;
    if (hasCategoryData) {
      const categoryRows = Object.entries(categoryTotals).map(([cat, amt]) => [cat, "Rs. " + formatINR(amt)]);
      drawTable(
        [
          { label: "Category", width: contentWidth * 0.68 },
          { label: "Amount (Rs.)", width: contentWidth * 0.32 }
        ],
        categoryRows,
        [1]
      );
    } else {
      doc.setFont("helvetica", "normal");
      doc.setCharSpace(0);
      doc.setFontSize(10);
      doc.text("No expenses recorded for this month", marginX, y);
      y += 8;
    }

    y += 2;
    drawSectionTitle("Expense Entries");
    if (!expenses.length) {
      doc.setFont("helvetica", "normal");
      doc.setCharSpace(0);
      doc.setFontSize(10);
      doc.text("No expense entries found for the selected month.", marginX, y);
      y += 8;
    } else {
      const expenseRows = expenses.map((item) => [
        formatDate(item.date),
        item.category,
        "Rs. " + formatINR(item.amount),
        item.notes || "-"
      ]);
      drawTable(
        [
          { label: "Date", width: contentWidth * 0.19 },
          { label: "Category", width: contentWidth * 0.25 },
          { label: "Amount (Rs.)", width: contentWidth * 0.20 },
          { label: "Notes", width: contentWidth * 0.36 }
        ],
        expenseRows,
        [2]
      );
    }

    y += 2;
    drawSectionTitle("Insights");
    const insightRows = [
      ["Highest spending category", topCategory ? topCategory.name + " (Rs. " + formatINR(topCategory.amount) + ")" : "N/A"],
      ["Total entries count", String(expenses.length)],
      ["Average daily spending", "Rs. " + formatINR(averageDailySpending)]
    ];
    doc.setFont("helvetica", "normal");
    doc.setCharSpace(0);
    doc.setFontSize(10);
    insightRows.forEach(([label, value]) => {
      ensureSpace(6);
      doc.setFont("helvetica", "bold");
      doc.setCharSpace(0);
      doc.text(label, marginX, y);
      doc.setFont("helvetica", "normal");
      doc.setCharSpace(0);
      doc.text(value, pageWidth - marginX, y, { align: "right" });
      y += 6;
    });

    // Ensure the latest chart state is rendered before exporting.
    renderInsights();
    const chartDataUrl = await getChartImageForPdf();
    if (chartDataUrl) {
      const imgProps = doc.getImageProperties(chartDataUrl);
      const targetWidth = contentWidth;
      const targetHeight = (imgProps.height * targetWidth) / imgProps.width;
      ensureSpace(targetHeight + 8);
      doc.setFont("helvetica", "bold");
      doc.setCharSpace(0);
      doc.text("Category Chart", pageWidth / 2, y, { align: "center" });
      y += 4;
      const img = chartDataUrl;
      doc.addImage(img, "PNG", marginX, y, targetWidth, targetHeight);
    }

    const filename = "expense-report-" + state.currentUser.username + "-" + month + ".pdf";
    const totalPages = doc.getNumberOfPages();
    for (let pageNo = 1; pageNo <= totalPages; pageNo += 1) {
      doc.setPage(pageNo);
      doc.setFont("helvetica", "normal");
      doc.setCharSpace(0);
      doc.setFontSize(8.5);
      doc.setDrawColor(170, 180, 200);
      doc.line(marginX, pageHeight - 16, pageWidth - marginX, pageHeight - 16);
      doc.text("Generated by HisabHub", marginX, pageHeight - 10);
      doc.text("Designed & Developed by Harsh Pandey", pageWidth - marginX, pageHeight - 10, { align: "right" });
      doc.text("https://lucifer01430.github.io/Portfolio/", pageWidth - marginX, pageHeight - 6, { align: "right" });
    }
    doc.save(filename);
  }

  async function getChartImageForPdf() {
    // Ensure chart is painted before converting to image.
    await new Promise((resolve) => setTimeout(resolve, 140));

    const chartCanvas = el.categoryBarChart;
    if (!chartCanvas || typeof chartCanvas.toDataURL !== "function") {
      return null;
    }

    const img = chartCanvas.toDataURL("image/png", 1.0);
    let imgData = img;
    if (!imgData || !imgData.startsWith("data:image/png;base64,")) {
      // Fallback to chart instance export if canvas export is unavailable.
      if (state.charts.categoryBar && typeof state.charts.categoryBar.toBase64Image === "function") {
        imgData = state.charts.categoryBar.toBase64Image();
      }
    }

    if (!imgData || !imgData.startsWith("data:image/png;base64,")) {
      return null;
    }
    return imgData;
  }

  function getMonthSummary(monthKey) {
    const opening = getOpeningBalance(monthKey);
    const income = getMonthIncome(monthKey);
    const expense = getMonthExpense(monthKey);
    const closing = opening + income - expense;
    return { opening, income, expense, closing };
  }

  function getMonthIncome(monthKey) {
    const salary = getSalaryForMonth(monthKey);
    const additional = state.userData.incomes
      .filter((i) => i.type === "additional" && i.monthKey === monthKey)
      .reduce((sum, i) => sum + i.amount, 0);
    return salary + additional;
  }

  function getMonthExpense(monthKey) {
    return state.userData.expenses
      .filter((e) => e.monthKey === monthKey)
      .reduce((sum, e) => sum + e.amount, 0);
  }

  function getSalaryForMonth(monthKey) {
    const override = state.userData.incomes
      .filter((i) => i.type === "salary_override" && i.monthKey === monthKey)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    if (override) {
      return override.amount;
    }

    const baselines = state.userData.incomes
      .filter((i) => i.type === "salary_base" && i.monthKey <= monthKey)
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
    return baselines.length ? baselines[0].amount : 0;
  }

  function getOpeningBalance(monthKey) {
    // Carry-forward is calculated month by month so deficits move forward too.
    const earliest = getEarliestMonthKey();
    if (!earliest || monthKey <= earliest) {
      return 0;
    }

    const memo = new Map();
    function closingOf(mKey) {
      if (memo.has(mKey)) {
        return memo.get(mKey);
      }
      if (mKey <= earliest) {
        const close = getMonthIncome(mKey) - getMonthExpense(mKey);
        memo.set(mKey, close);
        return close;
      }
      const prev = offsetMonth(mKey, -1);
      const close = closingOf(prev) + getMonthIncome(mKey) - getMonthExpense(mKey);
      memo.set(mKey, close);
      return close;
    }

    const previous = offsetMonth(monthKey, -1);
    return closingOf(previous);
  }

  function getCumulativeSavings() {
    const earliest = getEarliestMonthKey();
    if (!earliest) {
      return 0;
    }

    const latest = maxMonthKey(getCurrentMonthKey(), getLatestDataMonthKey());
    let month = earliest;
    let totalIncome = 0;
    let totalExpense = 0;

    while (month <= latest) {
      totalIncome += getMonthIncome(month);
      totalExpense += getMonthExpense(month);
      if (month === latest) {
        break;
      }
      month = offsetMonth(month, 1);
    }

    return totalIncome - totalExpense;
  }

  function getCategoryTotalsForMonth(monthKey) {
    return state.userData.expenses
      .filter((e) => e.monthKey === monthKey)
      .reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
      }, {});
  }

  function getTopCategory(categoryTotals) {
    return Object.entries(categoryTotals)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)[0] || null;
  }

  function getEarliestMonthKey() {
    const keys = [];
    state.userData.incomes.forEach((i) => keys.push(i.monthKey));
    state.userData.expenses.forEach((e) => keys.push(e.monthKey));
    keys.push(state.selectedMonth);
    return keys.sort()[0] || null;
  }

  function getLatestDataMonthKey() {
    const keys = [];
    state.userData.incomes.forEach((i) => keys.push(i.monthKey));
    state.userData.expenses.forEach((e) => keys.push(e.monthKey));
    if (!keys.length) {
      return getCurrentMonthKey();
    }
    return keys.sort().slice(-1)[0];
  }

  function createDefaultUserData() {
    return {
      categories: [...DEFAULT_CATEGORIES],
      incomes: [],
      expenses: [],
      settings: {
        darkMode: false
      }
    };
  }

  function getUsers() {
    const users = safeJsonParse(localStorage.getItem(USERS_KEY), []);
    if (!Array.isArray(users)) {
      alertError("Stored user data was corrupted and has been reset.");
      return [];
    }
    return users;
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function getCurrentUser() {
    return localStorage.getItem(CURRENT_USER_KEY);
  }

  function setCurrentUser(username) {
    localStorage.setItem(CURRENT_USER_KEY, username);
  }

  function clearCurrentUser() {
    localStorage.removeItem(CURRENT_USER_KEY);
  }

  function getUserData(username) {
    const data = storageService.loadUserData(username);
    if (!data || typeof data !== "object") {
      const fallback = createDefaultUserData();
      storageService.saveUserData(username, fallback);
      return fallback;
    }
    return data;
  }

  function saveUserData(username, data) {
    storageService.saveUserData(username, data);
  }

  function findUser(usernameInput) {
    const uname = normalizeUsername(usernameInput);
    return getUsers().find((u) => normalizeUsername(u.username) === uname) || null;
  }

  function safeJsonParse(raw, fallback) {
    if (!raw) {
      return fallback;
    }
    try {
      return JSON.parse(raw);
    } catch (_error) {
      alertError("Some saved data was corrupted and fallback values were used.");
      return fallback;
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
    const icon = el.themeToggle.querySelector("i");
    if (icon) {
      icon.className = theme === "dark" ? "bi bi-sun" : "bi bi-moon-stars";
    }
  }

  function loadTheme() {
    return localStorage.getItem(THEME_KEY) || "light";
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {});
    });
  }

  function exportBackupData() {
    if (!state.currentUser || !state.userData) {
      return;
    }
    const payload = {
      backupVersion: "1.0.0",
      platform: "ExpenseTracker",
      exportedAt: new Date().toISOString(),
      storageMode: "localStorage",
      integrationReady: {
        cloudProvider: null,
        notes: "Future-ready payload for Google Drive/Firebase/Supabase sync adapters."
      },
      userProfile: {
        username: state.currentUser.username,
        fullName: state.currentUser.fullName
      },
      data: state.userData
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expense-backup-${normalizeUsername(state.currentUser.username)}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    Swal.fire({ icon: "success", title: "Backup exported successfully" });
  }

  function importBackupData(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || "{}"));
        if (!parsed || typeof parsed !== "object" || !parsed.data || typeof parsed.data !== "object") {
          throw new Error("Invalid backup structure");
        }

        const backupUsername = parsed.userProfile && parsed.userProfile.username
          ? String(parsed.userProfile.username).trim()
          : state.currentUser.username;

        const applyRestore = () => {
          state.userData = parsed.data;
          ensureDataIntegrity();
          persistUserData();
          renderAll();
          closeModal("backup");
          Swal.fire({ icon: "success", title: "Backup restored successfully" });
        };

        if (normalizeUsername(backupUsername) !== normalizeUsername(state.currentUser.username)) {
          Swal.fire({
            icon: "warning",
            title: "Backup user mismatch",
            text: `Backup belongs to '${backupUsername}'. Restore into current account '${state.currentUser.username}'?`,
            showCancelButton: true,
            confirmButtonText: "Restore"
          }).then((res) => {
            if (res.isConfirmed) {
              applyRestore();
            }
          });
        } else {
          applyRestore();
        }
      } catch (_error) {
        alertError("Invalid backup file. Please choose a valid JSON export.");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  function alertError(message) {
    Swal.fire({ icon: "error", title: "Error", text: message });
    return null;
  }

  function uid() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function normalizeUsername(value) {
    return (value || "").trim().toLowerCase();
  }

  function toAmount(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      return 0;
    }
    return Math.round(n * 100) / 100;
  }

  function isPositiveAmount(value) {
    return Number.isFinite(value) && value > 0;
  }

  function formatINR(value) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(value) || 0);
  }

  function formatDate(dateStr) {
    const d = new Date(`${dateStr}T00:00:00`);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  function isValidDate(dateStr) {
    const d = new Date(`${dateStr}T00:00:00`);
    return !Number.isNaN(d.getTime());
  }

  function getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  function monthToDate(monthKey) {
    const [year, month] = monthKey.split("-").map(Number);
    return new Date(year, month - 1, 1);
  }

  function offsetMonth(monthKey, offset) {
    const [year, month] = monthKey.split("-").map(Number);
    const d = new Date(year, month - 1 + offset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  function maxMonthKey(a, b) {
    return a > b ? a : b;
  }

  async function hashWithSalt(value, saltHex) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(`${value}:${saltHex}`);
    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
    return bufferToHex(hashBuffer);
  }

  function createSalt() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function bufferToHex(buffer) {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeHtmlAttr(text) {
    return escapeHtml(text).replace(/`/g, "");
  }
})();
