/* ═══════════════════════════════════════════════════
   ParkPass – Parking Reservation System
   ═══════════════════════════════════════════════════ */

const TOTAL        = 120;
const RATE_PER_HR  = 5;
const STORAGE_KEY  = 'parkpass_reservations';

// Permanently occupied (not bookable)
const PERM_OCC = new Set([4,9,14,21,30,37,46,53,62,69,78,85,97,106,115]);

// ── State ─────────────────────────────────────────────────────
let reservations = [];
let selected     = [];
let step         = 1;   // 1=pick arrival date  2=pick departure date  3=set times
let arrivalDt    = null;
let departureDt  = null;
let calView      = { month: new Date().getMonth(), year: new Date().getFullYear() };

// ── localStorage ──────────────────────────────────────────────
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
function reservedSpotIds() {
  const now = Date.now(), ids = new Set();
  reservations.forEach(r => { if (r.departureTs > now) r.spots.forEach(id => ids.add(id)); });
  return ids;
}

// ── Grid ──────────────────────────────────────────────────────
function buildGrid() {
  const grid   = document.getElementById('spots-grid');
  const resIds = reservedSpotIds();
  grid.innerHTML = '';
  let cA = 0, cO = 0, cR = 0;

  for (let i = 1; i <= TOTAL; i++) {
    const el = document.createElement('div');
    el.dataset.id = i;
    el.textContent = i;

    if (PERM_OCC.has(i)) {
      el.className = 'spot occ'; cO++;
    } else if (resIds.has(i)) {
      el.className = 'spot res'; cR++;
      const r = reservations.find(r => r.spots.includes(i) && r.departureTs > Date.now());
      if (r) el.title = `Reserved · expires ${fmtDt(new Date(r.departureTs))}`;
    } else {
      el.className = selected.includes(i) ? 'spot sel' : 'spot avail';
      el.addEventListener('click', () => toggleSpot(i, el));
      cA++;
    }
    grid.appendChild(el);
  }

  document.getElementById('stat-avail').textContent = cA;
  document.getElementById('stat-occ').textContent   = cO;
  document.getElementById('stat-res').textContent   = cR;
}

function toggleSpot(id, el) {
  if (el.classList.contains('res') || el.classList.contains('occ')) return;
  if (selected.includes(id)) {
    selected = selected.filter(s => s !== id);
    el.className = 'spot avail';
    el.addEventListener('click', () => toggleSpot(id, el));
  } else {
    selected.push(id);
    el.className = 'spot sel';
  }
  updateSummary();
}

function clearSpotsSelection() {
  selected = [];
  buildGrid();
  updateSummary();
}

// ── Calendar ──────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

function renderCalendar() {
  const { month, year } = calView;
  document.getElementById('cal-title').textContent = `${MONTHS[month]} ${year}`;
  const body = document.getElementById('cal-body');
  body.innerHTML = '';

  const today    = new Date(); today.setHours(0,0,0,0);
  const firstDow = new Date(year, month, 1).getDay();
  const offset   = (firstDow + 6) % 7;
  const dim      = new Date(year, month + 1, 0).getDate();
  const arrTs    = arrivalDt   ? stripTime(arrivalDt).getTime()   : null;
  const depTs    = departureDt ? stripTime(departureDt).getTime() : null;

  for (let i = 0; i < offset; i++) {
    body.insertAdjacentHTML('beforeend', '<div class="cd blank"></div>');
  }

  for (let d = 1; d <= dim; d++) {
    const dt = new Date(year, month, d);
    const ts = dt.getTime();
    const isPast = dt < today;

    let cls = 'cd';
    if (isPast) cls += ' past';
    else {
      if (ts === arrTs)                          cls += ' arr';
      else if (ts === depTs)                     cls += ' dep';
      else if (arrTs && depTs && ts > arrTs && ts < depTs) cls += ' inrange';
    }

    const cell = document.createElement('div');
    cell.className = cls;
    cell.textContent = d;
    if (!isPast) cell.addEventListener('click', () => onDayClick(new Date(year, month, d)));
    body.appendChild(cell);
  }

  // Step indicator dots on calendar
  document.getElementById('cal-step-arr').className = 'cal-step-dot' + (step >= 1 ? ' done' : '');
  document.getElementById('cal-step-dep').className = 'cal-step-dot' + (step >= 2 ? ' done' : '');
  document.getElementById('cal-step-time').className = 'cal-step-dot' + (step >= 3 ? ' done' : '');
}

