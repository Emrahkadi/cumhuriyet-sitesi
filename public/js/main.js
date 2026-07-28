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
