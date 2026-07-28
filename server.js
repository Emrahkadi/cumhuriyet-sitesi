/**
 * Cumhuriyet Sitesi - Express sunucusu
 * Genel sayfalar, üye/yönetici kimlik doğrulama ve yönetim paneli rotaları.
 */
'use strict';

require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const bcrypt = require('bcryptjs');

const { db, init } = require('./database');

// Veritabanını hazırla (tablolar + varsayılan admin + örnek içerik)
init();

const app = express();
const PORT = process.env.PORT || 3000;

// --- Görünüm motoru ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Middleware ---
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'gizli-anahtar',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 8 } // 8 saat
  })
);

app.use(flash());

// Şablonlarda her yerde kullanılabilecek değişkenler
app.use((req, res, next) => {
  res.locals.uye = req.session.uye || null;
  res.locals.yonetici = req.session.yonetici || null;
  res.locals.basari = req.flash('basari');
  res.locals.hata = req.flash('hata');
  res.locals.aktifSayfa = '';
  next();
});

// --- Yardımcı: giriş kontrol middleware'leri ---
function uyeGerekli(req, res, next) {
  if (!req.session.uye) {
    req.flash('hata', 'Bu sayfayı görüntülemek için giriş yapmalısınız.');
    return res.redirect('/giris');
  }
  next();
}

function adminGerekli(req, res, next) {
  if (!req.session.yonetici) {
    req.flash('hata', 'Yönetici girişi gereklidir.');
    return res.redirect('/giris');
  }
  next();
}

// =====================================================================
//  GENEL SAYFALAR
// =====================================================================

// Ana sayfa - güncel duyurular
app.get('/', (req, res) => {
  const duyurular = db
    .prepare('SELECT * FROM duyurular ORDER BY onemli DESC, id DESC LIMIT 6')
    .all();
  res.render('index', { aktifSayfa: 'anasayfa', duyurular });
});

// Tüm duyurular
app.get('/duyurular', (req, res) => {
  const duyurular = db.prepare('SELECT * FROM duyurular ORDER BY onemli DESC, id DESC').all();
  res.render('duyurular', { aktifSayfa: 'duyurular', duyurular });
});

// Duyuru detayı
app.get('/duyuru/:id', (req, res) => {
  const duyuru = db.prepare('SELECT * FROM duyurular WHERE id = ?').get(req.params.id);
  if (!duyuru) {
    return res.status(404).render('404', { aktifSayfa: '' });
  }
  res.render('duyuru-detay', { aktifSayfa: 'duyurular', duyuru });
});

// Hakkımızda
app.get('/hakkinda', (req, res) => {
  res.render('hakkinda', { aktifSayfa: 'hakkinda' });
});

// Kentsel dönüşüm
app.get('/kentsel-donusum', (req, res) => {
  const maddeler = db.prepare('SELECT * FROM kentsel_donusum ORDER BY id DESC').all();
  res.render('kentsel-donusum', { aktifSayfa: 'kentsel-donusum', maddeler });
});

// İletişim (form gösterimi)
app.get('/iletisim', (req, res) => {
  res.render('iletisim', { aktifSayfa: 'iletisim' });
});

// İletişim formu gönderimi
app.post('/iletisim', (req, res) => {
  const { ad_soyad, email, telefon, konu, mesaj } = req.body;
  if (!ad_soyad || !mesaj) {
    req.flash('hata', 'Ad soyad ve mesaj alanları zorunludur.');
    return res.redirect('/iletisim');
  }
  db.prepare(
    'INSERT INTO mesajlar (ad_soyad, email, telefon, konu, mesaj) VALUES (?, ?, ?, ?, ?)'
  ).run(ad_soyad.trim(), (email || '').trim(), (telefon || '').trim(), (konu || '').trim(), mesaj.trim());
  req.flash('basari', 'Mesajınız alındı. En kısa sürede size dönüş yapılacaktır.');
  res.redirect('/iletisim');
});

// =====================================================================
//  ÜYE KİMLİK DOĞRULAMA
// =====================================================================

// Kayıt formu
app.get('/kayit', (req, res) => {
  res.render('kayit', { aktifSayfa: 'kayit' });
});

