// ===== Guciku — Tahap 1 =====
// Catat pemasukan & pengeluaran harian, kategori, ringkasan.

const DEFAULT_CATEGORIES = {
  keluar: [
    { id: "makan", label: "Makan", emoji: "🍚" },
    { id: "transport", label: "Transport", emoji: "🛵" },
    { id: "belanja", label: "Belanja", emoji: "🛍️" },
    { id: "tagihan", label: "Tagihan", emoji: "🧾" },
    { id: "lainnya", label: "Lainnya", emoji: "📦" },
  ],
  masuk: [
    { id: "gaji", label: "Gaji", emoji: "💼" },
    { id: "bonus", label: "Bonus", emoji: "🎁" },
    { id: "hadiah", label: "Hadiah", emoji: "🎀" },
    { id: "investasi", label: "Investasi", emoji: "📈" },
    { id: "lainnya-masuk", label: "Lainnya", emoji: "📦" },
  ],
};

const STORAGE_KEY = "guciku:transactions";
const CATEGORIES_KEY = "guciku:categories";
const BUDGETS_KEY = "guciku:budgets";
const HIDE_AMOUNTS_KEY = "guciku:hideAmounts";

let transactions = loadTransactions();
let categoriesByType = loadCategories();
let budgets = loadBudgets();
let hideAmounts = localStorage.getItem(HIDE_AMOUNTS_KEY) === "1";
let currentType = "keluar";
let currentCategory = categoriesByType.keluar[0].id;
let currentFilter = "semua";
let manageMode = false;

// ---------- Storage ----------
function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Gagal membaca data Guciku:", e);
    return [];
  }
}

function saveTransactions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (e) {
    console.error("Gagal menyimpan data Guciku:", e);
  }
}

function loadCategories() {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.keluar && parsed.masuk) return parsed;
    }
  } catch (e) {
    console.error("Gagal membaca kategori Guciku:", e);
  }
  return {
    keluar: DEFAULT_CATEGORIES.keluar.map((c) => ({ ...c })),
    masuk: DEFAULT_CATEGORIES.masuk.map((c) => ({ ...c })),
  };
}

function saveCategories() {
  try {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categoriesByType));
  } catch (e) {
    console.error("Gagal menyimpan kategori Guciku:", e);
  }
}

function loadBudgets() {
  try {
    const raw = localStorage.getItem(BUDGETS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error("Gagal membaca anggaran Guciku:", e);
    return {};
  }
}

function saveBudgets() {
  try {
    localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
  } catch (e) {
    console.error("Gagal menyimpan anggaran Guciku:", e);
  }
}

// ---------- Format ----------
function formatRupiah(n) {
  const rounded = Math.round(n);
  return "Rp " + rounded.toLocaleString("id-ID");
}

function displayAmount(n) {
  return hideAmounts ? "Rp ••••••" : formatRupiah(n);
}

function formatDayLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, today)) return "Hari ini";
  if (sameDay(d, yesterday)) return "Kemarin";

  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
}

function categoryInfo(type, id) {
  const list = categoriesByType[type] || [];
  const found = list.find((c) => c.id === id);
  if (found) return found;
  return { id, label: "Kategori dihapus", emoji: "🏷️" };
}

// ---------- Computation ----------
function computeTotals() {
  let masuk = 0, keluar = 0;
  for (const t of transactions) {
    if (t.type === "masuk") masuk += t.amount;
    else keluar += t.amount;
  }
  return { masuk, keluar, saldo: masuk - keluar };
}

function computeSpentThisMonthByCategory() {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const spent = {};
  for (const t of transactions) {
    if (t.type !== "keluar") continue;
    if (!t.date.startsWith(ym)) continue;
    spent[t.category] = (spent[t.category] || 0) + t.amount;
  }
  return spent;
}

