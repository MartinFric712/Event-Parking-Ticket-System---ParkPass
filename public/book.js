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

  function openModal(id) {
    activeConcert = concerts.find(c => c.id === id);
    activeTier = null;
    document.getElementById('modal-title').textContent = activeConcert.name;
    document.getElementById('ticket-types').innerHTML = tiers.map(t => `
      <div class="ticket-type" onclick="selectTier(this,'${t.name}',${t.add})">
        <div class="tt-name">${t.name}</div>
        <div class="tt-price">+$${t.add}</div>
      </div>
    `).join('');
    document.getElementById('modal').classList.add('open');
  }

  function selectTier(el, name, add) {
    activeTier = { name, add };
    document.querySelectorAll('.ticket-type').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
  }

  function closeModal() {
    document.getElementById('modal').classList.remove('open');
  }

  function submitBooking() {
    const name = document.getElementById('f-name').value.trim();
    const email = document.getElementById('f-email').value.trim();
    if (!name || !email) { alert('Please fill in your name and email.'); return; }
    if (!activeTier) { alert('Please select a ticket tier.'); return; }
    const total = activeConcert.price + activeTier.add;
    alert(`✅ Booking confirmed!\n\n${activeConcert.name}\n${activeTier.name} Ticket — $${total}\n\nConfirmation sent to ${email}`);
    closeModal();
  }

  document.getElementById('modal').addEventListener('click', e => {
    if (e.target.id === 'modal') closeModal();
  });

  renderConcerts();