// Kayıt işlemi
app.post('/kayit', (req, res) => {
  const { ad_soyad, daire_no, telefon, sifre, sifre_tekrar } = req.body;

  if (!ad_soyad || !daire_no || !telefon || !sifre) {
    req.flash('hata', 'Lütfen tüm alanları doldurun.');
    return res.redirect('/kayit');
  }
  if (sifre.length < 4) {
    req.flash('hata', 'Şifre en az 4 karakter olmalıdır.');
    return res.redirect('/kayit');
  }
  if (sifre !== sifre_tekrar) {
    req.flash('hata', 'Şifreler eşleşmiyor.');
    return res.redirect('/kayit');
  }

  const temizTelefon = telefon.replace(/\s+/g, '');
  const mevcut = db.prepare('SELECT id FROM uyeler WHERE telefon = ?').get(temizTelefon);
  if (mevcut) {
    req.flash('hata', 'Bu telefon numarası ile daha önce kayıt yapılmış.');
    return res.redirect('/kayit');
  }

  const hash = bcrypt.hashSync(sifre, 10);
  db.prepare(
    'INSERT INTO uyeler (ad_soyad, daire_no, telefon, sifre_hash, onayli) VALUES (?, ?, ?, ?, 0)'
  ).run(ad_soyad.trim(), daire_no.trim(), temizTelefon, hash);

  req.flash(
    'basari',
    'Kaydınız alındı. Yönetici onayından sonra giriş yapabilirsiniz.'
  );
  res.redirect('/giris');
});

// Giriş formu
app.get('/giris', (req, res) => {
  res.render('giris', { aktifSayfa: 'giris' });
});

// Giriş işlemi (hem yönetici hem site sakini aynı formdan giriş yapar)
app.post('/giris', (req, res) => {
  const { kullanici, sifre } = req.body;
  const giris = (kullanici || '').trim();

  // 1) Önce yönetici olarak dene (kullanıcı adı ile)
  const admin = db.prepare('SELECT * FROM yoneticiler WHERE kullanici_adi = ?').get(giris);
  if (admin && bcrypt.compareSync(sifre || '', admin.sifre_hash)) {
    req.session.yonetici = { id: admin.id, kullanici_adi: admin.kullanici_adi };
    return res.redirect('/yonetim');
  }

  // 2) Site sakini (üye) olarak dene (telefon ile)
  const temizTelefon = giris.replace(/\s+/g, '');
  const uye = db.prepare('SELECT * FROM uyeler WHERE telefon = ?').get(temizTelefon);

  if (!uye || !bcrypt.compareSync(sifre || '', uye.sifre_hash)) {
    req.flash('hata', 'Kullanıcı adı/telefon veya şifre hatalı.');
    return res.redirect('/giris');
  }
  if (!uye.onayli) {
    req.flash('hata', 'Hesabınız henüz yönetici tarafından onaylanmadı.');
    return res.redirect('/giris');
  }

  req.session.uye = {
    id: uye.id,
    ad_soyad: uye.ad_soyad,
    daire_no: uye.daire_no,
    telefon: uye.telefon
  };
  req.flash('basari', `Hoş geldiniz, ${uye.ad_soyad}!`);
  res.redirect('/panel');
});

// Üye paneli
app.get('/panel', uyeGerekli, (req, res) => {
  const duyurular = db
    .prepare('SELECT * FROM duyurular ORDER BY onemli DESC, id DESC LIMIT 5')
    .all();
  res.render('panel', { aktifSayfa: 'panel', duyurular });
});

// Çıkış
app.get('/cikis', (req, res) => {
  delete req.session.uye;
  req.flash('basari', 'Çıkış yapıldı.');
  res.redirect('/');
});

// =====================================================================
//  YÖNETİCİ (ADMIN) PANELİ
// =====================================================================

// Eski yönetici giriş adresi -> ortak giriş sayfasına yönlendir
app.get('/yonetim/giris', (req, res) => {
  res.redirect('/giris');
});

// Yönetici çıkış
app.get('/yonetim/cikis', (req, res) => {
  delete req.session.yonetici;
  res.redirect('/yonetim/giris');
});

// Yönetim ana paneli (özet)
app.get('/yonetim', adminGerekli, (req, res) => {
  const istatistik = {
    uyeSayisi: db.prepare('SELECT COUNT(*) AS c FROM uyeler').get().c,
    bekleyenUye: db.prepare('SELECT COUNT(*) AS c FROM uyeler WHERE onayli = 0').get().c,
    duyuruSayisi: db.prepare('SELECT COUNT(*) AS c FROM duyurular').get().c,
    okunmamisMesaj: db.prepare('SELECT COUNT(*) AS c FROM mesajlar WHERE okundu = 0').get().c
  };
  res.render('admin/panel', { aktifSayfa: 'ozet', istatistik });
});

