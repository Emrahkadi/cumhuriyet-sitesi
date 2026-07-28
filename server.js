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
const multer = require('multer');
const ExcelJS = require('exceljs');

const { q, pool, init } = require('./database');

// Excel yüklemesi için bellekte tutan multer (max 10 MB, sadece .xlsx)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const app = express();
const PORT = process.env.PORT || 3000;

// Async rota sarmalayıcı (hataları merkezi yakalar)
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

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

// Giriş yapan üye için okunmamış mesaj sayısı (bildirim rozeti)
app.use(async (req, res, next) => {
  res.locals.okunmamisMesajSayisi = 0;
  if (req.session.uye) {
    try {
      const r = await q(
        'SELECT COUNT(*)::int AS c FROM uye_mesajlari WHERE uye_id = $1 AND okundu = 0',
        [req.session.uye.id]
      );
      res.locals.okunmamisMesajSayisi = r.rows[0].c;
    } catch (e) {
      res.locals.okunmamisMesajSayisi = 0;
    }
  }
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
app.get('/', ah(async (req, res) => {
  const duyurular = (await q('SELECT * FROM duyurular ORDER BY onemli DESC, id DESC LIMIT 6')).rows;
  res.render('index', { aktifSayfa: 'anasayfa', duyurular });
}));

// Tüm duyurular
app.get('/duyurular', ah(async (req, res) => {
  const duyurular = (await q('SELECT * FROM duyurular ORDER BY onemli DESC, id DESC')).rows;
  res.render('duyurular', { aktifSayfa: 'duyurular', duyurular });
}));

// Duyuru detayı
app.get('/duyuru/:id', ah(async (req, res) => {
  const duyuru = (await q('SELECT * FROM duyurular WHERE id = $1', [req.params.id])).rows[0];
  if (!duyuru) {
    return res.status(404).render('404', { aktifSayfa: '' });
  }
  res.render('duyuru-detay', { aktifSayfa: 'duyurular', duyuru });
}));

// Hakkımızda
app.get('/hakkinda', (req, res) => {
  res.render('hakkinda', { aktifSayfa: 'hakkinda' });
});

// Kentsel dönüşüm
app.get('/kentsel-donusum', ah(async (req, res) => {
  const maddeler = (await q('SELECT * FROM kentsel_donusum ORDER BY id DESC')).rows;
  res.render('kentsel-donusum', { aktifSayfa: 'kentsel-donusum', maddeler });
}));

// İletişim (form gösterimi)
app.get('/iletisim', (req, res) => {
  res.render('iletisim', { aktifSayfa: 'iletisim' });
});

// İletişim formu gönderimi
app.post('/iletisim', ah(async (req, res) => {
  const { ad_soyad, email, telefon, konu, mesaj } = req.body;
  if (!ad_soyad || !mesaj) {
    req.flash('hata', 'Ad soyad ve mesaj alanları zorunludur.');
    return res.redirect('/iletisim');
  }
  await q(
    'INSERT INTO mesajlar (ad_soyad, email, telefon, konu, mesaj) VALUES ($1, $2, $3, $4, $5)',
    [ad_soyad.trim(), (email || '').trim(), (telefon || '').trim(), (konu || '').trim(), mesaj.trim()]
  );
  req.flash('basari', 'Mesajınız alındı. En kısa sürede size dönüş yapılacaktır.');
  res.redirect('/iletisim');
}));

// =====================================================================
//  ÜYE KİMLİK DOĞRULAMA
// =====================================================================

// Kayıt formu
app.get('/kayit', (req, res) => {
  res.render('kayit', { aktifSayfa: 'kayit' });
});

// Kayıt işlemi
app.post('/kayit', ah(async (req, res) => {
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
  const mevcut = (await q('SELECT id FROM uyeler WHERE telefon = $1', [temizTelefon])).rows[0];
  if (mevcut) {
    req.flash('hata', 'Bu telefon numarası ile daha önce kayıt yapılmış.');
    return res.redirect('/kayit');
  }

  const hash = bcrypt.hashSync(sifre, 10);
  await q(
    'INSERT INTO uyeler (ad_soyad, daire_no, telefon, sifre_hash, onayli) VALUES ($1, $2, $3, $4, 0)',
    [ad_soyad.trim(), daire_no.trim(), temizTelefon, hash]
  );

  req.flash(
    'basari',
    'Kaydınız alındı. Yönetici onayından sonra giriş yapabilirsiniz.'
  );
  res.redirect('/giris');
}));

// Giriş formu
app.get('/giris', (req, res) => {
  res.render('giris', { aktifSayfa: 'giris' });
});

// Giriş işlemi (hem yönetici hem site sakini aynı formdan giriş yapar)
app.post('/giris', ah(async (req, res) => {
  const { kullanici, sifre } = req.body;
  const giris = (kullanici || '').trim();

  // 1) Önce yönetici olarak dene (kullanıcı adı ile)
  const admin = (await q('SELECT * FROM yoneticiler WHERE kullanici_adi = $1', [giris])).rows[0];
  if (admin && bcrypt.compareSync(sifre || '', admin.sifre_hash)) {
    req.session.yonetici = { id: admin.id, kullanici_adi: admin.kullanici_adi };
    return res.redirect('/yonetim');
  }

  // 2) Site sakini (üye) olarak dene (telefon ile)
  const temizTelefon = giris.replace(/\s+/g, '');
  const uye = (await q('SELECT * FROM uyeler WHERE telefon = $1', [temizTelefon])).rows[0];

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
}));

// Üye paneli
app.get('/panel', uyeGerekli, ah(async (req, res) => {
  const uyeId = req.session.uye.id;
  const duyurular = (await q('SELECT * FROM duyurular ORDER BY onemli DESC, id DESC LIMIT 5')).rows;
  const aidatlar = (await q('SELECT * FROM aidatlar WHERE uye_id = $1 ORDER BY odendi ASC, id DESC', [uyeId])).rows;
  const borc = (await q(
    'SELECT COALESCE(SUM(tutar), 0)::float AS toplam FROM aidatlar WHERE uye_id = $1 AND odendi = 0',
    [uyeId]
  )).rows[0].toplam;
  const mesajlar = (await q('SELECT * FROM uye_mesajlari WHERE uye_id = $1 ORDER BY id DESC LIMIT 5', [uyeId])).rows;
  res.render('panel', {
    aktifSayfa: 'panel',
    duyurular,
    aidatlar,
    borc,
    mesajlar,
    okunmamis: res.locals.okunmamisMesajSayisi
  });
}));

// Üyenin mesajları (görüntülenince okundu işaretlenir)
app.get('/mesajlarim', uyeGerekli, ah(async (req, res) => {
  const uyeId = req.session.uye.id;
  const mesajlar = (await q('SELECT * FROM uye_mesajlari WHERE uye_id = $1 ORDER BY id DESC', [uyeId])).rows;
  await q('UPDATE uye_mesajlari SET okundu = 1 WHERE uye_id = $1 AND okundu = 0', [uyeId]);
  res.render('mesajlarim', { aktifSayfa: 'mesajlarim', mesajlar });
}));

// Üyenin aidatları
app.get('/aidatlarim', uyeGerekli, ah(async (req, res) => {
  const uyeId = req.session.uye.id;
  const aidatlar = (await q('SELECT * FROM aidatlar WHERE uye_id = $1 ORDER BY odendi ASC, id DESC', [uyeId])).rows;
  const borc = (await q(
    'SELECT COALESCE(SUM(tutar), 0)::float AS toplam FROM aidatlar WHERE uye_id = $1 AND odendi = 0',
    [uyeId]
  )).rows[0].toplam;
  res.render('aidatlarim', { aktifSayfa: 'aidatlarim', aidatlar, borc });
}));

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
app.get('/yonetim', adminGerekli, ah(async (req, res) => {
  const istatistik = {
    uyeSayisi: (await q('SELECT COUNT(*)::int AS c FROM uyeler')).rows[0].c,
    bekleyenUye: (await q('SELECT COUNT(*)::int AS c FROM uyeler WHERE onayli = 0')).rows[0].c,
    duyuruSayisi: (await q('SELECT COUNT(*)::int AS c FROM duyurular')).rows[0].c,
    okunmamisMesaj: (await q('SELECT COUNT(*)::int AS c FROM mesajlar WHERE okundu = 0')).rows[0].c
  };
  res.render('admin/panel', { aktifSayfa: 'ozet', istatistik });
}));

// --- Duyuru yönetimi ---
app.get('/yonetim/duyurular', adminGerekli, ah(async (req, res) => {
  const duyurular = (await q('SELECT * FROM duyurular ORDER BY id DESC')).rows;
  res.render('admin/duyurular', { aktifSayfa: 'duyurular', duyurular });
}));

app.post('/yonetim/duyurular/ekle', adminGerekli, ah(async (req, res) => {
  const { baslik, icerik, kategori, onemli } = req.body;
  if (!baslik || !icerik) {
    req.flash('hata', 'Başlık ve içerik zorunludur.');
    return res.redirect('/yonetim/duyurular');
  }
  await q(
    'INSERT INTO duyurular (baslik, icerik, kategori, onemli) VALUES ($1, $2, $3, $4)',
    [baslik.trim(), icerik.trim(), (kategori || 'Genel').trim(), onemli ? 1 : 0]
  );
  req.flash('basari', 'Duyuru eklendi.');
  res.redirect('/yonetim/duyurular');
}));

app.post('/yonetim/duyurular/sil/:id', adminGerekli, ah(async (req, res) => {
  await q('DELETE FROM duyurular WHERE id = $1', [req.params.id]);
  req.flash('basari', 'Duyuru silindi.');
  res.redirect('/yonetim/duyurular');
}));

// --- Üye yönetimi ---
app.get('/yonetim/uyeler', adminGerekli, ah(async (req, res) => {
  const uyeler = (await q('SELECT * FROM uyeler ORDER BY onayli ASC, id DESC')).rows;
  res.render('admin/uyeler', { aktifSayfa: 'uyeler', uyeler });
}));

app.post('/yonetim/uyeler/onayla/:id', adminGerekli, ah(async (req, res) => {
  await q('UPDATE uyeler SET onayli = 1 WHERE id = $1', [req.params.id]);
  req.flash('basari', 'Üye onaylandı.');
  res.redirect('/yonetim/uyeler');
}));

app.post('/yonetim/uyeler/sil/:id', adminGerekli, ah(async (req, res) => {
  await q('DELETE FROM uyeler WHERE id = $1', [req.params.id]);
  req.flash('basari', 'Üye silindi.');
  res.redirect('/yonetim/uyeler');
}));

// --- İletişim mesajları ---
app.get('/yonetim/mesajlar', adminGerekli, ah(async (req, res) => {
  const mesajlar = (await q('SELECT * FROM mesajlar ORDER BY id DESC')).rows;
  // Görüntülenince okundu işaretle
  await q('UPDATE mesajlar SET okundu = 1 WHERE okundu = 0');
  res.render('admin/mesajlar', { aktifSayfa: 'mesajlar', mesajlar });
}));

app.post('/yonetim/mesajlar/sil/:id', adminGerekli, ah(async (req, res) => {
  await q('DELETE FROM mesajlar WHERE id = $1', [req.params.id]);
  req.flash('basari', 'Mesaj silindi.');
  res.redirect('/yonetim/mesajlar');
}));

// --- Kentsel dönüşüm yönetimi ---
app.get('/yonetim/kentsel-donusum', adminGerekli, ah(async (req, res) => {
  const maddeler = (await q('SELECT * FROM kentsel_donusum ORDER BY id DESC')).rows;
  res.render('admin/kentsel-donusum', { aktifSayfa: 'kentsel-donusum', maddeler });
}));

app.post('/yonetim/kentsel-donusum/ekle', adminGerekli, ah(async (req, res) => {
  const { baslik, icerik, durum } = req.body;
  if (!baslik || !icerik) {
    req.flash('hata', 'Başlık ve içerik zorunludur.');
    return res.redirect('/yonetim/kentsel-donusum');
  }
  await q(
    'INSERT INTO kentsel_donusum (baslik, icerik, durum) VALUES ($1, $2, $3)',
    [baslik.trim(), icerik.trim(), (durum || 'Planlama').trim()]
  );
  req.flash('basari', 'Kayıt eklendi.');
  res.redirect('/yonetim/kentsel-donusum');
}));

app.post('/yonetim/kentsel-donusum/sil/:id', adminGerekli, ah(async (req, res) => {
  await q('DELETE FROM kentsel_donusum WHERE id = $1', [req.params.id]);
  req.flash('basari', 'Kayıt silindi.');
  res.redirect('/yonetim/kentsel-donusum');
}));

// --- Aidat yönetimi ---
app.get('/yonetim/aidatlar', adminGerekli, ah(async (req, res) => {
  const uyeler = (await q('SELECT id, ad_soyad, daire_no FROM uyeler ORDER BY ad_soyad ASC')).rows;
  const aidatlar = (await q(
    `SELECT a.*, u.ad_soyad, u.daire_no
     FROM aidatlar a JOIN uyeler u ON u.id = a.uye_id
     ORDER BY a.odendi ASC, a.id DESC`
  )).rows;
  res.render('admin/aidatlar', { aktifSayfa: 'aidatlar', uyeler, aidatlar });
}));

app.post('/yonetim/aidatlar/ekle', adminGerekli, ah(async (req, res) => {
  const { uye_id, donem, tutar, aciklama, tum_uyeler } = req.body;
  if (!donem || !tutar) {
    req.flash('hata', 'Dönem ve tutar zorunludur.');
    return res.redirect('/yonetim/aidatlar');
  }
  const tutarNum = parseFloat(String(tutar).replace(',', '.'));
  if (isNaN(tutarNum) || tutarNum < 0) {
    req.flash('hata', 'Geçerli bir tutar girin.');
    return res.redirect('/yonetim/aidatlar');
  }

  if (tum_uyeler) {
    // Tüm onaylı üyelere aidat tahakkuk ettir
    const hedef = (await q('SELECT id FROM uyeler WHERE onayli = 1')).rows;
    for (const u of hedef) {
      await q(
        'INSERT INTO aidatlar (uye_id, donem, tutar, aciklama) VALUES ($1, $2, $3, $4)',
        [u.id, donem.trim(), tutarNum, (aciklama || '').trim()]
      );
    }
    req.flash('basari', `${hedef.length} üyeye aidat eklendi.`);
  } else {
    if (!uye_id) {
      req.flash('hata', 'Üye seçin veya "Tüm üyeler" işaretleyin.');
      return res.redirect('/yonetim/aidatlar');
    }
    await q(
      'INSERT INTO aidatlar (uye_id, donem, tutar, aciklama) VALUES ($1, $2, $3, $4)',
      [uye_id, donem.trim(), tutarNum, (aciklama || '').trim()]
    );
    req.flash('basari', 'Aidat eklendi.');
  }
  res.redirect('/yonetim/aidatlar');
}));

app.post('/yonetim/aidatlar/ode/:id', adminGerekli, ah(async (req, res) => {
  await q(
    "UPDATE aidatlar SET odendi = 1, odeme_tarihi = to_char(now() AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD') WHERE id = $1",
    [req.params.id]
  );
  req.flash('basari', 'Aidat ödendi olarak işaretlendi.');
  res.redirect('/yonetim/aidatlar');
}));

app.post('/yonetim/aidatlar/geri-al/:id', adminGerekli, ah(async (req, res) => {
  await q('UPDATE aidatlar SET odendi = 0, odeme_tarihi = NULL WHERE id = $1', [req.params.id]);
  req.flash('basari', 'Aidat ödenmedi durumuna alındı.');
  res.redirect('/yonetim/aidatlar');
}));

app.post('/yonetim/aidatlar/sil/:id', adminGerekli, ah(async (req, res) => {
  await q('DELETE FROM aidatlar WHERE id = $1', [req.params.id]);
  req.flash('basari', 'Aidat kaydı silindi.');
  res.redirect('/yonetim/aidatlar');
}));

// --- Üyeye mesaj gönderme ---
app.get('/yonetim/mesaj-gonder', adminGerekli, ah(async (req, res) => {
  const uyeler = (await q('SELECT id, ad_soyad, daire_no FROM uyeler WHERE onayli = 1 ORDER BY ad_soyad ASC')).rows;
  const gonderilenler = (await q(
    `SELECT m.*, u.ad_soyad, u.daire_no
     FROM uye_mesajlari m JOIN uyeler u ON u.id = m.uye_id
     ORDER BY m.id DESC LIMIT 30`
  )).rows;
  res.render('admin/mesaj-gonder', { aktifSayfa: 'mesaj-gonder', uyeler, gonderilenler });
}));

app.post('/yonetim/mesaj-gonder', adminGerekli, ah(async (req, res) => {
  const { uye_id, baslik, mesaj, tum_uyeler } = req.body;
  if (!baslik || !mesaj) {
    req.flash('hata', 'Başlık ve mesaj zorunludur.');
    return res.redirect('/yonetim/mesaj-gonder');
  }

  if (tum_uyeler) {
    const hedef = (await q('SELECT id FROM uyeler WHERE onayli = 1')).rows;
    for (const u of hedef) {
      await q('INSERT INTO uye_mesajlari (uye_id, baslik, mesaj) VALUES ($1, $2, $3)', [u.id, baslik.trim(), mesaj.trim()]);
    }
    req.flash('basari', `${hedef.length} üyeye mesaj gönderildi.`);
  } else {
    if (!uye_id) {
      req.flash('hata', 'Üye seçin veya "Tüm üyeler" işaretleyin.');
      return res.redirect('/yonetim/mesaj-gonder');
    }
    await q('INSERT INTO uye_mesajlari (uye_id, baslik, mesaj) VALUES ($1, $2, $3)', [uye_id, baslik.trim(), mesaj.trim()]);
    req.flash('basari', 'Mesaj gönderildi.');
  }
  res.redirect('/yonetim/mesaj-gonder');
}));

// --- Site sakinleri (blok bazlı kişi bilgileri) ---
const SAKIN_ALANLAR = [
  'blok', 'daire', 'eksik', 'isim_soyisim', 'ptt', 'ptt2',
  'adres', 'iletisim', 'bilgi', 'yakinlik', 'bilgi_iletisim'
];

app.get('/yonetim/sakinler', adminGerekli, ah(async (req, res) => {
  const sakinler = (await q(
    `SELECT * FROM sakinler
     ORDER BY blok ASC, NULLIF(regexp_replace(daire, '\\D', '', 'g'), '')::int ASC NULLS LAST, id ASC`
  )).rows;

  // Bloklara göre grupla
  const bloklar = {};
  for (const s of sakinler) {
    const b = s.blok && s.blok.trim() ? s.blok.trim() : 'Diğer';
    if (!bloklar[b]) bloklar[b] = [];
    bloklar[b].push(s);
  }
  res.render('admin/sakinler', { aktifSayfa: 'sakinler', bloklar, toplam: sakinler.length });
}));

app.post('/yonetim/sakinler/ekle', adminGerekli, ah(async (req, res) => {
  const d = SAKIN_ALANLAR.map((a) => (req.body[a] || '').trim());
  await q(
    `INSERT INTO sakinler (blok, daire, eksik, isim_soyisim, ptt, ptt2, adres, iletisim, bilgi, yakinlik, bilgi_iletisim)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    d
  );
  req.flash('basari', 'Yeni kayıt eklendi.');
  res.redirect('/yonetim/sakinler');
}));

app.post('/yonetim/sakinler/guncelle/:id', adminGerekli, ah(async (req, res) => {
  const d = SAKIN_ALANLAR.map((a) => (req.body[a] || '').trim());
  d.push(req.params.id);
  await q(
    `UPDATE sakinler SET blok=$1, daire=$2, eksik=$3, isim_soyisim=$4, ptt=$5, ptt2=$6,
     adres=$7, iletisim=$8, bilgi=$9, yakinlik=$10, bilgi_iletisim=$11 WHERE id=$12`,
    d
  );
  req.flash('basari', 'Kayıt güncellendi.');
  res.redirect('/yonetim/sakinler');
}));

app.post('/yonetim/sakinler/sil/:id', adminGerekli, ah(async (req, res) => {
  await q('DELETE FROM sakinler WHERE id = $1', [req.params.id]);
  req.flash('basari', 'Kayıt silindi.');
  res.redirect('/yonetim/sakinler');
}));

// Excel (.xlsx) içe aktarma — "Adresler" benzeri 11 kolonlu sayfa
app.post('/yonetim/sakinler/import', adminGerekli, upload.single('dosya'), ah(async (req, res) => {
  if (!req.file) {
    req.flash('hata', 'Lütfen bir .xlsx dosyası seçin.');
    return res.redirect('/yonetim/sakinler');
  }

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(req.file.buffer);
  } catch (e) {
    req.flash('hata', 'Excel dosyası okunamadı. Geçerli bir .xlsx yükleyin.');
    return res.redirect('/yonetim/sakinler');
  }

  // "Adresler" sayfası varsa onu, yoksa ilk sayfayı kullan
  const ws = wb.getWorksheet('Adresler') || wb.worksheets[0];
  if (!ws) {
    req.flash('hata', 'Excel içinde okunacak sayfa bulunamadı.');
    return res.redirect('/yonetim/sakinler');
  }

  if (req.body.temizle) {
    await q('DELETE FROM sakinler');
  }

  const hucre = (row, i) => {
    const v = row.getCell(i).value;
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') {
      if (v.text) return String(v.text).trim();
      if (v.result !== undefined) return String(v.result).trim();
      if (v.richText) return v.richText.map((t) => t.text).join('').trim();
      return '';
    }
    return String(v).trim();
  };

  let eklenen = 0;
  const satirSayisi = ws.rowCount;
  for (let r = 2; r <= satirSayisi; r++) {
    const row = ws.getRow(r);
    const d = [];
    for (let c = 1; c <= 11; c++) d.push(hucre(row, c));
    // Tamamen boş satırları atla
    if (d.every((x) => x === '')) continue;
    await q(
      `INSERT INTO sakinler (blok, daire, eksik, isim_soyisim, ptt, ptt2, adres, iletisim, bilgi, yakinlik, bilgi_iletisim)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      d
    );
    eklenen++;
  }

  req.flash('basari', `${eklenen} kayıt Excel'den içe aktarıldı.`);
  res.redirect('/yonetim/sakinler');
}));

// =====================================================================
//  404 ve HATA YÖNETİMİ
// =====================================================================
app.use((req, res) => {
  res.status(404).render('404', { aktifSayfa: '' });
});

// Merkezi hata yakalayıcı
app.use((err, req, res, next) => {
  console.error('Sunucu hatası:', err);
  res.status(500).send('Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.');
});

// Veritabanını hazırlayıp sunucuyu başlat
init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Cumhuriyet Sitesi çalışıyor: http://localhost:${PORT}`);
      console.log(`Yönetim paneli: http://localhost:${PORT}/giris`);
    });
  })
  .catch((err) => {
    console.error('Veritabanı başlatılamadı:', err.message);
    process.exit(1);
  });
