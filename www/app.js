// ---------- Version de esta build (usada para detectar actualizaciones remotas) ----------
const APP_VERSION = '1.1.0';

// ---------- Almacenamiento local (nada sale del telefono) ----------
const STORAGE_KEY = 'gastos_data_v1';

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { trips: [], activeTripId: null };
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function migrateData(d) {
  d.trips.forEach(t => {
    if (!Array.isArray(t.deposits)) {
      t.deposits = (t.deposit && t.deposit > 0)
        ? [{ id: uid(), amount: t.deposit, timestamp: t.startedAt }]
        : [];
    }
  });
  return d;
}

let data = migrateData(loadData());

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getActiveTrip() {
  if (!data.activeTripId) return null;
  return data.trips.find(t => t.id === data.activeTripId) || null;
}

function getTrip(id) {
  return data.trips.find(t => t.id === id) || null;
}

function tripTotal(trip) {
  return trip.expenses.reduce((s, e) => s + e.amount, 0);
}

function depositsTotal(trip) {
  return (trip.deposits || []).reduce((s, d) => s + d.amount, 0);
}

function tripBalance(trip) {
  return depositsTotal(trip) - tripTotal(trip);
}

function fmt(n) {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---------- Viaje ----------
function startTrip() {
  const trip = { id: uid(), startedAt: Date.now(), endedAt: null, expenses: [], deposits: [] };
  data.trips.push(trip);
  data.activeTripId = trip.id;
  saveData();
  renderTripBar();
}

function endTrip() {
  const trip = getActiveTrip();
  if (!trip) return;
  trip.endedAt = Date.now();
  data.activeTripId = null;
  saveData();
  renderTripBar();
  openDetalle(trip.id);
  switchView('detalle');
}

function addExpense(amount, category) {
  let trip = getActiveTrip();
  let autoStarted = false;
  if (!trip) {
    trip = { id: uid(), startedAt: Date.now(), endedAt: null, expenses: [], deposits: [] };
    data.trips.push(trip);
    data.activeTripId = trip.id;
    autoStarted = true;
  }
  trip.expenses.push({ id: uid(), amount, category, timestamp: Date.now() });
  saveData();
  renderTripBar();
  return autoStarted;
}

// ---------- Depósito de la empresa ----------
const depositModal = document.getElementById('deposit-modal');
const depositInput = document.getElementById('deposit-input');
let depositResolve = null;

function askDepositAmount() {
  return new Promise((resolve) => {
    depositResolve = resolve;
    depositInput.value = '';
    depositModal.classList.add('show');
    depositInput.focus();
    depositInput.select();
  });
}

function closeDepositModal(result) {
  depositModal.classList.remove('show');
  if (depositResolve) {
    depositResolve(result);
    depositResolve = null;
  }
}

document.getElementById('deposit-cancel').addEventListener('click', () => closeDepositModal(null));
document.getElementById('deposit-save').addEventListener('click', () => {
  const amount = parseFloat(depositInput.value);
  if (isNaN(amount) || amount <= 0) {
    showToast('Monto inválido');
    return;
  }
  closeDepositModal(amount);
});
depositInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('deposit-save').click();
});
depositModal.addEventListener('click', (e) => {
  if (e.target === depositModal) closeDepositModal(null);
});

async function addDepositOnActiveTrip() {
  let trip = getActiveTrip();
  let autoStarted = false;
  if (!trip) {
    trip = { id: uid(), startedAt: Date.now(), endedAt: null, expenses: [], deposits: [] };
    data.trips.push(trip);
    data.activeTripId = trip.id;
    autoStarted = true;
  }
  const amount = await askDepositAmount();
  if (amount === null) {
    if (autoStarted) {
      data.trips.pop();
      data.activeTripId = null;
    }
    return;
  }
  trip.deposits.push({ id: uid(), amount, timestamp: Date.now() });
  saveData();
  renderTripBar();
  showToast(autoStarted
    ? `Depósito $${fmt(amount)} guardado · viaje iniciado`
    : `Depósito $${fmt(amount)} agregado`);
}