// --- Duyuru yönetimi ---
app.get('/yonetim/duyurular', adminGerekli, (req, res) => {
  const duyurular = db.prepare('SELECT * FROM duyurular ORDER BY id DESC').all();
  res.render('admin/duyurular', { aktifSayfa: 'duyurular', duyurular });
});

app.post('/yonetim/duyurular/ekle', adminGerekli, (req, res) => {
  const { baslik, icerik, kategori, onemli } = req.body;
  if (!baslik || !icerik) {
    req.flash('hata', 'Başlık ve içerik zorunludur.');
    return res.redirect('/yonetim/duyurular');
  }
  db.prepare(
    'INSERT INTO duyurular (baslik, icerik, kategori, onemli) VALUES (?, ?, ?, ?)'
  ).run(baslik.trim(), icerik.trim(), (kategori || 'Genel').trim(), onemli ? 1 : 0);
  req.flash('basari', 'Duyuru eklendi.');
  res.redirect('/yonetim/duyurular');
});

app.post('/yonetim/duyurular/sil/:id', adminGerekli, (req, res) => {
  db.prepare('DELETE FROM duyurular WHERE id = ?').run(req.params.id);
  req.flash('basari', 'Duyuru silindi.');
  res.redirect('/yonetim/duyurular');
});

// --- Üye yönetimi ---
app.get('/yonetim/uyeler', adminGerekli, (req, res) => {
  const uyeler = db.prepare('SELECT * FROM uyeler ORDER BY onayli ASC, id DESC').all();
  res.render('admin/uyeler', { aktifSayfa: 'uyeler', uyeler });
});

app.post('/yonetim/uyeler/onayla/:id', adminGerekli, (req, res) => {
  db.prepare('UPDATE uyeler SET onayli = 1 WHERE id = ?').run(req.params.id);
  req.flash('basari', 'Üye onaylandı.');
  res.redirect('/yonetim/uyeler');
});

app.post('/yonetim/uyeler/sil/:id', adminGerekli, (req, res) => {
  db.prepare('DELETE FROM uyeler WHERE id = ?').run(req.params.id);
  req.flash('basari', 'Üye silindi.');
  res.redirect('/yonetim/uyeler');
});

// --- İletişim mesajları ---
app.get('/yonetim/mesajlar', adminGerekli, (req, res) => {
  const mesajlar = db.prepare('SELECT * FROM mesajlar ORDER BY id DESC').all();
  // Görüntülenince okundu işaretle
  db.prepare('UPDATE mesajlar SET okundu = 1 WHERE okundu = 0').run();
  res.render('admin/mesajlar', { aktifSayfa: 'mesajlar', mesajlar });
});

app.post('/yonetim/mesajlar/sil/:id', adminGerekli, (req, res) => {
  db.prepare('DELETE FROM mesajlar WHERE id = ?').run(req.params.id);
  req.flash('basari', 'Mesaj silindi.');
  res.redirect('/yonetim/mesajlar');
});

// --- Kentsel dönüşüm yönetimi ---
app.get('/yonetim/kentsel-donusum', adminGerekli, (req, res) => {
  const maddeler = db.prepare('SELECT * FROM kentsel_donusum ORDER BY id DESC').all();
  res.render('admin/kentsel-donusum', { aktifSayfa: 'kentsel-donusum', maddeler });
});

app.post('/yonetim/kentsel-donusum/ekle', adminGerekli, (req, res) => {
  const { baslik, icerik, durum } = req.body;
  if (!baslik || !icerik) {
    req.flash('hata', 'Başlık ve içerik zorunludur.');
    return res.redirect('/yonetim/kentsel-donusum');
  }
  db.prepare(
    'INSERT INTO kentsel_donusum (baslik, icerik, durum) VALUES (?, ?, ?)'
  ).run(baslik.trim(), icerik.trim(), (durum || 'Planlama').trim());
  req.flash('basari', 'Kayıt eklendi.');
  res.redirect('/yonetim/kentsel-donusum');
});

app.post('/yonetim/kentsel-donusum/sil/:id', adminGerekli, (req, res) => {
  db.prepare('DELETE FROM kentsel_donusum WHERE id = ?').run(req.params.id);
  req.flash('basari', 'Kayıt silindi.');
  res.redirect('/yonetim/kentsel-donusum');
});

// =====================================================================
//  404
// =====================================================================
app.use((req, res) => {
  res.status(404).render('404', { aktifSayfa: '' });
});

app.listen(PORT, () => {
  console.log(`Cumhuriyet Sitesi çalışıyor: http://localhost:${PORT}`);
  console.log(`Yönetim paneli: http://localhost:${PORT}/yonetim/giris`);
});
