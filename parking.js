/* ═══════════════════════════════════════════════════
   ParkPass – Parking Reservation System
   Connected to VisitorConsumer API (localhost:9080)
   ═══════════════════════════════════════════════════ */

const API_BASE        = 'http://localhost:3000/customers-contracts/v2/de_studentui';
const TENANT          = 'de_studentui';
const OPERATOR_ID     = 'OP5802558';
const CUSTOMER_ID     = 'C2026CNeRR6w';
const CONTRACT_ID     = 'A2026X0qTl9Woq';
const RATE_PER_HR     = 5;
const STORAGE_KEY     = 'parkpass_reservations';

// ── Category colour map ───────────────────────────────────────
const CAT_COLORS = {
  'VISIT':         { bg:'rgba(46,204,113,.15)',  border:'rgba(46,204,113,.5)',  text:'#2ecc71' },
  'EMPLOYEE':      { bg:'rgba(52,152,219,.15)',  border:'rgba(52,152,219,.5)',  text:'#3498db' },
  'MULTI_USE':     { bg:'rgba(155,89,182,.15)',  border:'rgba(155,89,182,.5)',  text:'#9b59b6' },
  'FLEX_PRODUCT':  { bg:'rgba(201,168,76,.15)',  border:'rgba(201,168,76,.5)',  text:'#c9a84c' },
  'SEASON_PARKER': { bg:'rgba(230,126,34,.15)',  border:'rgba(230,126,34,.5)',  text:'#e67e22' },
  'SHORT_PARKER':  { bg:'rgba(231,76,60,.15)',   border:'rgba(231,76,60,.5)',   text:'#e74c3c' },
};

function catColor(groupType) {
  return CAT_COLORS[groupType] || { bg:'rgba(136,146,164,.15)', border:'rgba(136,146,164,.4)', text:'#8892a4' };
}

// ── State ─────────────────────────────────────────────────────
let products        = [];   // loaded from API
let reservations    = [];   // local cache (submitted visitors)
let selectedProduct = null;
let step            = 1;
let arrivalDt       = null;
let departureDt     = null;
let calView         = { month: new Date().getMonth(), year: new Date().getFullYear() };

// ── localStorage (local reservation cache) ────────────────────
function loadReservations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw).filter(r => r.departureTs > Date.now());
  } catch { return []; }
}
function saveReservations() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations));
}

// ── API: Load products ────────────────────────────────────────
async function fetchProducts() {
  setGridLoading(true);
  try {
    const url = `${API_BASE}/operators/${OPERATOR_ID}/products?contractBusinessId=${CONTRACT_ID}&categoryTypes=`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // API returns { content: [...] } or directly an array
    products = Array.isArray(data) ? data : (data.content || []);
    buildProductGrid();
    updateStats();
  } catch (err) {
    console.error('Failed to load products:', err);
    showApiError('Could not load products from API. Check that your proxy is running.');
    setGridLoading(false);
  }
}

// ── API: POST new visitor ─────────────────────────────────────
async function postVisitor(payload) {
  const url = `${API_BASE}/customers/${CUSTOMER_ID}/contracts/${CONTRACT_ID}/consumers/visitor`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`HTTP ${res.status}: ${errBody}`);
  }
  return res.json();
}

