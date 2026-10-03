// ---------- Version de esta build (usada para detectar actualizaciones remotas) ----------
const APP_VERSION = '1.5.1';

// ---------- Iconografia (outline, trazo fino, hereda color via currentColor) ----------
const ICONS = {
  toll: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 3 5 21"/><path d="M15.5 3 19 21"/><path d="M12 3v2.5M12 9v2.5M12 15v2.5"/></svg>',
  fuel: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/><path d="M4 21h10"/><path d="M9 10H7"/><path d="M14 8.5h2.5L19 11v6a1.5 1.5 0 0 1-3 0v-3h-2"/></svg>',
  parking: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 16V8h3.2a2.4 2.4 0 1 1 0 4.8H9.5"/></svg>',
  hotel: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 19v-6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v2"/><path d="M3 21h18"/><path d="M12 15V8a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v7"/><circle cx="7" cy="12.5" r="1.3"/></svg>',
  tag: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12.6 2.6 21 11a2 2 0 0 1 0 2.8l-7.2 7.2a2 2 0 0 1-2.8 0L2.6 12.6A2 2 0 0 1 2 11.2V4A1.4 1.4 0 0 1 3.4 2.6h7.8c.5 0 1 .2 1.4.6Z"/><circle cx="7.3" cy="7.3" r="1.2"/></svg>',
  wallet: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6" width="19" height="13" rx="2.3"/><path d="M2.5 10.2h19"/><circle cx="17" cy="14.3" r="1.1"/></svg>',
  close: '<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  trash: '<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V7"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M10 11v6M14 11v6"/></svg>',
  flag: '<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3v18"/><path d="M5 4h11l-2 4 2 4H5"/></svg>',
  stop: '<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="14" rx="2.5"/></svg>',
};

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