// ---------- Rendering ----------
function renderSummary() {
  const { masuk, keluar, saldo } = computeTotals();
  document.getElementById("totalMasuk").textContent = displayAmount(masuk);
  document.getElementById("totalKeluar").textContent = displayAmount(keluar);
  document.getElementById("saldoAmount").textContent = displayAmount(saldo);

  const jarNote = document.getElementById("jarNote");
  if (saldo < 0 && !hideAmounts) {
    jarNote.textContent = "Saldo lagi di bawah nol. Pelan-pelan aja, nggak apa-apa.";
    jarNote.hidden = false;
  } else {
    jarNote.hidden = true;
  }

  // Isi jar: proporsi saldo terhadap total pemasukan (kapasitas jar)
  const capacity = Math.max(masuk, saldo, 1);
  const ratio = Math.max(0, Math.min(1, saldo / capacity));
  const jarTop = 6, jarBottom = 147; // koordinat outline jar di SVG
  const fillHeight = (jarBottom - jarTop) * ratio;
  const fillY = jarBottom - fillHeight;

  const fillEl = document.getElementById("jarFill");
  fillEl.setAttribute("y", fillY);
  fillEl.setAttribute("height", fillHeight + 20);
  fillEl.setAttribute("fill", saldo < 0 ? "var(--warn)" : "var(--sage)");
}

