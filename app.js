// ===== Guciku — Tahap 1 =====
// Catat pemasukan & pengeluaran harian, kategori, ringkasan.

const CATEGORIES = [
  { id: "makan", label: "Makan", emoji: "🍚" },
  { id: "transport", label: "Transport", emoji: "🛵" },
  { id: "belanja", label: "Belanja", emoji: "🛍️" },
  { id: "tagihan", label: "Tagihan", emoji: "🧾" },
  { id: "lainnya", label: "Lainnya", emoji: "📦" },
];

const STORAGE_KEY = "guciku:transactions";

let transactions = loadTransactions();
let currentType = "keluar";
let currentCategory = CATEGORIES[0].id;
let currentFilter = "semua";

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

// ---------- Format ----------
function formatRupiah(n) {
  const rounded = Math.round(n);
  return "Rp " + rounded.toLocaleString("id-ID");
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

function categoryInfo(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
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

// ---------- Rendering ----------
function renderSummary() {
  const { masuk, keluar, saldo } = computeTotals();
  document.getElementById("totalMasuk").textContent = formatRupiah(masuk);
  document.getElementById("totalKeluar").textContent = formatRupiah(keluar);
  document.getElementById("saldoAmount").textContent = formatRupiah(saldo);

  // Isi jar: proporsi saldo terhadap total pemasukan (kapasitas jar)
  const capacity = Math.max(masuk, saldo, 1);
  const ratio = Math.max(0, Math.min(1, saldo / capacity));
  const jarTop = 6, jarBottom = 147; // koordinat outline jar di SVG
  const fillHeight = (jarBottom - jarTop) * ratio;
  const fillY = jarBottom - fillHeight;

  const fillEl = document.getElementById("jarFill");
  fillEl.setAttribute("y", fillY);
  fillEl.setAttribute("height", fillHeight + 20);
  fillEl.setAttribute("fill", saldo < 0 ? "var(--terracotta)" : "var(--sage)");
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
      const cat = categoryInfo(t.category);
      const row = document.createElement("div");
      row.className = "tx-row";
      row.dataset.type = t.type;

      row.innerHTML = `
        <div class="tx-icon">${cat.emoji}</div>
        <div class="tx-main">
          <div class="tx-category">${cat.label}</div>
          ${t.note ? `<div class="tx-note">${escapeHtml(t.note)}</div>` : ""}
        </div>
        <div class="tx-amount">${t.type === "masuk" ? "+" : "-"} ${formatRupiah(t.amount)}</div>
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
  renderHistory();
}

// ---------- Category grid in form ----------
function renderCategoryGrid() {
  const grid = document.getElementById("categoryGrid");
  grid.innerHTML = "";
  CATEGORIES.forEach((cat) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cat-btn" + (cat.id === currentCategory ? " active" : "");
    btn.dataset.cat = cat.id;
    btn.innerHTML = `<span class="cat-emoji">${cat.emoji}</span><span>${cat.label}</span>`;
    btn.addEventListener("click", () => {
      currentCategory = cat.id;
      renderCategoryGrid();
    });
    grid.appendChild(btn);
  });
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
  currentCategory = CATEGORIES[0].id;
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
  updateTypeToggleUI();
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

// ---------- Init ----------
renderAll();