// ---------- Descripcion libre (categoria "Otro") ----------
const descModal = document.getElementById('desc-modal');
const descInput = document.getElementById('desc-input');
let descResolve = null;

function askDescription() {
  return new Promise((resolve) => {
    descResolve = resolve;
    descInput.value = '';
    descModal.classList.add('show');
    descInput.focus();
  });
}

function closeDescModal(result) {
  descModal.classList.remove('show');
  if (descResolve) {
    descResolve(result);
    descResolve = null;
  }
}

document.getElementById('desc-cancel').addEventListener('click', () => closeDescModal(null));
document.getElementById('desc-save').addEventListener('click', () => {
  const text = descInput.value.trim();
  if (!text) {
    showToast('Escribe una descripción');
    return;
  }
  closeDescModal(text);
});
descInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('desc-save').click();
});
descModal.addEventListener('click', (e) => {
  if (e.target === descModal) closeDescModal(null);
});

// ---------- UI: barra de viaje ----------
const tripBar = document.getElementById('trip-bar');
const tripStatusEl = document.getElementById('trip-status');
const tripTotalEl = document.getElementById('trip-total');
const tripDepositEl = document.getElementById('trip-deposit');
const tripToggleBtn = document.getElementById('trip-toggle-btn');
const tripDepositBtn = document.getElementById('trip-deposit-btn');

function renderTripBar() {
  const trip = getActiveTrip();
  if (trip) {
    tripBar.classList.add('trip-active');
    tripBar.classList.remove('trip-inactive');
    const mins = Math.max(0, Math.round((Date.now() - trip.startedAt) / 60000));
    tripStatusEl.textContent = `Viaje activo · ${mins} min`;
    tripTotalEl.textContent = `Gastos: $${fmt(tripTotal(trip))}`;
    const deposit = depositsTotal(trip);
    if (deposit > 0) {
      const balance = tripBalance(trip);
      tripDepositEl.textContent = `Depósitos: $${fmt(deposit)} · Saldo: $${fmt(balance)}`;
      tripDepositEl.classList.toggle('balance-neg', balance < 0);
    } else {
      tripDepositEl.textContent = 'Sin depósito registrado';
      tripDepositEl.classList.remove('balance-neg');
    }
    tripDepositBtn.textContent = 'Agregar depósito';
    tripToggleBtn.textContent = 'Terminar viaje';
  } else {
    tripBar.classList.remove('trip-active');
    tripBar.classList.add('trip-inactive');
    tripStatusEl.textContent = 'Sin viaje activo';
    tripTotalEl.textContent = '';
    tripDepositEl.textContent = '';
    tripDepositEl.classList.remove('balance-neg');
    tripToggleBtn.textContent = 'Iniciar viaje';
    tripDepositBtn.textContent = 'Agregar depósito';
  }
}

tripToggleBtn.addEventListener('click', () => {
  if (getActiveTrip()) {
    if (confirm('¿Terminar el viaje actual?')) endTrip();
  } else {
    startTrip();
  }
});

tripDepositBtn.addEventListener('click', addDepositOnActiveTrip);

setInterval(renderTripBar, 30000);

// ---------- UI: teclado ----------
const amountValueEl = document.getElementById('amount-value');
let amountStr = '0';

function renderAmount() {
  amountValueEl.textContent = amountStr;
}

document.getElementById('keypad').addEventListener('click', (e) => {
  const btn = e.target.closest('.key');
  if (!btn) return;
  const k = btn.dataset.key;
  if (k === 'back') {
    amountStr = amountStr.length > 1 ? amountStr.slice(0, -1) : '0';
  } else if (k === '.') {
    if (!amountStr.includes('.')) amountStr += '.';
  } else {
    if (amountStr === '0') amountStr = k;
    else if (amountStr.split('.')[1]?.length >= 2) return; // max 2 decimales
    else amountStr += k;
  }
  renderAmount();
});

// ---------- UI: categorias (guardan el gasto) ----------
const toastEl = document.getElementById('toast');
let toastTimer = null;
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1400);
}