function renderHistory() {
  const list = document.getElementById("historyList");
  const empty = document.getElementById("emptyState");
  list.innerHTML = "";

  let filtered = transactions;
  if (currentFilter !== "semua") {
    filtered = transactions.filter((t) => t.type === currentFilter);
  }

  if (filtered.length === 0) {
    empty.style.display = "flex";
    list.style.display = "none";
    return;
  }
  empty.style.display = "none";
  list.style.display = "flex";

  // Urutkan terbaru dulu, lalu kelompokkan per tanggal
  const sorted = [...filtered].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return b.createdAt - a.createdAt;
  });

  const groups = [];
  let lastDate = null;
  for (const t of sorted) {
    if (t.date !== lastDate) {
      groups.push({ date: t.date, items: [] });
      lastDate = t.date;
    }
    groups[groups.length - 1].items.push(t);
  }

  for (const group of groups) {
    const groupEl = document.createElement("div");
    groupEl.className = "day-group";

    const labelEl = document.createElement("div");
    labelEl.className = "day-label";
    labelEl.textContent = formatDayLabel(group.date);
    groupEl.appendChild(labelEl);

    for (const t of group.items) {
      const cat = categoryInfo(t.type, t.category);
      const row = document.createElement("div");
      row.className = "tx-row";
      row.dataset.type = t.type;

      row.innerHTML = `
        <div class="tx-icon">${cat.emoji}</div>
        <div class="tx-main">
          <div class="tx-category">${cat.label}</div>
          ${t.note ? `<div class="tx-note">${escapeHtml(t.note)}</div>` : ""}
        </div>
        <div class="tx-amount">${t.type === "masuk" ? "+" : "-"} ${displayAmount(t.amount)}</div>
        <button class="tx-delete" title="Hapus" data-id="${t.id}">✕</button>
      `;
      groupEl.appendChild(row);
    }
    list.appendChild(groupEl);
  }

  list.querySelectorAll(".tx-delete").forEach((btn) => {
    btn.addEventListener("click", () => deleteTransaction(btn.dataset.id));
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderAll() {
  renderSummary();
  renderBudgets();
  renderHistory();
}

// ---------- Budget (Anggaran) ----------
function renderBudgets() {
  const listEl = document.getElementById("budgetList");
  const emptyEl = document.getElementById("budgetEmpty");
  listEl.innerHTML = "";

  const spent = computeSpentThisMonthByCategory();
  const expenseCategories = categoriesByType.keluar;
  const budgeted = expenseCategories.filter((cat) => budgets[cat.id] > 0);

  if (budgeted.length === 0) {
    emptyEl.style.display = "flex";
    listEl.style.display = "none";
    return;
  }
  emptyEl.style.display = "none";
  listEl.style.display = "flex";

  budgeted.forEach((cat) => {
    const limit = budgets[cat.id];
    const used = spent[cat.id] || 0;
    const ratio = Math.min(1, used / limit);
    const percent = Math.round((used / limit) * 100);

    let state = "ok";
    let note = "";
    if (used >= limit) {
      state = "over";
      note = hideAmounts
        ? "Sudah lebih dari rencana bulan ini. Nggak apa-apa, cek pelan-pelan ya."
        : `Sudah lebih ${formatRupiah(used - limit)} dari rencana. Nggak apa-apa, cek pelan-pelan ya.`;
    } else if (used / limit >= 0.8) {
      state = "warn";
      note = hideAmounts
        ? "Sudah mendekati rencana bulan ini."
        : `Tinggal sekitar ${formatRupiah(limit - used)} lagi dari rencana bulan ini.`;
    }

    const card = document.createElement("div");
    card.className = "budget-card state-" + state;
    card.innerHTML = `
      <div class="budget-card-head">
        <div class="budget-card-name"><span class="cat-emoji">${cat.emoji}</span>${escapeHtml(cat.label)}</div>
        <div class="budget-card-figures"><strong>${displayAmount(used)}</strong> / ${displayAmount(limit)}</div>
      </div>
      <div class="budget-bar-track"><div class="budget-bar-fill" style="width:${ratio * 100}%"></div></div>
      ${note ? `<p class="budget-note">${note}</p>` : ""}
    `;
    listEl.appendChild(card);
  });
}

// ---------- Category grid in form ----------
function renderCategoryGrid() {
  const grid = document.getElementById("categoryGrid");
  grid.innerHTML = "";
  grid.classList.toggle("editing", manageMode);

  const list = categoriesByType[currentType];

  list.forEach((cat) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cat-btn" + (cat.id === currentCategory && !manageMode ? " active" : "");
    btn.dataset.cat = cat.id;
    btn.innerHTML = `
      <span class="cat-emoji">${cat.emoji}</span><span>${escapeHtml(cat.label)}</span>
      <span class="cat-remove" title="Hapus kategori">✕</span>
    `;
    btn.addEventListener("click", () => {
      if (manageMode) {
        removeCategory(currentType, cat.id);
      } else {
        currentCategory = cat.id;
        renderCategoryGrid();
      }
    });
    grid.appendChild(btn);
  });

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "cat-btn cat-add";
  addBtn.innerHTML = `<span class="cat-emoji">＋</span><span>Tambah</span>`;
  addBtn.addEventListener("click", () => {
    resetEmojiPicker();
    document.getElementById("addCategoryForm").hidden = false;
    document.getElementById("newCatName").focus();
  });
  grid.appendChild(addBtn);

  document.getElementById("manageCatBtn").textContent = manageMode ? "Selesai" : "Kelola";
}

function addCategory(type, label, emoji) {
  const cleanLabel = label.trim();
  if (!cleanLabel) return;
  const id = cleanLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "kategori-" + Date.now();
  const finalId = categoriesByType[type].some((c) => c.id === id) ? id + "-" + Date.now() : id;
  categoriesByType[type].push({ id: finalId, label: cleanLabel, emoji: emoji || "🏷️" });
  saveCategories();
  currentCategory = finalId;
  renderCategoryGrid();
}

function removeCategory(type, id) {
  if (categoriesByType[type].length <= 1) {
    alert("Minimal harus ada satu kategori.");
    return;
  }
  const cat = categoriesByType[type].find((c) => c.id === id);
  if (!confirm(`Hapus kategori "${cat ? cat.label : id}"? Transaksi lama yang memakainya tetap tersimpan.`)) return;

  categoriesByType[type] = categoriesByType[type].filter((c) => c.id !== id);
  saveCategories();
  if (budgets[id] !== undefined) {
    delete budgets[id];
    saveBudgets();
  }
  if (currentCategory === id) currentCategory = categoriesByType[type][0].id;
  renderCategoryGrid();
  renderBudgets();
}

// ---------- Actions ----------
function deleteTransaction(id) {
  transactions = transactions.filter((t) => t.id !== id);
  saveTransactions();
  renderAll();
}

function addTransaction({ type, amount, category, note, date }) {
  transactions.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    type,
    amount,
    category,
    note: note.trim(),
    date,
    createdAt: Date.now(),
  });
  saveTransactions();
  renderAll();
}