function fmtMoney(n) {
  return (n < 0 ? '-$' : '$') + fmt(Math.abs(n));
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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

// ---------- Modal de monto (deposito, gasto agregado desde el detalle) ----------
const depositModal = document.getElementById('deposit-modal');
const depositModalTitle = document.getElementById('deposit-modal-title');
const depositInput = document.getElementById('deposit-input');
let depositResolve = null;

function askAmountModal(heading) {
  return new Promise((resolve) => {
    depositResolve = resolve;
    depositModalTitle.textContent = heading;
    depositInput.value = '';
    depositModal.classList.add('show');
    depositInput.focus();
    depositInput.select();
  });
}

function askDepositAmount() {
  return askAmountModal('Nuevo depósito de la empresa');
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

// ---------- Modal de texto libre (categoria "Otro", titulo del reporte) ----------
const descModal = document.getElementById('desc-modal');
const descModalTitle = document.getElementById('desc-modal-title');
const descInput = document.getElementById('desc-input');
let descResolve = null;
let descEmptyMsg = 'Escribe una descripción';

function askTextModal({ heading, placeholder, prefill, emptyMsg }) {
  return new Promise((resolve) => {
    descResolve = resolve;
    descEmptyMsg = emptyMsg || 'Escribe un texto';
    descModalTitle.textContent = heading;
    descInput.placeholder = placeholder || '';
    descInput.value = prefill || '';
    descModal.classList.add('show');
    descInput.focus();
    descInput.select();
  });
}

function askDescription() {
  return askTextModal({
    heading: 'Descripción del gasto',
    placeholder: 'Ej. recarga celular, comida, herramienta',
    emptyMsg: 'Escribe una descripción',
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
    showToast(descEmptyMsg);
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
    tripTotalEl.innerHTML = `Gastos: <span class="money">$${fmt(tripTotal(trip))}</span>`;
    const deposit = depositsTotal(trip);
    if (deposit > 0) {
      const balance = tripBalance(trip);
      const balanceClass = balance < 0 ? 'money balance-neg' : 'money accent';
      tripDepositEl.innerHTML = `Depósitos: <span class="money">$${fmt(deposit)}</span> · Saldo: <span class="${balanceClass}">$${fmt(balance)}</span>`;
    } else {
      tripDepositEl.textContent = 'Sin depósito registrado';
    }
    tripToggleBtn.innerHTML = `${ICONS.stop}Terminar viaje`;
  } else {
    tripBar.classList.remove('trip-active');
    tripBar.classList.add('trip-inactive');
    tripStatusEl.textContent = 'Sin viaje activo';
    tripTotalEl.textContent = '';
    tripDepositEl.textContent = '';
    tripToggleBtn.innerHTML = `${ICONS.flag}Iniciar viaje`;
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
      ? `<div class="trip-card-sub">Depósito $${fmt(deposit)} · Saldo <span class="money ${tripBalance(t) < 0 ? 'balance-neg' : 'accent'}">$${fmt(tripBalance(t))}</span></div>`
      : '';
    const deleteBtn = active ? '' : `<button class="trip-del-btn" data-del="${t.id}">${ICONS.trash}Borrar</button>`;
    const nameLine = t.name ? `<div class="trip-card-sub">${escapeHtml(t.name)}</div>` : '';
    return `<div class="trip-card ${active ? 'active-trip' : ''}" data-id="${t.id}">
      <div class="trip-card-top">
        <span>${date}${active ? ' · en curso' : ''}</span>
        <span class="trip-card-amount money">$${fmt(tripTotal(t))}</span>
      </div>
      ${nameLine}
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

function catIcon(cat) {
  const map = { Caseta: ICONS.toll, Gasolina: ICONS.fuel, Estacionamiento: ICONS.parking, Hotel: ICONS.hotel };
  return map[cat] || ICONS.tag;
}

function renderDetalle() {
  const trip = getTrip(detalleTripId);
  if (!trip) { switchView('historial'); return; }
  const dateStart = new Date(trip.startedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
  detalleTituloEl.textContent = trip.name ? trip.name : `Viaje del ${dateStart}`;
  detalleTotalEl.innerHTML = `Gastos: <span class="money">$${fmt(tripTotal(trip))}</span> · ${trip.expenses.length} gasto(s)` + (trip.endedAt ? '' : ' · en curso');

  const deposit = depositsTotal(trip);
  if (deposit > 0) {
    const balance = tripBalance(trip);
    const balanceClass = balance < 0 ? 'money balance-neg' : 'money accent';
    detalleDepositoEl.innerHTML = `Depósitos: <span class="money">$${fmt(deposit)}</span> · Saldo: <span class="${balanceClass}">$${fmt(balance)}</span>`;
  } else {
    detalleDepositoEl.textContent = 'Sin depósito registrado';
  }

  const deposits = [...(trip.deposits || [])].sort((a, b) => a.timestamp - b.timestamp);
  detalleDepositosEl.innerHTML = deposits.map(d => {
    const time = new Date(d.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    return `<div class="item-row" data-id="${d.id}">
      <div class="item-left">
        ${ICONS.wallet}
        <span>
          <div>Depósito</div>
          <div class="item-cat">${time}</div>
        </span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="item-amount">$${fmt(d.amount)}</span>
        <button class="item-del" data-del="${d.id}">${ICONS.close}</button>
      </div>
    </div>`;
  }).join('');

  const items = [...trip.expenses].sort((a, b) => a.timestamp - b.timestamp);
  detalleItemsEl.innerHTML = items.map(it => {
    const time = new Date(it.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    return `<div class="item-row" data-id="${it.id}">
      <div class="item-left">
        ${catIcon(it.category)}
        <span>
          <div>${escapeHtml(it.category || 'Gasto')}</div>
          <div class="item-cat">${time}</div>
        </span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="item-amount">$${fmt(it.amount)}</span>
        <button class="item-del" data-del="${it.id}">${ICONS.close}</button>
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

document.getElementById('btn-editar').addEventListener('click', async () => {
  const trip = getTrip(detalleTripId);
  if (!trip) return;
  try {
    const amount = await askAmountModal('Monto del gasto');
    if (amount === null || amount <= 0) return;
    const categoria = await askTextModal({
      heading: 'Categoría del gasto',
      placeholder: 'Ej. Gasolina, Hotel, recarga celular',
      emptyMsg: 'Escribe una categoría',
    });
    if (!categoria) return;
    trip.expenses.push({ id: uid(), amount, category: categoria, timestamp: Date.now() });
    saveData();
    renderDetalle();
    renderTripBar();
    showToast(`$${fmt(amount)} · ${categoria} agregado`);
  } catch (e) {
    showToast('No se pudo agregar: ' + (e && e.message ? e.message : 'error desconocido'));
  }
});

function buildResumenTexto(trip) {
  const dateStart = new Date(trip.startedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
  const items = [...trip.expenses].sort((a, b) => a.timestamp - b.timestamp);
  let txt = `Reporte de gastos - Viaje del ${dateStart}\n\n`;
  items.forEach(it => {
    const time = new Date(it.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    txt += `${time}  ${String(it.category || 'Gasto').padEnd(16, ' ')} $${fmt(it.amount)}\n`;
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

// ---------- Resumen en imagen (tabla, para compartir por WhatsApp) ----------
function resumenTituloDefault(trip) {
  const dateStart = new Date(trip.startedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
  return `Gastos viaje ${dateStart}`;
}

function resumenTitulo(trip) {
  return trip.name || resumenTituloDefault(trip);
}

function buildResumenFilas(trip) {
  const orden = [];
  const totales = {};
  trip.expenses.forEach(e => {
    const cat = e.category || 'Gasto';
    if (!(cat in totales)) {
      totales[cat] = 0;
      orden.push(cat);
    }
    totales[cat] += (e.amount || 0);
  });
  const filas = orden.map(cat => ({ label: cat, amount: totales[cat] }));
  const deposit = depositsTotal(trip);
  if (deposit > 0) {
    filas.push({ label: 'Restan', amount: tripBalance(trip) });
  }
  return filas;
}

async function buildResumenImageBlob(trip, titulo) {
  const filas = buildResumenFilas(trip);
  titulo = titulo || resumenTitulo(trip);

  try {
    await Promise.all([
      document.fonts.load('700 28px Inter'),
      document.fonts.load('400 26px Inter'),
      document.fonts.load('600 26px Inter'),
    ]);
  } catch (e) {
    // si la fuente no cargo a tiempo, el canvas cae a sans-serif del sistema
  }

  const width = 720;
  const rowH = 56;
  const headerH = 64;
  const height = headerH + Math.max(filas.length, 1) * rowH;
  const colX = Math.round(width * 0.62);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#444444';
  ctx.lineWidth = 2;
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'middle';

  ctx.strokeRect(1, 1, width - 2, height - 2);

  ctx.font = '700 28px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(titulo, 16, headerH / 2);
  ctx.beginPath();
  ctx.moveTo(0, headerH);
  ctx.lineTo(width, headerH);
  ctx.stroke();

  filas.forEach((f, i) => {
    const y = headerH + i * rowH;
    if (i > 0) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(colX, y);
    ctx.lineTo(colX, y + rowH);
    ctx.stroke();

    ctx.font = '400 26px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(f.label, 16, y + rowH / 2);

    ctx.font = '600 26px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(fmtMoney(f.amount), width - 16, y + rowH / 2);
  });

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

document.getElementById('btn-copiar').addEventListener('click', async () => {
  const trip = getTrip(detalleTripId);
  if (!trip) return;
  try {
    const txt = buildResumenTexto(trip);
    await navigator.clipboard.writeText(txt);
    showToast('Resumen copiado');
  } catch (e) {
    showToast('No se pudo copiar: ' + (e && e.message ? e.message : 'error desconocido'));
  }
});

document.getElementById('btn-compartir').addEventListener('click', async () => {
  const trip = getTrip(detalleTripId);
  if (!trip) return;
  try {
    const titulo = await askTextModal({
      heading: 'Título del reporte',
      placeholder: 'Ej. Viaje a Oaxaca',
      prefill: resumenTitulo(trip),
      emptyMsg: 'Escribe un título',
    });
    if (!titulo) return;
    trip.name = titulo;
    saveData();
    renderDetalle();

    const blob = await buildResumenImageBlob(trip, titulo);

    // En la app nativa, navigator.share() del WebView no es confiable:
    // usamos el plugin nativo Share (via Filesystem para escribir la imagen
    // primero) que si abre el dialogo real de Android.
    const nativeShare = getSharePlugin();
    const filesystem = getFilesystemPlugin();
    if (blob && nativeShare && filesystem) {
      const base64 = await blobToBase64(blob);
      const written = await filesystem.writeFile({
        path: 'gastos-reporte.png',
        data: base64,
        directory: 'CACHE',
      });
      await nativeShare.share({ title: titulo, dialogTitle: 'Compartir reporte', files: [written.uri] });
      return;
    }

    // navigator.share() consume el "gesto del usuario" en cuanto se llama una
    // vez (exito o error): llamarlo dos veces seguidas (imagen y luego texto)
    // hace que la segunda SIEMPRE falle. Por eso decidimos de antemano con
    // canShare (que no consume nada) y llamamos a share() una sola vez.
    const file = blob ? new File([blob], 'gastos.png', { type: 'image/png' }) : null;
    const puedeCompartirImagen = !!(file && navigator.canShare && navigator.canShare({ files: [file] }));

    if (navigator.share) {
      try {
        if (puedeCompartirImagen) {
          await navigator.share({ files: [file], title: titulo });
        } else {
          await navigator.share({ text: buildResumenTexto(trip), title: titulo });
        }
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return; // usuario cancelo el dialogo
        // cualquier otro error: caemos al portapapeles
      }
    }
    await navigator.clipboard.writeText(buildResumenTexto(trip));
    showToast(puedeCompartirImagen
      ? 'No se pudo compartir: se copió el resumen en texto'
      : 'Tu teléfono no soporta compartir imágenes: se copió el resumen en texto');
  } catch (e) {
    showToast('No se pudo compartir: ' + (e && e.message ? e.message : 'error desconocido'));
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

// navigator.share() del WebView de Android no funciona de forma confiable
// dentro de apps Capacitor (el navegador "dice" que lo soporta pero el
// dialogo nativo nunca aparece). Usamos el plugin nativo Share en su lugar.
function getSharePlugin() {
  const cap = window.Capacitor;
  if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return null;
  return (cap.Plugins && cap.Plugins.Share) || null;
}

function getFilesystemPlugin() {
  const cap = window.Capacitor;
  if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return null;
  return (cap.Plugins && cap.Plugins.Filesystem) || null;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || '');
      resolve(result.split(',')[1] || '');
    };
    reader.onerror = () => reject(reader.error || new Error('No se pudo leer la imagen'));
    reader.readAsDataURL(blob);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Justo al abrir la app el stack de red del WebView a veces no esta listo
// todavia y el primer fetch falla con "Failed to fetch" aunque haya internet.
// Reintentamos unas cuantas veces antes de rendirnos.
async function fetchWithRetry(url, options, attempts = 3, delayMs = 1500) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetch(url, options);
    } catch (e) {
      lastError = e;
      if (i < attempts - 1) await sleep(delayMs);
    }
  }
  throw lastError;
}

async function checkForUpdate() {
  const updater = getUpdaterPlugin();
  if (!updater || updateCheckInFlight) return;
  const now = Date.now();
  if (now - lastUpdateCheckAt < MIN_CHECK_INTERVAL_MS) return;
  lastUpdateCheckAt = now;
  updateCheckInFlight = true;
  try {
    const res = await fetchWithRetry(UPDATE_MANIFEST_URL, { cache: 'no-store' });
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
    // "next" solo deja la version lista para la proxima vez que la app pase a
    // segundo plano o se reabra. Si no hay nada en curso (sin monto tecleado
    // ni modal abierto), la aplicamos ya mismo para no depender de eso.
    const modalAbierto = depositModal.classList.contains('show') || descModal.classList.contains('show');
    if (amountStr === '0' && !modalAbierto && typeof updater.reload === 'function') {
      await updater.reload();
    }
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
