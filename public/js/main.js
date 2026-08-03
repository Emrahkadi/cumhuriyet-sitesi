// Mobil menü açma/kapama
document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('mainNav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      nav.classList.toggle('open');
    });
  }
});

// Onay gerektiren form gönderimleri (CSP uyumlu; inline onsubmit yerine)
document.addEventListener(
  'submit',
  function (e) {
    var f = e.target;
    if (f && f.getAttribute) {
      var mesaj = f.getAttribute('data-confirm');
      if (mesaj && !window.confirm(mesaj)) {
        e.preventDefault();
      }
    }
  },
  true
);

// Kayıt formunda blok seçimine göre daire listesini güncelle
document.addEventListener('DOMContentLoaded', function () {
  var blokSel = document.getElementById('blok_select');
  var daireSel = document.getElementById('daire_no');
  if (!blokSel || !daireSel) return;

  // Sunucudan gelen blok/daire eşlemesi (görünmez bir yere yazılmış olabilir)
  var dairelerEl = document.getElementById('daireler-data');
  if (!dairelerEl) return;
  var harita = {};
  try { harita = JSON.parse(dairelerEl.textContent || '{}'); } catch (e) { return; }

  blokSel.addEventListener('change', function () {
    var blok = blokSel.value;
    daireSel.innerHTML = '';
    if (!blok || !harita[blok]) {
      daireSel.disabled = true;
      var opt0 = document.createElement('option');
      opt0.value = '';
      opt0.textContent = 'Önce blok seçin';
      daireSel.appendChild(opt0);
      return;
    }
    var ilk = document.createElement('option');
    ilk.value = '';
    ilk.textContent = '— Daire —';
    daireSel.appendChild(ilk);
    harita[blok].forEach(function (n) {
      var opt = document.createElement('option');
      opt.value = blok + '/' + n;
      opt.textContent = blok + '/' + n;
      daireSel.appendChild(opt);
    });
    daireSel.disabled = false;
  });
});