// ---------- Sheet (form) ----------
const overlay = document.getElementById("sheetOverlay");
const form = document.getElementById("txForm");
const amountInput = document.getElementById("amountInput");
const dateInput = document.getElementById("dateInput");
const submitBtn = document.getElementById("submitBtn");

function openSheet() {
  dateInput.value = new Date().toISOString().slice(0, 10);
  amountInput.value = "";
  document.getElementById("noteInput").value = "";
  currentType = "keluar";
  currentCategory = categoriesByType.keluar[0].id;
  manageMode = false;
  document.getElementById("addCategoryForm").hidden = true;
  updateTypeToggleUI();
  renderCategoryGrid();
  overlay.classList.add("open");
  setTimeout(() => amountInput.focus(), 250);
}

function closeSheet() {
  overlay.classList.remove("open");
}

function updateTypeToggleUI() {
  document.querySelectorAll(".type-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.type === currentType);
  });
  submitBtn.textContent = currentType === "masuk" ? "Simpan Pemasukan" : "Simpan Pengeluaran";
}

document.getElementById("openFormBtn").addEventListener("click", openSheet);
document.getElementById("cancelBtn").addEventListener("click", closeSheet);
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) closeSheet();
});

document.getElementById("typeToggle").addEventListener("click", (e) => {
  const btn = e.target.closest(".type-btn");
  if (!btn) return;
  currentType = btn.dataset.type;
  currentCategory = categoriesByType[currentType][0].id;
  manageMode = false;
  document.getElementById("addCategoryForm").hidden = true;
  updateTypeToggleUI();
  renderCategoryGrid();
});

// ---------- Kelola kategori (tambah/hapus) ----------
document.getElementById("manageCatBtn").addEventListener("click", () => {
  manageMode = !manageMode;
  document.getElementById("addCategoryForm").hidden = true;
  renderCategoryGrid();
});

let pendingCatEmoji = "🏷️";

function resetEmojiPicker() {
  pendingCatEmoji = "🏷️";
  document.querySelectorAll(".emoji-pick-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.emoji === pendingCatEmoji);
  });
}

document.getElementById("emojiPicker").addEventListener("click", (e) => {
  const btn = e.target.closest(".emoji-pick-btn");
  if (!btn) return;
  pendingCatEmoji = btn.dataset.emoji;
  document.querySelectorAll(".emoji-pick-btn").forEach((b) => b.classList.toggle("active", b === btn));
});

document.getElementById("confirmAddCat").addEventListener("click", () => {
  const name = document.getElementById("newCatName").value;
  addCategory(currentType, name, pendingCatEmoji);
  document.getElementById("newCatName").value = "";
  resetEmojiPicker();
  document.getElementById("addCategoryForm").hidden = true;
});

document.getElementById("cancelAddCat").addEventListener("click", () => {
  document.getElementById("newCatName").value = "";
  resetEmojiPicker();
  document.getElementById("addCategoryForm").hidden = true;
});

document.getElementById("newCatName").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    document.getElementById("confirmAddCat").click();
  }
});

// Format input jumlah dengan pemisah ribuan saat mengetik
amountInput.addEventListener("input", () => {
  const digits = amountInput.value.replace(/\D/g, "");
  amountInput.value = digits ? Number(digits).toLocaleString("id-ID") : "";
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const amount = Number(amountInput.value.replace(/\D/g, ""));
  if (!amount || amount <= 0) {
    amountInput.focus();
    return;
  }
  addTransaction({
    type: currentType,
    amount,
    category: currentCategory,
    note: document.getElementById("noteInput").value,
    date: dateInput.value,
  });
  closeSheet();
});

