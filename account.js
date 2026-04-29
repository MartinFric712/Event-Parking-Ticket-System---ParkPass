function switchTo(id, el) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('sec-' + id).classList.add('active');
    el.classList.add('active');
  }

  function saveSettings() {
    const name = document.getElementById('s-name').value;
    const email = document.getElementById('s-email').value;
    document.getElementById('user-name').textContent = name;
    document.getElementById('user-email').textContent = email;
    alert('✅ Settings saved successfully!');
  }