function stripTime(d) { const c = new Date(d); c.setHours(0,0,0,0); return c; }

function onDayClick(dt) {
  dt.setHours(0,0,0,0);
  const today = new Date(); today.setHours(0,0,0,0);
  if (dt < today) return;

  if (step === 1) {
    arrivalDt   = new Date(dt);
    departureDt = null;
    showStep(2);
  } else if (step === 2) {
    if (dt < stripTime(arrivalDt)) {
      // They clicked before arrival — treat as new arrival
      arrivalDt   = new Date(dt);
      departureDt = null;
    } else {
      departureDt = new Date(dt);
      showStep(3);
    }
  } else if (step === 3) {
    // Allow re-picking by clicking on calendar
    arrivalDt   = new Date(dt);
    departureDt = null;
    document.getElementById('arr-time').innerHTML = '';
    document.getElementById('dep-time').innerHTML = '';
    showStep(2);
  }
  renderCalendar();
  updateSummary();
}

function prevMonth() {
  calView.month--;
  if (calView.month < 0) { calView.month = 11; calView.year--; }
  renderCalendar();
}
function nextMonth() {
  calView.month++;
  if (calView.month > 11) { calView.month = 0; calView.year++; }
  renderCalendar();
}

// ── Step wizard ───────────────────────────────────────────────
function showStep(n) {
  step = n;

  const hints = {
    1: '1  ·  Click your <strong>arrival date</strong> on the calendar',
    2: '2  ·  Now click your <strong>departure date</strong>',
    3: '3  ·  Set your <strong>arrival & departure times</strong> below',
  };
  document.getElementById('step-hint').innerHTML = hints[n];

  const timesWrap = document.getElementById('times-wrap');
  timesWrap.style.display = n === 3 ? 'block' : 'none';

  if (n === 3) {
    buildTimeSelect('arr-time', 8);
    buildTimeSelect('dep-time', 18);
    recalcTimeHint();
  }

  // Highlight active step pill
  [1,2,3].forEach(i => {
    document.getElementById(`spill-${i}`).classList.toggle('active', i === n);
    document.getElementById(`spill-${i}`).classList.toggle('done', i < n);
  });

  updateSummary();
}

