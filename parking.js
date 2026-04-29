const total = 120, avail = 120, occ = 0, res = 0;
  let selected = [], spotStatuses = [];

  function buildGrid() {
    const grid = document.getElementById('spots-grid');

    for (let i = 1; i <= total; i++) {
      const idx = i - 1;
      let status = 'avail';
      spotStatuses[i] = status;

      const el = document.createElement('div');
      el.className = `spot ${status}`;
      el.textContent = i;
      el.dataset.id = i;
      if (status === 'avail') el.addEventListener('click', () => toggleSpot(i, el));
      grid.appendChild(el);
    }
  }

  function toggleSpot(id, el) {
    if (selected.includes(id)) {
      selected = selected.filter(s => s !== id);
      el.classList.remove('selected');
      el.classList.add('avail');
    } else {
      selected.push(id);
      el.classList.remove('avail');
      el.classList.add('selected');
    }
    updatePanel();
  }

  function clearSelection() {
    selected = [];
    document.querySelectorAll('.spot.selected').forEach(el => {
      el.classList.remove('selected'); el.classList.add('avail');
    });
    updatePanel();
  }

  function updatePrice() { updatePanel(); }

  function updatePanel() {
    const count = selected.length;
    const rate = parseInt(document.getElementById('f-duration').value) || 0;

    document.getElementById('sel-count').textContent = `${count} spot${count !== 1 ? 's' : ''}`;

    const tagsEl = document.getElementById('spot-tags');
    if (count === 0) {
      tagsEl.innerHTML = '<span style="color:#3a4560;font-size:0.8rem;">None selected — click a green spot</span>';
    } else {
      tagsEl.innerHTML = selected.map(id => `<span class="spot-tag">#${id}</span>`).join('');
    }

    document.getElementById('p-rate').textContent = rate ? `$${rate}` : '—';
    document.getElementById('p-spots').textContent = count;
    document.getElementById('p-total').textContent = `$${rate * count}`;

    document.getElementById('btn-book').disabled = count === 0 || !rate;
  }

  function submitBooking() {
    const name = document.getElementById('f-name').value.trim();
    const email = document.getElementById('f-email').value.trim();
    if (!name || !email) { alert('Please enter your name and email.'); return; }
    const rate = parseInt(document.getElementById('f-duration').value);
    const total = rate * selected.length;
    alert(`Parking reserved!\n\nSpots: ${selected.map(s => '#' + s).join(', ')}\nTotal: $${total}\n\nConfirmation sent to ${email}`);
    clearSelection();
  }

  buildGrid();
  updatePanel();