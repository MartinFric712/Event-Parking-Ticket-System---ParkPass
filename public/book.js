const concerts = [
  { id:1, name:'Summer Vibes Festival', artist:'Various Artists', date:'July 15, 2026', venue:'Central Park', price:85, genre:'Festival', photo:'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&q=80' },
  { id:2, name:'Midnight Dreams Tour', artist:'Luna Eclipse', date:'June 22, 2026', venue:'Downtown Arena', price:120, genre:'Pop', photo:'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80' },
  { id:3, name:'Rock Revolution', artist:'Thunder Strike', date:'August 10, 2026', venue:'Grand Stadium', price:95, genre:'Rock', photo:'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=600&q=80' },
  { id:4, name:'Jazz Night Special', artist:'Blue Notes Collective', date:'July 28, 2026', venue:'Riverside Theater', price:75, genre:'Jazz', photo:'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=600&q=80' },
  { id:5, name:'Pop Extravaganza', artist:'Starlight Collective', date:'September 5, 2026', venue:'Metropolis Hall', price:110, genre:'Pop', photo:'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=600&q=80' },
  { id:6, name:'Electronic Beats Fest', artist:'Synth Masters', date:'August 20, 2026', venue:'Fashion District', price:100, genre:'Electronic', photo:'https://www.electronic-festivals.com/sites/default/files/ade_20181021_liekevandenoord_ade_projectone_lowres_lvdo6096.jpg' }
];

const tiers = [
  { name:'General', add:0 },
  { name:'VIP', add:50 },
  { name:'Premium', add:100 }
];

let activeConcert = null, activeTier = null;

// ── Toast (same style as parking.js) ────────────────────────
function showToast(msg, type) {
  let t = document.getElementById('pp-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'pp-toast';
    document.body.appendChild(t);
  }
  t.className = type === 'err' ? 'pp-toast err' : 'pp-toast ok';
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.style.opacity = '0'; }, 3500);
}

// ── Field error helpers ──────────────────────────────────────
function setFieldError(el, msg) {
  el.style.borderColor = '#e74c3c';
  el.style.background  = 'rgba(231,76,60,0.05)';
  const existing = el.parentElement.querySelector('.field-error');
  if (existing) existing.remove();
  const errEl = document.createElement('p');
  errEl.className = 'field-error';
  errEl.textContent = msg;
  errEl.style.cssText = 'color:#ff8a80;font-size:0.72rem;margin-top:5px;font-weight:500;';
  el.parentElement.appendChild(errEl);
}

function clearFieldError(el) {
  el.style.borderColor = '';
  el.style.background  = '';
  const err = el.parentElement.querySelector('.field-error');
  if (err) err.remove();
}

function clearAllErrors() {
  ['f-name','f-email','f-phone'].forEach(id => {
    const el = document.getElementById(id);
    if (el) clearFieldError(el);
  });
  document.querySelectorAll('.ticket-type').forEach(t => { t.style.borderColor = ''; });
  const tierErr = document.getElementById('tier-error');
  if (tierErr) tierErr.remove();
}

function attachLiveClear() {
  ['f-name','f-email','f-phone'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => clearFieldError(el));
  });
}

// ── Render concerts ──────────────────────────────────────────
function renderConcerts() {
  document.getElementById('concerts-grid').innerHTML = concerts.map(c => `
    <div class="concert-card">
      <div class="concert-banner">
        <img src="${c.photo}" alt="${c.name}" loading="lazy">
        <span class="banner-genre">${c.genre}</span>
      </div>
      <div class="concert-body">
        <h3 class="concert-title">${c.name}</h3>
        <p class="concert-artist">${c.artist}</p>
        <div class="concert-meta">
          <div class="meta-row">${c.date}</div>
          <div class="meta-row">${c.venue}</div>
        </div>
        <div class="concert-footer">
          <div class="price-tag">$${c.price}<small>from / ticket</small></div>
          <button class="btn-book" onclick="openModal(${c.id})">Book Now</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ── Modal open / close ───────────────────────────────────────
function openModal(id) {
  activeConcert = concerts.find(c => c.id === id);
  activeTier    = null;

  document.getElementById('modal-title').textContent = activeConcert.name;
  document.getElementById('ticket-types').innerHTML  = tiers.map(t => `
    <div class="ticket-type" onclick="selectTier(this,'${t.name}',${t.add})">
      <div class="tt-name">${t.name}</div>
      <div class="tt-price">+$${t.add}</div>
    </div>
  `).join('');

  ['f-name','f-email','f-phone'].forEach(fid => {
    const el = document.getElementById(fid);
    if (el) el.value = '';
  });
  clearAllErrors();

  document.getElementById('modal').classList.add('open');
  setTimeout(attachLiveClear, 0);
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

function selectTier(el, name, add) {
  activeTier = { name, add };
  document.querySelectorAll('.ticket-type').forEach(e => {
    e.classList.remove('selected');
    e.style.borderColor = '';
  });
  el.classList.add('selected');
  const tierErr = document.getElementById('tier-error');
  if (tierErr) tierErr.remove();
}

// ── Submit with validation ───────────────────────────────────
function submitBooking() {
  clearAllErrors();

  const nameEl  = document.getElementById('f-name');
  const emailEl = document.getElementById('f-email');
  const name    = nameEl.value.trim();
  const email   = emailEl.value.trim();
  let hasError  = false;

  if (!name) {
    setFieldError(nameEl, 'Please enter your full name.');
    hasError = true;
  }

  if (!email) {
    setFieldError(emailEl, 'Please enter your email address.');
    hasError = true;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setFieldError(emailEl, 'Please enter a valid email address.');
    hasError = true;
  }

  if (!activeTier) {
    document.querySelectorAll('.ticket-type').forEach(t => {
      t.style.borderColor = 'rgba(231,76,60,0.6)';
    });
    if (!document.getElementById('tier-error')) {
      const errEl = document.createElement('p');
      errEl.id = 'tier-error';
      errEl.textContent = 'Please select a ticket tier.';
      errEl.style.cssText = 'color:#ff8a80;font-size:0.72rem;margin-top:6px;font-weight:500;';
      document.getElementById('ticket-types').parentElement.appendChild(errEl);
    }
    hasError = true;
  }

  if (hasError) {
    showToast('Please fix the highlighted fields before continuing.', 'err');
    return;
  }

  const total = activeConcert.price + activeTier.add;

  // Populate & show confirmation overlay
  document.getElementById('conf-event').textContent  = activeConcert.name;
  document.getElementById('conf-tier').textContent   = activeTier.name;
  document.getElementById('conf-total').textContent  = `$${total}`;
  document.getElementById('conf-email').textContent  = email;
  document.getElementById('confirm-overlay').style.display = 'flex';

  closeModal();
}

function closeConfirmation() {
  document.getElementById('confirm-overlay').style.display = 'none';
}

// ── Backdrop close ───────────────────────────────────────────
document.getElementById('modal').addEventListener('click', e => {
  if (e.target.id === 'modal') closeModal();
});

renderConcerts();