function buildTimeSelect(id, def) {
  const sel = document.getElementById(id);
  sel.innerHTML = '';
  for (let h = 0; h < 24; h++) {
    const o   = document.createElement('option');
    o.value   = h;
    const ap  = h < 12 ? 'AM' : 'PM';
    const hh  = h === 0 ? 12 : h > 12 ? h - 12 : h;
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
  const hrs = (e - s) / 3600000;
  const hint = document.getElementById('time-hint');
  if (hrs <= 0) {
    hint.innerHTML = '⚠ Departure must be <em>after</em> arrival';
    hint.className = 'time-hint bad';
  } else {
    hint.innerHTML = `✓ &nbsp;<strong>${hrs}h</strong> &nbsp;·&nbsp; $${RATE_PER_HR}/hr per spot`;
    hint.className = 'time-hint good';
  }
  updateSummary();
}

function resetDatePick() {
  arrivalDt = departureDt = null;
  document.getElementById('arr-time').innerHTML = '';
  document.getElementById('dep-time').innerHTML = '';
  showStep(1);
  renderCalendar();
  updateSummary();
}

// ── Summary ───────────────────────────────────────────────────
function updateSummary() {
  const count  = selected.length;
  const tagsEl = document.getElementById('spot-tags');

  tagsEl.innerHTML = count === 0
    ? '<span class="no-sel">No spots selected — click a green spot</span>'
    : selected.map(id => `<span class="spot-tag">#${id}</span>`).join('');
  document.getElementById('sel-count').textContent = `${count} spot${count !== 1 ? 's' : ''}`;

  let hours = 0;
  if (arrivalDt && departureDt && step === 3) {
    const arrH = parseInt(document.getElementById('arr-time')?.value ?? 0);
    const depH = parseInt(document.getElementById('dep-time')?.value ?? 0);
    const s = new Date(arrivalDt); s.setHours(arrH,0,0,0);
    const e = new Date(departureDt); e.setHours(depH,0,0,0);
    hours = Math.max(0, (e - s) / 3600000);
  }

  document.getElementById('p-rate').textContent  = hours > 0 ? `$${RATE_PER_HR} × ${hours}h` : '—';
  document.getElementById('p-spots').textContent = count;
  document.getElementById('p-total').textContent = hours > 0 && count > 0 ? `$${hours * RATE_PER_HR * count}` : '$0';

  document.getElementById('btn-book').disabled = !(count > 0 && hours > 0);
}

// ── Submit ────────────────────────────────────────────────────
function submitBooking() {
  const name    = document.getElementById('f-name').value.trim();
  const email   = document.getElementById('f-email').value.trim();
  const vehicle = document.getElementById('f-vehicle').value;

  if (!name || !email)  return showToast('Please enter your name and email.', 'err');
  if (!vehicle)         return showToast('Please select a vehicle type.', 'err');
  if (!selected.length) return showToast('Please select at least one spot.', 'err');
  if (step !== 3)       return showToast('Please complete the date & time selection.', 'err');

  const arrH = parseInt(document.getElementById('arr-time').value);
  const depH = parseInt(document.getElementById('dep-time').value);
  const s = new Date(arrivalDt); s.setHours(arrH,0,0,0);
  const e = new Date(departureDt); e.setHours(depH,0,0,0);
  const hours = (e - s) / 3600000;
  if (hours <= 0) return showToast('Departure must be after arrival time.', 'err');

  const r = {
    id: Date.now(),
    spots: [...selected],
    name, email, vehicle,
    arrivalTs:   s.getTime(),
    departureTs: e.getTime(),
    total: hours * RATE_PER_HR * selected.length,
  };

  reservations.push(r);
  saveReservations();
  showConfirmation(r, hours);

  // reset form
  selected = [];
  arrivalDt = departureDt = null;
  ['arr-time','dep-time'].forEach(id => document.getElementById(id).innerHTML = '');
  ['f-name','f-email','f-phone'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('f-vehicle').value = '';
  showStep(1);
  renderCalendar();
  buildGrid();
  updateSummary();
}

function showConfirmation(r, hours) {
  document.getElementById('conf-spots').textContent = r.spots.map(s=>'#'+s).join(', ');
  document.getElementById('conf-arr').textContent   = fmtDt(new Date(r.arrivalTs));
  document.getElementById('conf-dep').textContent   = fmtDt(new Date(r.departureTs));
  document.getElementById('conf-dur').textContent   = `${hours}h`;
  document.getElementById('conf-total').textContent = `$${r.total}`;
  document.getElementById('conf-email').textContent = r.email;
  document.getElementById('confirm-overlay').style.display = 'flex';
}
function closeConfirmation() {
  document.getElementById('confirm-overlay').style.display = 'none';
}

// ── Helpers ───────────────────────────────────────────────────
function fmtDt(d) {
  return d.toLocaleDateString('en-US',{ month:'short', day:'numeric', year:'numeric' })
       + ' · ' + d.toLocaleTimeString('en-US',{ hour:'numeric', minute:'2-digit' });
}

function showToast(msg, type) {
  let t = document.getElementById('pp-toast');
  if (!t) { t = document.createElement('div'); t.id = 'pp-toast'; document.body.appendChild(t); }
  t.className = type === 'err' ? 'pp-toast err' : 'pp-toast ok';
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.style.opacity = '0'; }, 3500);
}

// auto-expire check
setInterval(() => {
  const before = reservations.length;
  reservations = reservations.filter(r => r.departureTs > Date.now());
  if (reservations.length !== before) { saveReservations(); buildGrid(); updateSummary(); }
}, 60000);

// ── Init ──────────────────────────────────────────────────────
reservations = loadReservations();
buildGrid();
renderCalendar();
showStep(1);
updateSummary();