// ── API: GET visitor list ─────────────────────────────────────
async function fetchVisitors() {
  const url = `${API_BASE}/customers/${CUSTOMER_ID}/contracts/${CONTRACT_ID}/consumers/visitor`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Grid helpers ──────────────────────────────────────────────
function setGridLoading(on) {
  const grid = document.getElementById('spots-grid');
  if (on) {
    grid.innerHTML = `
      <div class="grid-loading">
        <div class="loading-spinner"></div>
        <span>Loading products from API…</span>
      </div>`;
  }
}

function showApiError(msg) {
  document.getElementById('spots-grid').innerHTML =
    `<div class="api-error">⚠ ${msg} <button onclick="fetchProducts()">Retry</button></div>`;
}

function reservedCountForProduct(pid) {
  return reservations.filter(r => r.productId === pid && r.departureTs > Date.now()).length;
}

function updateStats() {
  const total    = products.length;
  const reserved = reservations.filter(r => r.departureTs > Date.now()).length;
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-avail').textContent = total;
  document.getElementById('stat-occ').textContent   = 0;
  document.getElementById('stat-res').textContent   = reserved;
}

// ── Product grid ──────────────────────────────────────────────
function buildProductGrid() {
  setGridLoading(false);
  const grid = document.getElementById('spots-grid');

  if (!products.length) {
    grid.innerHTML = '<div class="api-error">No products returned from API.</div>';
    return;
  }

  grid.innerHTML = products.map(p => {
    const groupType  = p.category?.productGroupType || '';
    const col        = catColor(groupType);
    const catName    = p.category?.names?.find(n => n.language === 'en')?.text
                    || p.category?.name
                    || p.category?.productGroupType
                    || '—';
    const prodName   = p.productNames?.find(n => n.language === 'en')?.text
                    || p.name
                    || p.businessId;
    const accessFrom = p.accessProfile?.recurrences?.[0]?.activeFrom?.slice(0,5) || '00:00';
    const accessTo   = p.accessProfile?.recurrences?.[0]?.activeTo?.slice(0,5)   || '23:59';
    const contingent = p.customerContingent ?? 0;
    const resCount   = reservedCountForProduct(p.businessId);
    const avail      = contingent > 0 ? Math.max(0, contingent - resCount) : '∞';
    const isFull     = contingent > 0 && avail === 0;
    const isSelected = selectedProduct?.businessId === p.businessId;

    return `
      <div class="product-card${isSelected ? ' selected' : ''}${isFull ? ' full' : ''}"
           onclick="${isFull ? '' : `selectProduct('${p.businessId}')`}">
        <div class="prod-header">
          <span class="prod-cat-badge" style="background:${col.bg};border-color:${col.border};color:${col.text}">${catName}</span>
          ${isSelected ? '<span class="prod-check">✓</span>' : ''}
        </div>
        <div class="prod-name">${prodName}</div>
        <div class="prod-meta">
          <div class="prod-meta-row">🕐 ${accessFrom}–${accessTo}</div>
          <div class="prod-meta-row">🔖 ${p.category?.counterType || '—'}</div>
          ${contingent > 0 ? `<div class="prod-meta-row avail-row" style="color:${isFull?'#e74c3c':'#2ecc71'}">🅿 ${avail}/${contingent} available</div>` : ''}
          ${p.salesPeriodEnd ? `<div class="prod-meta-row">📆 Until ${p.salesPeriodEnd}</div>` : ''}
        </div>
        <div class="prod-footer">
          <span class="prod-id">${p.businessId}</span>
          ${isFull ? '<span class="prod-full">Full</span>' : `<span class="prod-rate">$${RATE_PER_HR}/hr</span>`}
        </div>
      </div>`;
  }).join('');
}

function selectProduct(pid) {
  const product = products.find(p => p.businessId === pid);
  if (!product) return;
  selectedProduct = (selectedProduct?.businessId === pid) ? null : product;
  buildProductGrid();
  updateSummary();
}

// ── Calendar ──────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

function renderCalendar() {
  const { month, year } = calView;
  document.getElementById('cal-title').textContent = `${MONTHS[month]} ${year}`;
  const body   = document.getElementById('cal-body');
  body.innerHTML = '';
  const today    = new Date(); today.setHours(0,0,0,0);
  const firstDow = new Date(year, month, 1).getDay();
  const offset   = (firstDow + 6) % 7;
  const dim      = new Date(year, month + 1, 0).getDate();
  const arrTs    = arrivalDt   ? stripTime(arrivalDt).getTime()   : null;
  const depTs    = departureDt ? stripTime(departureDt).getTime() : null;

  for (let i = 0; i < offset; i++) body.insertAdjacentHTML('beforeend', '<div class="cd blank"></div>');
  for (let d = 1; d <= dim; d++) {
    const dt = new Date(year, month, d), ts = dt.getTime(), isPast = dt < today;
    let cls = 'cd';
    if (isPast) cls += ' past';
    else {
      if (ts === arrTs) cls += ' arr';
      else if (ts === depTs) cls += ' dep';
      else if (arrTs && depTs && ts > arrTs && ts < depTs) cls += ' inrange';
    }
    const cell = document.createElement('div');
    cell.className   = cls;
    cell.textContent = d;
    if (!isPast) cell.addEventListener('click', () => onDayClick(new Date(year, month, d)));
    body.appendChild(cell);
  }
  document.getElementById('cal-step-arr').className  = 'cal-step-dot' + (step >= 1 ? ' done' : '');
  document.getElementById('cal-step-dep').className  = 'cal-step-dot' + (step >= 2 ? ' done' : '');
  document.getElementById('cal-step-time').className = 'cal-step-dot' + (step >= 3 ? ' done' : '');
}

function stripTime(d) { const c = new Date(d); c.setHours(0,0,0,0); return c; }

function onDayClick(dt) {
  dt.setHours(0,0,0,0);
  const today = new Date(); today.setHours(0,0,0,0);
  if (dt < today) return;
  if (step === 1) { arrivalDt = new Date(dt); departureDt = null; showStep(2); }
  else if (step === 2) {
    if (dt < stripTime(arrivalDt)) { arrivalDt = new Date(dt); departureDt = null; }
    else { departureDt = new Date(dt); showStep(3); }
  } else if (step === 3) {
    arrivalDt = new Date(dt); departureDt = null;
    document.getElementById('arr-time').innerHTML = '';
    document.getElementById('dep-time').innerHTML = '';
    showStep(2);
  }
  renderCalendar(); updateSummary();
}

function prevMonth() { calView.month--; if (calView.month < 0) { calView.month = 11; calView.year--; } renderCalendar(); }
function nextMonth() { calView.month++; if (calView.month > 11) { calView.month = 0;  calView.year++; } renderCalendar(); }

// ── Step wizard ───────────────────────────────────────────────
function showStep(n) {
  step = n;
  const hints = {
    1: '1  ·  Click your <strong>arrival date</strong> on the calendar',
    2: '2  ·  Now click your <strong>departure date</strong>',
    3: '3  ·  Set your <strong>arrival & departure times</strong> below',
  };
  document.getElementById('step-hint').innerHTML = hints[n];
  document.getElementById('times-wrap').style.display = n === 3 ? 'block' : 'none';
  if (n === 3) { buildTimeSelect('arr-time', 8); buildTimeSelect('dep-time', 18); recalcTimeHint(); }
  [1,2,3].forEach(i => {
    document.getElementById(`spill-${i}`).classList.toggle('active', i === n);
    document.getElementById(`spill-${i}`).classList.toggle('done',   i < n);
  });
  updateSummary();
}

function buildTimeSelect(id, def) {
  const sel = document.getElementById(id); sel.innerHTML = '';
  for (let h = 0; h < 24; h++) {
    const o = document.createElement('option');
    o.value = h;
    const ap = h < 12 ? 'AM' : 'PM', hh = h === 0 ? 12 : h > 12 ? h-12 : h;
    o.textContent = `${String(hh).padStart(2,'0')}:00 ${ap}`;
    sel.appendChild(o);
  }
  sel.value = def;
}

function recalcTimeHint() {
  if (!arrivalDt || !departureDt) return;
  const arrH = parseInt(document.getElementById('arr-time').value);
  const depH = parseInt(document.getElementById('dep-time').value);
  const s = new Date(arrivalDt); s.setHours(arrH,0,0,0);
  const e = new Date(departureDt); e.setHours(depH,0,0,0);
  const hrs = (e-s)/3600000;
  const hint = document.getElementById('time-hint');
  if (hrs <= 0) { hint.innerHTML='⚠ Departure must be <em>after</em> arrival'; hint.className='time-hint bad'; }
  else { hint.innerHTML=`✓ &nbsp;<strong>${hrs}h</strong> &nbsp;·&nbsp; $${RATE_PER_HR}/hr`; hint.className='time-hint good'; }
  updateSummary();
}

function resetDatePick() {
  arrivalDt = departureDt = null;
  document.getElementById('arr-time').innerHTML = '';
  document.getElementById('dep-time').innerHTML = '';
  showStep(1); renderCalendar(); updateSummary();
}

// ── Summary ───────────────────────────────────────────────────
function updateSummary() {
  const selEl = document.getElementById('selected-product-display');
  if (selectedProduct) {
    const groupType = selectedProduct.category?.productGroupType || '';
    const col       = catColor(groupType);
    const name      = selectedProduct.productNames?.find(n => n.language === 'en')?.text
                   || selectedProduct.name || selectedProduct.businessId;
    selEl.innerHTML = `<span class="spot-tag" style="background:${col.bg};border-color:${col.border};color:${col.text}">${name}</span>`;
  } else {
    selEl.innerHTML = '<span class="no-sel">No product selected — click a card on the left</span>';
  }

  let hours = 0;
  if (arrivalDt && departureDt && step === 3) {
    const arrH = parseInt(document.getElementById('arr-time')?.value ?? 0);
    const depH = parseInt(document.getElementById('dep-time')?.value ?? 0);
    const s = new Date(arrivalDt); s.setHours(arrH,0,0,0);
    const e = new Date(departureDt); e.setHours(depH,0,0,0);
    hours = Math.max(0, (e-s)/3600000);
  }

  const prodName = selectedProduct
    ? (selectedProduct.productNames?.find(n => n.language === 'en')?.text || selectedProduct.name || selectedProduct.businessId)
    : '—';

  document.getElementById('p-rate').textContent    = hours > 0 ? `$${RATE_PER_HR} × ${hours}h` : '—';
  document.getElementById('p-product').textContent = prodName;
  document.getElementById('p-total').textContent   = (hours > 0 && selectedProduct) ? `$${hours * RATE_PER_HR}` : '$0';
  document.getElementById('btn-book').disabled     = !(selectedProduct && hours > 0);
}

// ── Submit → POST to API ──────────────────────────────────────
async function submitBooking() {
  const name    = document.getElementById('f-name').value.trim();
  const email   = document.getElementById('f-email').value.trim();
  const vehicle = document.getElementById('f-vehicle').value;

  if (!name || !email)  return showToast('Please enter your name and email.', 'err');
  if (!vehicle)         return showToast('Please select a vehicle type.', 'err');
  if (!selectedProduct) return showToast('Please select a parking product.', 'err');
  if (step !== 3)       return showToast('Please complete the date & time selection.', 'err');

  const arrH = parseInt(document.getElementById('arr-time').value);
  const depH = parseInt(document.getElementById('dep-time').value);
  const s = new Date(arrivalDt); s.setHours(arrH,0,0,0);
  const e = new Date(departureDt); e.setHours(depH,0,0,0);
  const hours = (e-s)/3600000;
  if (hours <= 0) return showToast('Departure must be after arrival time.', 'err');

  // Build visitor payload for the API
  const payload = {
    productBusinessId: selectedProduct.businessId,
    visitFrom: s.toISOString(),
    visitTo:   e.toISOString(),
    name,
    email,
    vehicleType: vehicle,
    note: `ParkPass booking — ${vehicle}`,
  };

  const btn = document.getElementById('btn-book');
  btn.disabled = true;
  btn.textContent = 'Submitting…';

  try {
    const result = await postVisitor(payload);
    console.log('API response:', result);

    // Cache locally
    const prodName = selectedProduct.productNames?.find(n => n.language === 'en')?.text
                  || selectedProduct.name || selectedProduct.businessId;
    const r = {
      id: result.businessId || result.id || Date.now(),
      productId:   selectedProduct.businessId,
      productName: prodName,
      name, email, vehicle,
      arrivalTs:   s.getTime(),
      departureTs: e.getTime(),
      total: hours * RATE_PER_HR,
      apiResponse: result,
    };
    reservations.push(r);
    saveReservations();
    showConfirmation(r, hours, result.businessId);

    // Reset
    selectedProduct = null; arrivalDt = departureDt = null;
    ['arr-time','dep-time'].forEach(id => document.getElementById(id).innerHTML = '');
    ['f-name','f-email','f-phone'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('f-vehicle').value = '';
    showStep(1); renderCalendar(); buildProductGrid(); updateSummary();

  } catch (err) {
    console.error('Booking failed:', err);
    showToast(`Booking failed: ${err.message}`, 'err');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confirm Reservation';
  }
}

function showConfirmation(r, hours, visitorId) {
  document.getElementById('conf-spots').textContent    = r.productName;
  document.getElementById('conf-visitor-id').textContent = visitorId || '—';
  document.getElementById('conf-arr').textContent      = fmtDt(new Date(r.arrivalTs));
  document.getElementById('conf-dep').textContent      = fmtDt(new Date(r.departureTs));
  document.getElementById('conf-dur').textContent      = `${hours}h`;
  document.getElementById('conf-total').textContent    = `$${r.total}`;
  document.getElementById('conf-email').textContent    = r.email;
  document.getElementById('confirm-overlay').style.display = 'flex';
}
function closeConfirmation() {
  document.getElementById('confirm-overlay').style.display = 'none';
}

// ── Helpers ───────────────────────────────────────────────────
function fmtDt(d) {
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
       + ' · ' + d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
}

function showToast(msg, type) {
  let t = document.getElementById('pp-toast');
  if (!t) { t = document.createElement('div'); t.id = 'pp-toast'; document.body.appendChild(t); }
  t.className   = type === 'err' ? 'pp-toast err' : 'pp-toast ok';
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.style.opacity = '0'; }, 3500);
}

// Auto-expire local cache
setInterval(() => {
  const before = reservations.length;
  reservations = reservations.filter(r => r.departureTs > Date.now());
  if (reservations.length !== before) { saveReservations(); updateStats(); }
}, 60000);

// ── Init ──────────────────────────────────────────────────────
reservations = loadReservations();
renderCalendar();
showStep(1);
updateSummary();
fetchProducts(); // 🔌 live API call