// ---------- Filter chips ----------
document.getElementById("filterRow").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  currentFilter = chip.dataset.filter;
  document.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === chip));
  renderHistory();
});

// ---------- Sheet anggaran (budget) ----------
const budgetOverlay = document.getElementById("budgetOverlay");
const budgetForm = document.getElementById("budgetForm");

function openBudgetSheet() {
  budgetForm.innerHTML = "";
  categoriesByType.keluar.forEach((cat) => {
    const row = document.createElement("div");
    row.className = "budget-row";
    row.innerHTML = `
      <div class="budget-row-label"><span class="cat-emoji">${cat.emoji}</span>${escapeHtml(cat.label)}</div>
      <div class="amount-input">
        <span class="prefix">Rp</span>
        <input type="text" inputmode="numeric" class="budget-input" data-cat="${cat.id}"
          placeholder="Tanpa batas" value="${budgets[cat.id] ? Number(budgets[cat.id]).toLocaleString("id-ID") : ""}">
      </div>
    `;
    budgetForm.appendChild(row);
  });

  budgetForm.querySelectorAll(".budget-input").forEach((input) => {
    input.addEventListener("input", () => {
      const digits = input.value.replace(/\D/g, "");
      input.value = digits ? Number(digits).toLocaleString("id-ID") : "";
    });
  });

  budgetOverlay.classList.add("open");
}

function closeBudgetSheet() {
  budgetOverlay.classList.remove("open");
}

document.getElementById("openBudgetBtn").addEventListener("click", openBudgetSheet);
document.getElementById("cancelBudgetBtn").addEventListener("click", closeBudgetSheet);
budgetOverlay.addEventListener("click", (e) => {
  if (e.target === budgetOverlay) closeBudgetSheet();
});

document.getElementById("saveBudgetBtn").addEventListener("click", () => {
  budgetForm.querySelectorAll(".budget-input").forEach((input) => {
    const catId = input.dataset.cat;
    const amount = Number(input.value.replace(/\D/g, ""));
    if (amount > 0) {
      budgets[catId] = amount;
    } else {
      delete budgets[catId];
    }
  });
  saveBudgets();
  renderBudgets();
  closeBudgetSheet();
});

// ---------- Sembunyikan angka ----------
function updateVisibilityToggleUI() {
  const label = document.getElementById("toggleAmountsLabel");
  const btn = document.getElementById("toggleAmountsBtn");
  const eyeIcon = document.getElementById("eyeIcon");
  label.textContent = hideAmounts ? "Tampilkan angka" : "Sembunyikan angka";
  btn.title = hideAmounts ? "Tampilkan angka" : "Sembunyikan angka";
  eyeIcon.innerHTML = hideAmounts
    ? `<path d="M3 3L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
       <path d="M10.6 5.1C11.06 5.03 11.53 5 12 5C19 5 23 12 23 12C22.6 12.7 21.9 13.68 20.94 14.68M6.5 6.6C3.6 8.4 1 12 1 12C1 12 5 19 12 19C13.9 19 15.5 18.5 16.9 17.7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
       <path d="M9.9 10.1C9.4 10.6 9 11.3 9 12C9 13.7 10.3 15 12 15C12.7 15 13.4 14.6 13.9 14.1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
       <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>`;
}

document.getElementById("toggleAmountsBtn").addEventListener("click", () => {
  hideAmounts = !hideAmounts;
  localStorage.setItem(HIDE_AMOUNTS_KEY, hideAmounts ? "1" : "0");
  updateVisibilityToggleUI();
  renderAll();
});

// ---------- Init ----------
updateVisibilityToggleUI();
renderAll();