document.getElementById('categories').addEventListener('click', async (e) => {
  const btn = e.target.closest('.cat-btn');
  if (!btn) return;
  const amount = parseFloat(amountStr);
  if (!amount || amount <= 0) {
    showToast('Ingresa un monto');
    return;
  }
  let category = btn.dataset.cat;
  if (category === '__custom__') {
    const desc = await askDescription();
    if (!desc) return;
    category = desc;
  }
  const autoStarted = addExpense(amount, category);
  btn.classList.add('flash');
  setTimeout(() => btn.classList.remove('flash'), 200);
  showToast(autoStarted
    ? `$${fmt(amount)} guardado · viaje iniciado`
    : `$${fmt(amount)} · ${category} guardado`);
  amountStr = '0';
  renderAmount();
});

// ---------- Navegacion de vistas ----------
function switchView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  if (name === 'historial') renderHistorial();
}

document.getElementById('tabbar').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  switchView(btn.dataset.view);
});

// ---------- Historial ----------
const historialListEl = document.getElementById('historial-list');

function renderHistorial() {
  const trips = [...data.trips].sort((a, b) => b.startedAt - a.startedAt);
  if (trips.length === 0) {
    historialListEl.innerHTML = '<div class="empty-msg">Aún no hay viajes registrados</div>';
    return;
  }
  historialListEl.innerHTML = trips.map(t => {
    const date = new Date(t.startedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    const active = !t.endedAt;
    const deposit = depositsTotal(t);
    const depositLine = deposit > 0
      ? `<div class="trip-card-sub">Depósito $${fmt(deposit)} · Saldo <span class="${tripBalance(t) < 0 ? 'balance-neg' : ''}">$${fmt(tripBalance(t))}</span></div>`
      : '';
    const deleteBtn = active ? '' : `<button class="trip-del-btn" data-del="${t.id}">🗑️ Borrar</button>`;
    return `<div class="trip-card ${active ? 'active-trip' : ''}" data-id="${t.id}">
      <div class="trip-card-top">
        <span>${date}${active ? ' · en curso' : ''}</span>
        <span>$${fmt(tripTotal(t))}</span>
      </div>
      <div class="trip-card-sub">${t.expenses.length} gasto${t.expenses.length === 1 ? '' : 's'}</div>
      ${depositLine}
      ${deleteBtn}
    </div>`;
  }).join('');
}

historialListEl.addEventListener('click', (e) => {
  const delBtn = e.target.closest('[data-del]');
  if (delBtn) {
    if (!confirm('¿Borrar este viaje y todos sus gastos? Esto no se puede deshacer.')) return;
    data.trips = data.trips.filter(t => t.id !== delBtn.dataset.del);
    saveData();
    renderHistorial();
    return;
  }
  const card = e.target.closest('.trip-card');
  if (!card) return;
  openDetalle(card.dataset.id);
  switchView('detalle');
});

// ---------- Detalle de viaje ----------
let detalleTripId = null;
const detalleTituloEl = document.getElementById('detalle-titulo');
const detalleTotalEl = document.getElementById('detalle-total');
const detalleDepositoEl = document.getElementById('detalle-deposito');
const detalleDepositosEl = document.getElementById('detalle-depositos');
const detalleItemsEl = document.getElementById('detalle-items');

function openDetalle(tripId) {
  detalleTripId = tripId;
  renderDetalle();
}

function catEmoji(cat) {
  const map = { Caseta: '🛣️', Gasolina: '⛽', Estacionamiento: '🅿️', Hotel: '🏨' };
  return map[cat] || '💵';
}

function renderDetalle() {
  const trip = getTrip(detalleTripId);
  if (!trip) { switchView('historial'); return; }
  const dateStart = new Date(trip.startedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
  detalleTituloEl.textContent = `Viaje del ${dateStart}`;
  detalleTotalEl.textContent = `Gastos: $${fmt(tripTotal(trip))} · ${trip.expenses.length} gasto(s)` + (trip.endedAt ? '' : ' · en curso');

  const deposit = depositsTotal(trip);
  if (deposit > 0) {
    const balance = tripBalance(trip);
    detalleDepositoEl.innerHTML = `Depósitos: $${fmt(deposit)} · Saldo: <span class="${balance < 0 ? 'balance-neg' : ''}">$${fmt(balance)}</span>`;
  } else {
    detalleDepositoEl.textContent = 'Sin depósito registrado';
  }

  const deposits = [...(trip.deposits || [])].sort((a, b) => a.timestamp - b.timestamp);
  detalleDepositosEl.innerHTML = deposits.map(d => {
    const time = new Date(d.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    return `<div class="item-row" data-id="${d.id}">
      <div class="item-left">
        <span>💰</span>
        <span>
          <div>Depósito</div>
          <div class="item-cat">${time}</div>
        </span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="item-amount">$${fmt(d.amount)}</span>
        <button class="item-del" data-del="${d.id}">✕</button>
      </div>
    </div>`;
  }).join('');

  const items = [...trip.expenses].sort((a, b) => a.timestamp - b.timestamp);
  detalleItemsEl.innerHTML = items.map(it => {
    const time = new Date(it.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    return `<div class="item-row" data-id="${it.id}">
      <div class="item-left">
        <span>${catEmoji(it.category)}</span>
        <span>
          <div>${it.category}</div>
          <div class="item-cat">${time}</div>
        </span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="item-amount">$${fmt(it.amount)}</span>
        <button class="item-del" data-del="${it.id}">✕</button>
      </div>
    </div>`;
  }).join('') || '<div class="empty-msg">Sin gastos en este viaje</div>';
}

detalleItemsEl.addEventListener('click', (e) => {
  const delBtn = e.target.closest('[data-del]');
  if (!delBtn) return;
  const trip = getTrip(detalleTripId);
  if (!trip) return;
  trip.expenses = trip.expenses.filter(x => x.id !== delBtn.dataset.del);
  saveData();
  renderDetalle();
  renderTripBar();
});

detalleDepositosEl.addEventListener('click', (e) => {
  const delBtn = e.target.closest('[data-del]');
  if (!delBtn) return;
  const trip = getTrip(detalleTripId);
  if (!trip) return;
  trip.deposits = (trip.deposits || []).filter(d => d.id !== delBtn.dataset.del);
  saveData();
  renderDetalle();
  renderTripBar();
});

document.getElementById('detalle-back').addEventListener('click', () => switchView('historial'));

document.getElementById('btn-agregar-deposito').addEventListener('click', async () => {
  const trip = getTrip(detalleTripId);
  if (!trip) return;
  const amount = await askDepositAmount();
  if (amount === null) return;
  trip.deposits.push({ id: uid(), amount, timestamp: Date.now() });
  saveData();
  renderDetalle();
  renderTripBar();
  showToast(`Depósito $${fmt(amount)} agregado`);
});

function buildResumenTexto(trip) {
  const dateStart = new Date(trip.startedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
  const items = [...trip.expenses].sort((a, b) => a.timestamp - b.timestamp);
  let txt = `Reporte de gastos - Viaje del ${dateStart}\n\n`;
  items.forEach(it => {
    const time = new Date(it.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    txt += `${time}  ${it.category.padEnd(16, ' ')} $${fmt(it.amount)}\n`;
  });
  txt += `\nTOTAL GASTOS: $${fmt(tripTotal(trip))}`;
  const deposits = [...(trip.deposits || [])].sort((a, b) => a.timestamp - b.timestamp);
  const deposit = depositsTotal(trip);
  if (deposit > 0) {
    txt += `\n\nDEPÓSITOS:`;
    deposits.forEach(d => {
      const time = new Date(d.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      txt += `\n${time}  $${fmt(d.amount)}`;
    });
    const balance = tripBalance(trip);
    txt += `\nTOTAL DEPÓSITOS: $${fmt(deposit)}`;
    txt += `\nSALDO: $${fmt(balance)}` + (balance < 0 ? ' (excedido)' : '');
  }
  return txt;
}

document.getElementById('btn-copiar').addEventListener('click', async () => {
  const trip = getTrip(detalleTripId);
  if (!trip) return;
  const txt = buildResumenTexto(trip);
  try {
    await navigator.clipboard.writeText(txt);
    showToast('Resumen copiado');
  } catch (e) {
    showToast('No se pudo copiar');
  }
});

document.getElementById('btn-compartir').addEventListener('click', async () => {
  const trip = getTrip(detalleTripId);
  if (!trip) return;
  const txt = buildResumenTexto(trip);
  if (navigator.share) {
    try { await navigator.share({ text: txt, title: 'Reporte de gastos' }); }
    catch (e) {}
  } else {
    try { await navigator.clipboard.writeText(txt); showToast('Copiado (compartir no disponible)'); }
    catch (e) {}
  }
});

document.getElementById('btn-borrar-viaje').addEventListener('click', () => {
  const trip = getTrip(detalleTripId);
  if (!trip) return;
  if (!confirm('¿Borrar este viaje y todos sus gastos? Esto no se puede deshacer.')) return;
  data.trips = data.trips.filter(t => t.id !== trip.id);
  if (data.activeTripId === trip.id) data.activeTripId = null;
  saveData();
  switchView('historial');
  renderTripBar();
});

// ---------- Inicio ----------
renderTripBar();
renderAmount();

// ---------- Service worker (uso offline) ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

// ---------- Actualizaciones remotas (OTA) ----------
// Cuando hay internet (wifi o datos), se revisa si hay una version mas nueva
// publicada en GitHub. Si la hay, se descarga en segundo plano y queda lista
// para aplicarse sola la proxima vez que la app pase a segundo plano o se
// vuelva a abrir, sin interrumpir un registro en curso.
const UPDATE_MANIFEST_URL = 'https://raw.githubusercontent.com/killspree2704/gastos-app/master/update.json';
const MIN_CHECK_INTERVAL_MS = 5 * 60 * 1000;
let lastUpdateCheckAt = 0;
let updateCheckInFlight = false;

function isNewerVersion(remote, local) {
  const a = String(remote).split('.').map(n => parseInt(n, 10) || 0);
  const b = String(local).split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0, y = b[i] || 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

function getUpdaterPlugin() {
  const cap = window.Capacitor;
  if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return null;
  return (cap.Plugins && cap.Plugins.CapacitorUpdater) || null;
}

async function checkForUpdate() {
  const updater = getUpdaterPlugin();
  if (!updater || updateCheckInFlight) return;
  const now = Date.now();
  if (now - lastUpdateCheckAt < MIN_CHECK_INTERVAL_MS) return;
  lastUpdateCheckAt = now;
  updateCheckInFlight = true;
  try {
    const res = await fetch(UPDATE_MANIFEST_URL, { cache: 'no-store' });
    if (!res.ok) return;
    const manifest = await res.json();
    if (!manifest.version || !manifest.url) return;
    if (!isNewerVersion(manifest.version, APP_VERSION)) return;
    const bundle = await updater.download({
      url: manifest.url,
      version: manifest.version,
      checksum: manifest.checksum,
    });
    await updater.next({ id: bundle.id });
  } catch (e) {
    // sin conexion o error de red: se sigue usando la version actual
  } finally {
    updateCheckInFlight = false;
  }
}

const updaterPlugin = getUpdaterPlugin();
if (updaterPlugin) {
  updaterPlugin.notifyAppReady().catch(() => {});
}

const LAST_VERSION_KEY = 'gastos_last_version';
const lastSeenVersion = localStorage.getItem(LAST_VERSION_KEY);
if (lastSeenVersion && lastSeenVersion !== APP_VERSION) {
  showToast(`Actualizado a v${APP_VERSION}`);
}
localStorage.setItem(LAST_VERSION_KEY, APP_VERSION);

window.addEventListener('online', checkForUpdate);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') checkForUpdate();
});
// no se filtra por navigator.onLine: en un arranque en frio suele reportar
// false por un instante aunque ya haya conexion, y el fetch de abajo ya
// falla solo (silenciosamente) si de verdad no hay red.
checkForUpdate();
