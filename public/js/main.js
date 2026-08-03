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
(function () {
  function bagla() {
    var blokSel = document.getElementById('blok_select');
    var daireSel = document.getElementById('daire_no');
    var dataEl = document.getElementById('daireler-data');
    if (!blokSel || !daireSel || !dataEl) return;

    var harita = {};
    try { harita = JSON.parse(dataEl.textContent || '{}'); } catch (e) { return; }

    function guncelle() {
      var blok = blokSel.value;
      daireSel.innerHTML = '';
      if (!blok || !harita[blok]) {
        var opt0 = document.createElement('option');
        opt0.value = '';
        opt0.textContent = 'Önce blok seçin';
        daireSel.appendChild(opt0);
        daireSel.disabled = true;
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
    }

    blokSel.addEventListener('change', guncelle);
    // Sağ tarafta aktif olmama sorununa karşı input event'i da bağla
    blokSel.addEventListener('input', guncelle);
    // Yapı değişikliklerinde (örn. keyboard nav) tetiklensin
    blokSel.addEventListener('blur', guncelle);
    // Eğer blok önceden seçili gelirse (örn. form hatası sonrası geri dönüş)
    if (blokSel.value) guncelle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bagla);
  } else {
    bagla();
  }
})();
