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
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const sanitizeHtml = require('sanitize-html');

const { q, pool, init } = require('./database');
const { gonder: mailGonder, kodUret } = require('./services/mailer');

const fs = require('fs');

// Excel yüklemesi için bellekte tutan multer (max 10 MB, sadece .xlsx)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Duyuru / kentsel dönüşüm ekleri için disk storage (PDF, Excel, görsel)
// public/uploads/duyurular ve public/uploads/kentsel klasörleri kullanılır
const UPLOAD_KOK = path.join(__dirname, 'public', 'uploads');
const uploadKlasor = (altKlasor) => {
  const hedef = path.join(UPLOAD_KOK, altKlasor);
  if (!fs.existsSync(hedef)) fs.mkdirSync(hedef, { recursive: true });
  return hedef;
};
const dosyaYukle = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const altKlasor = req.baseUrl.includes('kentsel') ? 'kentsel' : 'duyurular';
      cb(null, uploadKlasor(altKlasor));
    },
    filename: function (req, file, cb) {
      const guvenliAd = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
      cb(null, Date.now() + '-' + Math.round(Math.random() * 1e6) + '-' + guvenliAd);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: function (req, file, cb) {
    const izinli = ['pdf', 'xlsx', 'xls', 'csv', 'png', 'jpg', 'jpeg', 'webp', 'gif'];
    const uzanti = (file.originalname.split('.').pop() || '').toLowerCase();
    if (izinli.includes(uzanti)) cb(null, true);
    else cb(new Error('Bu dosya türüne izin verilmiyor. (İzinli: ' + izinli.join(', ') + ')'));
  }
});
const dosyaTek = uploadKlasor => uploadKlasor === 'kentsel' ? dosyaYukle.single('ek') : dosyaYukle.single('ek');
const dosyaCok = uploadKlasor => uploadKlasor === 'kentsel' ? dosyaYukle.array('ekler', 10) : dosyaYukle.array('ekler', 10);

const app = express();
const PORT = process.env.PORT || 3000;

// Async rota sarmalayıcı (hataları merkezi yakalar)
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Basit HTML escape yardımcısı (e-posta şablonlarında kullanıcı adı için)
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// Quill'den gelen HTML içeriği güvenli şekilde temizler.
// Zararlı <script>, onclick, javascript: vb. etiketleri/özelliklerini çıkarır.
const TEMIZLEME_SECENEKLERI = {
  allowedTags: [
    'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'strike',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'a', 'blockquote', 'pre', 'code',
    'span', 'div'
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel'],
    span: ['style'],
    div: ['style'],
    p: ['style'],
    '*': ['class', 'style']
  },
  allowedStyles: {
    '*': {
      'color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(/, /^rgba\(/, /^[a-z]+$/],
      'background-color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(/, /^rgba\(/, /^[a-z]+$/],
      'font-size': [/^\d+(px|em|rem|%|pt)$/],
      'font-weight': [/^(bold|normal|\d{1,3})$/],
      'text-align': [/^(left|right|center|justify)$/],
      'text-decoration': [/^(underline|line-through|none)$/]
    }
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { a: ['http', 'https', 'mailto', 'tel'] },
  transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }, true) }
};
function zenginMetin(html) {
  if (!html) return '';
  return sanitizeHtml(String(html), TEMIZLEME_SECENEKLERI);
}

// Sitenin blokları ve her bloktaki daire sayısı (Excel verisinden)
// "Büyük" bloklar (A, D, H, J): 1-40; "küçük" bloklar: 1-20.
const BLOK_DAIRE_SAYILARI = {
  A: 40, D: 40, H: 40, J: 40,
  B: 20, C: 20, E: 20, F: 20, G: 20,
  I: 20, 'İ': 20
};
const BLOK_LISTESI = ['A','B','C','D','E','F','G','H','I','İ','J'];

// --- Görünüm motoru ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Ters proxy (Hostinger/Render) arkasında gerçek IP ve güvenli çerez için
app.set('trust proxy', 1);
app.disable('x-powered-by');

// --- Güvenlik başlıkları (helmet) + CSP (tawk.to ve Google Fonts izinli) ---
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'blob:', 'https://tawk.to', 'https://*.tawk.to', 'https://embed.tawk.to'],
        scriptSrcElem: ["'self'", "'unsafe-inline'", 'https://tawk.to', 'https://*.tawk.to', 'https://embed.tawk.to'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://tawk.to', 'https://*.tawk.to'],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com', 'https://tawk.to', 'https://*.tawk.to'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'", 'https://tawk.to', 'https://*.tawk.to', 'wss://*.tawk.to'],
        frameSrc: ["'self'", 'https://tawk.to', 'https://*.tawk.to', 'blob:'],
        childSrc: ["'self'", 'blob:', 'https://tawk.to', 'https://*.tawk.to'],
        workerSrc: ["'self'", 'blob:'],
        mediaSrc: ["'self'", 'https://tawk.to', 'https://*.tawk.to', 'blob:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false,
    hsts: { maxAge: 15552000, includeSubDomains: true }
  })
);

// --- Performans: gzip sıkıştırma (en yüksek seviye) ---
app.use(compression({ level: 9, threshold: 512 }));

// --- Genel istek hız sınırı (DoS/kaba kuvvet azaltma) ---
const genelLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(genelLimit);

// Giriş/kayıt gibi hassas uçlar için daha sıkı sınır
const girisLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Çok fazla deneme yapıldı. Lütfen bir süre sonra tekrar deneyin.'
});

// --- Gövde ayrıştırma (boyut sınırlı) ve statik dosyalar (önbellekli) ---
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: '7d',
    etag: true,
    setHeaders(res, dosyaYolu) {
      // Görseller için daha uzun önbellek
      if (/\.(jpe?g|png|webp|gif|svg|ico)$/i.test(dosyaYolu)) {
        res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
      }
    }
  })
);

// SEO: robots.txt ve sitemap.xml
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send('User-agent: *\nAllow: /\nDisallow: /yonetim/\nDisallow: /giris\nDisallow: /kayit\nDisallow: /sifremi-unuttum\nSitemap: https://cumhuriyetsitesi.org/sitemap.xml\n');
});

app.get('/sitemap.xml', (req, res) => {
  const bugun = new Date().toISOString().split('T')[0];
  const sayfalar = [
    { loc: '/', oncelik: '1.0' },
    { loc: '/duyurular', oncelik: '0.8' },
    { loc: '/hakkinda', oncelik: '0.6' },
    { loc: '/kentsel-donusum', oncelik: '0.7' },
    { loc: '/iletisim', oncelik: '0.6' },
    { loc: '/kayit', oncelik: '0.4' }
  ];
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    sayfalar.map(s => `  <url><loc>https://cumhuriyetsitesi.org${s.loc}</loc><lastmod>${bugun}</lastmod><changefreq>weekly</changefreq><priority>${s.oncelik}</priority></url>`).join('\n') +
    '\n</urlset>';
  res.type('application/xml').send(xml);
});

app.use(
  session({
    name: 'cs.sid',
    secret: process.env.SESSION_SECRET || 'gizli-anahtar',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 8 // 8 saat
    }
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
  res.locals.okunmamisMesajlar = [];
  if (req.session.uye) {
    try {
      const r = await q(
        'SELECT COUNT(*)::int AS c FROM uye_mesajlari WHERE uye_id = $1 AND okundu = 0',
        [req.session.uye.id]
      );
      res.locals.okunmamisMesajSayisi = r.rows[0].c;
      const son = await q(
        'SELECT id, baslik, mesaj, olusturma_tarihi FROM uye_mesajlari WHERE uye_id = $1 AND okundu = 0 ORDER BY id DESC LIMIT 5',
        [req.session.uye.id]
      );
      res.locals.okunmamisMesajlar = son.rows.map(m => ({ ...m, okundu: 0 }));
    } catch (e) {
      res.locals.okunmamisMesajSayisi = 0;
      res.locals.okunmamisMesajlar = [];
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

// İletişim formu gönderimi (zengin metin destekli)
app.post('/iletisim', girisLimit, ah(async (req, res) => {
  const { ad_soyad, email, telefon, konu, mesaj } = req.body;
  if (!ad_soyad || !mesaj) {
    req.flash('hata', 'Ad soyad ve mesaj alanları zorunludur.');
    return res.redirect('/iletisim');
  }
  await q(
    'INSERT INTO mesajlar (ad_soyad, email, telefon, konu, mesaj) VALUES ($1, $2, $3, $4, $5)',
    [ad_soyad.trim().slice(0, 100), (email || '').trim().slice(0, 150), (telefon || '').trim().slice(0, 30), (konu || '').trim().slice(0, 200), zenginMetin(mesaj)]
  );
  req.flash('basari', 'Mesajınız alındı. En kısa sürede size dönüş yapılacaktır.');
  res.redirect('/iletisim');
}));

// =====================================================================
//  ÜYE KİMLİK DOĞRULAMA
// =====================================================================

// Kayıt formu: iki ayrı dropdown (Blok + Daire)
app.get('/kayit', (req, res) => {
  const daireler = BLOK_LISTESI.map((blok) => ({
    blok,
    etiket: (blok === 'I' ? 'ı' : (blok === 'İ' ? 'i' : blok.toLowerCase())),
    adet: BLOK_DAIRE_SAYILARI[blok],
    secenekler: Array.from({ length: BLOK_DAIRE_SAYILARI[blok] }, (_, i) => i + 1)
  }));
  res.render('kayit', { aktifSayfa: 'kayit', daireler });
});

// Kayıt işlemi (e-posta + telefon doğrulama kodu)
// Formdan "blok" + "daire" ayrı alanlar; geriye uyum: eski "daire_no = A/15" da kabul edilir
app.post('/kayit', girisLimit, ah(async (req, res) => {
  const { ad_soyad, blok, daire, daire_no, telefon, email, sifre, sifre_tekrar } = req.body;

  let secilenBlok = (blok || '').trim();
  let daireSayi = (daire || '').trim();

  // Eski form (daire_no = "A/15") desteği
  if (daire_no && !secilenBlok && !daireSayi) {
    const eski = String(daire_no).split('/');
    if (eski.length === 2) {
      secilenBlok = eski[0];
      daireSayi = eski[1];
    } else {
      secilenBlok = daire_no;
      daireSayi = '1';
    }
  }

  if (!ad_soyad || !secilenBlok || !daireSayi || !telefon || !email || !sifre) {
    req.flash('hata', 'Lütfen tüm zorunlu alanları doldurun.');
    return res.redirect('/kayit');
  }
  if (!BLOK_LISTESI.includes(secilenBlok)) {
    req.flash('hata', 'Geçersiz blok seçimi.');
    return res.redirect('/kayit');
  }
  const daireNo = parseInt(daireSayi, 10);
  if (!Number.isInteger(daireNo) || daireNo < 1 || daireNo > BLOK_DAIRE_SAYILARI[secilenBlok]) {
    req.flash('hata', 'Geçersiz daire seçimi.');
    return res.redirect('/kayit');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    req.flash('hata', 'Geçerli bir e-posta adresi girin.');
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
  const temizEmail = email.trim().toLowerCase();
  const daireEtiket = secilenBlok + '/' + daireNo;

  const mevcutTel = (await q('SELECT id FROM uyeler WHERE telefon = $1', [temizTelefon])).rows[0];
  if (mevcutTel) {
    req.flash('hata', 'Bu telefon numarası ile daha önce kayıt yapılmış.');
    return res.redirect('/kayit');
  }
  const mevcutMail = (await q('SELECT id FROM uyeler WHERE email = $1', [temizEmail])).rows[0];
  if (mevcutMail) {
    req.flash('hata', 'Bu e-posta adresi ile kayıt mevcut. Şifrenizi unuttuysanız sıfırlayabilirsiniz.');
    return res.redirect('/kayit');
  }

  const hash = bcrypt.hashSync(sifre, 10);
  const sonuc = await q(
    'INSERT INTO uyeler (ad_soyad, daire_no, telefon, email, sifre_hash, onayli, email_dogrulandi) VALUES ($1, $2, $3, $4, $5, 1, 1) RETURNING id',
    [ad_soyad.trim(), daireEtiket, temizTelefon, temizEmail, hash]
  );
  const yeniUyeId = sonuc.rows[0].id;

  // 6 haneli doğrulama kodu gönder
  const kod = kodUret();
  await q(
    "INSERT INTO uye_dogrulama_kodlari (uye_id, email, kod, amac, son_kullanma) VALUES ($1, $2, $3, 'email_dogrulama', to_char((now() AT TIME ZONE 'Europe/Istanbul') + interval '15 minutes', 'YYYY-MM-DD HH24:MI:SS'))",
    [yeniUyeId, temizEmail, kod]
  );

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e4e8ee;border-radius:12px;">
      <h2 style="color:#1e5aa8;margin:0 0 12px;">Cumhuriyet Sitesi</h2>
      <p>Merhaba <strong>${escapeHtml(ad_soyad)}</strong>,</p>
      <p>Üyeliğinizi doğrulamak için aşağıdaki 6 haneli kodu kullanın:</p>
      <div style="font-size:32px;letter-spacing:8px;font-weight:bold;color:#1e5aa8;text-align:center;padding:18px;background:#f0f4fa;border-radius:10px;margin:18px 0;">${kod}</div>
      <p style="color:#6c757d;font-size:13px;">Bu kod 15 dakika geçerlidir. Eğer bu kaydı siz yapmadıysanız bu e-postayı yok sayabilirsiniz.</p>
    </div>
  `;
  const mailSonuc = await mailGonder(temizEmail, 'Cumhuriyet Sitesi - E-posta Doğrulama Kodu', html);

  req.flash(
    'basari',
    mailSonuc.ok
      ? (mailSonuc.dev
          ? 'Geliştirme modu: doğrulama kodu sunucu konsoluna yazıldı (SMTP ayarlı değil).'
          : 'Doğrulama kodu e-postanıza gönderildi. Lütfen e-postanızı kontrol edin.')
      : 'Kayıt oluşturuldu fakat doğrulama e-postası gönderilemedi. Yöneticiyle iletişime geçin.'
  );
  req.session.bekleyenEmail = temizEmail;
  res.redirect('/kayit/dogrula');
}));

// E-posta doğrulama sayfası (GET)
app.get('/kayit/dogrula', (req, res) => {
  if (!req.session.bekleyenEmail) return res.redirect('/giris');
  res.render('dogrula', { aktifSayfa: '', email: req.session.bekleyenEmail, mod: 'kayit' });
});

// E-posta doğrulama işlemi (POST)
app.post('/kayit/dogrula', girisLimit, ah(async (req, res) => {
  const email = req.session.bekleyenEmail;
  if (!email) return res.redirect('/giris');
  const kod = (req.body.kod || '').trim();

  const bulunan = (await q(
    "SELECT id, kod, son_kullanma FROM uye_dogrulama_kodlari WHERE email = $1 AND amac = 'email_dogrulama' AND kullanildi = 0 ORDER BY id DESC LIMIT 1",
    [email]
  )).rows[0];

  console.log('[DOGRULA]', { email, kodGirilen: kod, kodDb: bulunan ? bulunan.kod : null, sonKullanma: bulunan ? bulunan.son_kullanma : null });

  if (!bulunan || bulunan.kod !== kod.trim()) {
    req.flash('hata', 'Kod hatalı veya süresi dolmuş. (E-posta: ' + email + ', DB\'de kayıt: ' + (bulunan ? 'var, kod eşleşmedi' : 'yok') + ')');
    return res.redirect('/kayit/dogrula');
  }
  const sonKullanma = new Date(bulunan.son_kullanma.replace(' ', 'T'));
  if (sonKullanma < new Date()) {
    req.flash('hata', 'Doğrulama kodunun süresi dolmuş. Yeni kod talep edin.');
    return res.redirect('/kayit/dogrula');
  }

  await q("UPDATE uye_dogrulama_kodlari SET kullanildi = 1 WHERE id = $1", [bulunan.id]);
  await q("UPDATE uyeler SET email_dogrulandi = 1 WHERE email = $1", [email]);
  delete req.session.bekleyenEmail;

  req.flash('basari', 'E-postanız doğrulandı! Hesabınız aktifleştirildi. Hemen giriş yapabilirsiniz.');
  res.redirect('/giris');
}));

// Doğrulama kodunu yeniden gönder
app.post('/kayit/dogrula/yeniden', girisLimit, ah(async (req, res) => {
  const email = req.session.bekleyenEmail;
  if (!email) return res.redirect('/giris');
  const uye = (await q('SELECT id, ad_soyad FROM uyeler WHERE email = $1', [email])).rows[0];
  if (!uye) return res.redirect('/kayit');

  const kod = kodUret();
  await q(
    "INSERT INTO uye_dogrulama_kodlari (uye_id, email, kod, amac, son_kullanma) VALUES ($1, $2, $3, 'email_dogrulama', to_char((now() AT TIME ZONE 'Europe/Istanbul') + interval '15 minutes', 'YYYY-MM-DD HH24:MI:SS'))",
    [uye.id, email, kod]
  );

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e4e8ee;border-radius:12px;">
      <h2 style="color:#1e5aa8;margin:0 0 12px;">Cumhuriyet Sitesi</h2>
      <p>Merhaba <strong>${escapeHtml(uye.ad_soyad)}</strong>,</p>
      <p>Yeni doğrulama kodunuz:</p>
      <div style="font-size:32px;letter-spacing:8px;font-weight:bold;color:#1e5aa8;text-align:center;padding:18px;background:#f0f4fa;border-radius:10px;margin:18px 0;">${kod}</div>
      <p style="color:#6c757d;font-size:13px;">Bu kod 15 dakika geçerlidir.</p>
    </div>
  `;
  await mailGonder(email, 'Cumhuriyet Sitesi - Yeni Doğrulama Kodu', html);
  req.flash('basari', 'Yeni kod e-postanıza gönderildi.');
  res.redirect('/kayit/dogrula');
}));

// Giriş formu
app.get('/giris', (req, res) => {
  res.render('giris', { aktifSayfa: 'giris' });
});

// --- Şifremi unuttum (telefon + e-posta eşleşmesi ile kod) ---
app.get('/sifremi-unuttum', (req, res) => {
  res.render('sifre-unuttum', { aktifSayfa: '', adim: 'telefon' });
});

app.post('/sifremi-unuttum', girisLimit, ah(async (req, res) => {
  const telefon = (req.body.telefon || '').replace(/\s+/g, '');
  const email = (req.body.email || '').trim().toLowerCase();
  if (!telefon || !email) {
    req.flash('hata', 'Telefon ve e-posta zorunludur.');
    return res.redirect('/sifremi-unuttum');
  }
  const uye = (await q(
    'SELECT id, ad_soyad, email_dogrulandi FROM uyeler WHERE telefon = $1 AND email = $2',
    [telefon, email]
  )).rows[0];

  // Bilgi sızdırmamak için her durumda aynı mesajı göster
  req.flash('basari', 'Telefon ve e-posta eşleşiyorsa sıfırlama kodu e-postanıza gönderildi.');
  if (!uye || !uye.email_dogrulandi) return res.redirect('/giris');

  const kod = kodUret();
  await q(
    "INSERT INTO uye_dogrulama_kodlari (uye_id, email, kod, amac, son_kullanma) VALUES ($1, $2, $3, 'sifre_sifirlama', to_char((now() AT TIME ZONE 'Europe/Istanbul') + interval '15 minutes', 'YYYY-MM-DD HH24:MI:SS'))",
    [uye.id, email, kod]
  );

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e4e8ee;border-radius:12px;">
      <h2 style="color:#1e5aa8;margin:0 0 12px;">Cumhuriyet Sitesi</h2>
      <p>Merhaba <strong>${escapeHtml(uye.ad_soyad)}</strong>,</p>
      <p>Şifrenizi sıfırlamak için aşağıdaki 6 haneli kodu kullanın:</p>
      <div style="font-size:32px;letter-spacing:8px;font-weight:bold;color:#1e5aa8;text-align:center;padding:18px;background:#f0f4fa;border-radius:10px;margin:18px 0;">${kod}</div>
      <p style="color:#6c757d;font-size:13px;">Bu kod 15 dakika geçerlidir. Şifre sıfırlama talebi sizden gelmediyse bu e-postayı yok sayın.</p>
    </div>
  `;
  await mailGonder(email, 'Cumhuriyet Sitesi - Şifre Sıfırlama Kodu', html);
  req.session.sifreSifirlama = { uyeId: uye.id, email };
  res.redirect('/sifremi-unuttum/kod');
}));

app.get('/sifremi-unuttum/kod', (req, res) => {
  if (!req.session.sifreSifirlama) return res.redirect('/sifremi-unuttum');
  res.render('sifre-unuttum', { aktifSayfa: '', adim: 'kod', email: req.session.sifreSifirlama.email });
});

app.post('/sifremi-unuttum/kod', girisLimit, ah(async (req, res) => {
  const bilgi = req.session.sifreSifirlama;
  if (!bilgi) return res.redirect('/sifremi-unuttum');
  const kod = (req.body.kod || '').trim();
  const bulunan = (await q(
    "SELECT id, kod, son_kullanma FROM uye_dogrulama_kodlari WHERE uye_id = $1 AND amac = 'sifre_sifirlama' AND kullanildi = 0 ORDER BY id DESC LIMIT 1",
    [bilgi.uyeId]
  )).rows[0];

  console.log('[SIFRE-DOGRULA]', { email: bilgi.email, kodGirilen: kod, kodDb: bulunan ? bulunan.kod : null });

  if (!bulunan || bulunan.kod !== kod) {
    req.flash('hata', 'Kod hatalı veya süresi dolmuş. (DB: ' + (bulunan ? 'var, kod eşleşmedi' : 'kayıt yok') + ')');
    return res.redirect('/sifremi-unuttum/kod');
  }
  if (new Date(bulunan.son_kullanma.replace(' ', 'T')) < new Date()) {
    req.flash('hata', 'Sıfırlama kodunun süresi dolmuş.');
    return res.redirect('/sifremi-unuttum');
  }
  await q("UPDATE uye_dogrulama_kodlari SET kullanildi = 1 WHERE id = $1", [bulunan.id]);
  req.session.sifreSifirlama.dogrulandi = true;
  res.redirect('/sifremi-unuttum/yeni-sifre');
}));

app.get('/sifremi-unuttum/yeni-sifre', (req, res) => {
  if (!req.session.sifreSifirlama || !req.session.sifreSifirlama.dogrulandi) return res.redirect('/sifremi-unuttum');
  res.render('sifre-unuttum', { aktifSayfa: '', adim: 'yeni', email: req.session.sifreSifirlama.email });
});

app.post('/sifremi-unuttum/yeni-sifre', girisLimit, ah(async (req, res) => {
  const bilgi = req.session.sifreSifirlama;
  if (!bilgi || !bilgi.dogrulandi) return res.redirect('/sifremi-unuttum');
  const yeni = req.body.sifre || '';
  const yeniTekrar = req.body.sifre_tekrar || '';
  if (yeni.length < 4 || yeni !== yeniTekrar) {
    req.flash('hata', 'Şifre en az 4 karakter olmalı ve eşleşmeli.');
    return res.redirect('/sifremi-unuttum/yeni-sifre');
  }
  const hash = bcrypt.hashSync(yeni, 10);
  await q('UPDATE uyeler SET sifre_hash = $1 WHERE id = $2', [hash, bilgi.uyeId]);
  delete req.session.sifreSifirlama;
  req.flash('basari', 'Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.');
  res.redirect('/giris');
}));

// Giriş işlemi (hem yönetici hem site sakini aynı formdan giriş yapar)
app.post('/giris', girisLimit, ah(async (req, res) => {
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
    bekleyenUye: (await q('SELECT COUNT(*)::int AS c FROM uyeler WHERE email_dogrulandi = 0')).rows[0].c,
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

app.post('/yonetim/duyurular/ekle', adminGerekli, dosyaCok('duyurular'), ah(async (req, res) => {
  const { baslik, icerik, kategori, onemli } = req.body;
  if (!baslik || !icerik) {
    req.flash('hata', 'Başlık ve içerik zorunludur.');
    return res.redirect('/yonetim/duyurular');
  }
  const temizIcerik = zenginMetin(icerik);
  const ekSayisi = (req.files && req.files.length) || 0;
  const ilkEk = ekSayisi > 0 ? '/uploads/duyurular/' + req.files[0].filename : null;
  const sonuc = await q(
    'INSERT INTO duyurular (baslik, icerik, kategori, onemli, ek_dosya) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [baslik.trim(), temizIcerik, (kategori || 'Genel').trim(), onemli ? 1 : 0, ilkEk]
  );
  const yeniId = sonuc.rows[0].id;
  // Çoklu ekleri ayrı tabloya ekle
  if (req.files && req.files.length) {
    for (const f of req.files) {
      await q(
        'INSERT INTO duyuru_ekleri (duyuru_id, dosya_yolu, orijinal_ad, boyut) VALUES ($1, $2, $3, $4)',
        [yeniId, '/uploads/duyurular/' + f.filename, f.originalname, f.size]
      );
    }
  }
  req.flash('basari', 'Duyuru eklendi.' + (ekSayisi ? ` ${ekSayisi} ek dosya yüklendi.` : ''));
  res.redirect('/yonetim/duyurular');
}));

app.post('/yonetim/duyurular/sil/:id', adminGerekli, ah(async (req, res) => {
  // Ana ek dosyayı disk'ten temizle
  const duyuru = (await q('SELECT ek_dosya FROM duyurular WHERE id = $1', [req.params.id])).rows[0];
  if (duyuru && duyuru.ek_dosya) {
    fs.unlink(path.join(__dirname, 'public', duyuru.ek_dosya), () => {});
  }
  // Çoklu ekleri de disk'ten temizle (ON DELETE CASCADE DB kayıtlarını siler)
  const ekler = (await q('SELECT dosya_yolu FROM duyuru_ekleri WHERE duyuru_id = $1', [req.params.id])).rows;
  for (const ek of ekler) {
    fs.unlink(path.join(__dirname, 'public', ek.dosya_yolu), () => {});
  }
  await q('DELETE FROM duyurular WHERE id = $1', [req.params.id]);
  req.flash('basari', 'Duyuru silindi.');
  res.redirect('/yonetim/duyurular');
}));

// Duyuru düzenleme formu
app.get('/yonetim/duyurular/duzenle/:id', adminGerekli, ah(async (req, res) => {
  const duyuru = (await q('SELECT * FROM duyurular WHERE id = $1', [req.params.id])).rows[0];
  if (!duyuru) {
    req.flash('hata', 'Duyuru bulunamadı.');
    return res.redirect('/yonetim/duyurular');
  }
  const ekler = (await q('SELECT * FROM duyuru_ekleri WHERE duyuru_id = $1 ORDER BY id', [req.params.id])).rows;
  res.render('admin/duyuru-duzenle', { aktifSayfa: 'duyurular', duyuru, ekler });
}));

// Duyuru düzenleme işlemi
app.post('/yonetim/duyurular/duzenle/:id', adminGerekli, dosyaCok('duyurular'), ah(async (req, res) => {
  const mevcut = (await q('SELECT * FROM duyurular WHERE id = $1', [req.params.id])).rows[0];
  if (!mevcut) {
    req.flash('hata', 'Duyuru bulunamadı.');
    return res.redirect('/yonetim/duyurular');
  }
  const { baslik, icerik, kategori, onemli, ek_dosya_sil, silinecek_ekler } = req.body;
  if (!baslik || !icerik) {
    req.flash('hata', 'Başlık ve içerik zorunludur.');
    return res.redirect('/yonetim/duyurular/duzenle/' + req.params.id);
  }
  const temizIcerik = zenginMetin(icerik);

  // Tek dosya alanı (geriye uyum) silinmiş mi?
  if (ek_dosya_sil === '1' && mevcut.ek_dosya) {
    fs.unlink(path.join(__dirname, 'public', mevcut.ek_dosya), () => {});
  }
  // Çoklu eklerden silinenler
  if (Array.isArray(silinecek_ekler)) {
    for (const ekId of silinecek_ekler) {
      const ek = (await q('SELECT dosya_yolu FROM duyuru_ekleri WHERE id = $1 AND duyuru_id = $2', [ekId, req.params.id])).rows[0];
      if (ek) {
        fs.unlink(path.join(__dirname, 'public', ek.dosya_yolu), () => {});
        await q('DELETE FROM duyuru_ekleri WHERE id = $1', [ekId]);
      }
    }
  }
  // Yeni dosyalar yüklendiyse ekle
  if (req.files && req.files.length) {
    for (const f of req.files) {
      await q(
        'INSERT INTO duyuru_ekleri (duyuru_id, dosya_yolu, orijinal_ad, boyut) VALUES ($1, $2, $3, $4)',
        [req.params.id, '/uploads/duyurular/' + f.filename, f.originalname, f.size]
      );
    }
  }
  // İlk ek'i ana ek_dosya kolonuna yaz (geriye uyum)
  const ilkEk = (await q('SELECT dosya_yolu FROM duyuru_ekleri WHERE duyuru_id = $1 ORDER BY id LIMIT 1', [req.params.id])).rows[0];
  const ekDosya = (ek_dosya_sil === '1') ? null : (ilkEk ? ilkEk.dosya_yolu : mevcut.ek_dosya);
  await q(
    'UPDATE duyurular SET baslik = $1, icerik = $2, kategori = $3, onemli = $4, ek_dosya = $5 WHERE id = $6',
    [baslik.trim(), temizIcerik, (kategori || 'Genel').trim(), onemli ? 1 : 0, ekDosya, req.params.id]
  );
  req.flash('basari', 'Duyuru güncellendi.');
  res.redirect('/yonetim/duyurular');
}));

// --- Üye yönetimi ---
app.get('/yonetim/uyeler', adminGerekli, ah(async (req, res) => {
  const uyeler = (await q('SELECT * FROM uyeler ORDER BY email_dogrulandi ASC, id DESC')).rows;
  res.render('admin/uyeler', { aktifSayfa: 'uyeler', uyeler });
}));

app.post('/yonetim/uyeler/email-dogrula/:id', adminGerekli, ah(async (req, res) => {
  await q('UPDATE uyeler SET email_dogrulandi = 1 WHERE id = $1', [req.params.id]);
  req.flash('basari', 'Üye e-postası doğrulandı.');
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

app.post('/yonetim/kentsel-donusum/ekle', adminGerekli, dosyaCok('kentsel'), ah(async (req, res) => {
  const { baslik, icerik, durum } = req.body;
  if (!baslik || !icerik) {
    req.flash('hata', 'Başlık ve içerik zorunludur.');
    return res.redirect('/yonetim/kentsel-donusum');
  }
  const temizIcerik = zenginMetin(icerik);
  const ekSayisi = (req.files && req.files.length) || 0;
  const ilkEk = ekSayisi > 0 ? '/uploads/kentsel/' + req.files[0].filename : null;
  const sonuc = await q(
    'INSERT INTO kentsel_donusum (baslik, icerik, durum, ek_dosya) VALUES ($1, $2, $3, $4) RETURNING id',
    [baslik.trim(), temizIcerik, (durum || 'Planlama').trim(), ilkEk]
  );
  const yeniId = sonuc.rows[0].id;
  if (req.files && req.files.length) {
    for (const f of req.files) {
      await q('INSERT INTO kentsel_ekleri (kentsel_id, dosya_yolu, orijinal_ad, boyut) VALUES ($1, $2, $3, $4)',
        [yeniId, '/uploads/kentsel/' + f.filename, f.originalname, f.size]);
    }
  }
  req.flash('basari', 'Kayıt eklendi.' + (ekSayisi ? ' ' + ekSayisi + ' ek dosya yüklendi.' : ''));
  res.redirect('/yonetim/kentsel-donusum');
}));

app.post('/yonetim/kentsel-donusum/sil/:id', adminGerekli, ah(async (req, res) => {
  const madde = (await q('SELECT ek_dosya FROM kentsel_donusum WHERE id = $1', [req.params.id])).rows[0];
  if (madde && madde.ek_dosya) {
    fs.unlink(path.join(__dirname, 'public', madde.ek_dosya), () => {});
  }
  const ekler = (await q('SELECT dosya_yolu FROM kentsel_ekleri WHERE kentsel_id = $1', [req.params.id])).rows;
  for (const ek of ekler) {
    fs.unlink(path.join(__dirname, 'public', ek.dosya_yolu), () => {});
  }
  await q('DELETE FROM kentsel_donusum WHERE id = $1', [req.params.id]);
  req.flash('basari', 'Kayıt silindi.');
  res.redirect('/yonetim/kentsel-donusum');
}));

// Kentsel düzenleme formu
app.get('/yonetim/kentsel-donusum/duzenle/:id', adminGerekli, ah(async (req, res) => {
  const madde = (await q('SELECT * FROM kentsel_donusum WHERE id = $1', [req.params.id])).rows[0];
  if (!madde) {
    req.flash('hata', 'Kayıt bulunamadı.');
    return res.redirect('/yonetim/kentsel-donusum');
  }
  const ekler = (await q('SELECT * FROM kentsel_ekleri WHERE kentsel_id = $1 ORDER BY id', [req.params.id])).rows;
  res.render('admin/kentsel-donusum-duzenle', { aktifSayfa: 'kentsel-donusum', madde, ekler });
}));

// Kentsel düzenleme işlemi
app.post('/yonetim/kentsel-donusum/duzenle/:id', adminGerekli, dosyaCok('kentsel'), ah(async (req, res) => {
  const mevcut = (await q('SELECT * FROM kentsel_donusum WHERE id = $1', [req.params.id])).rows[0];
  if (!mevcut) {
    req.flash('hata', 'Kayıt bulunamadı.');
    return res.redirect('/yonetim/kentsel-donusum');
  }
  const { baslik, icerik, durum, ek_dosya_sil } = req.body;
  if (!baslik || !icerik) {
    req.flash('hata', 'Başlık ve içerik zorunludur.');
    return res.redirect('/yonetim/kentsel-donusum/duzenle/' + req.params.id);
  }
  const temizIcerik = zenginMetin(icerik);
  let ekDosya = mevcut.ek_dosya;
  if (req.file) {
    if (mevcut.ek_dosya) {
      fs.unlink(path.join(__dirname, 'public', mevcut.ek_dosya), () => {});
    }
    ekDosya = '/uploads/kentsel/' + req.file.filename;
  } else if (ek_dosya_sil === '1') {
    if (mevcut.ek_dosya) {
      fs.unlink(path.join(__dirname, 'public', mevcut.ek_dosya), () => {});
    }
    ekDosya = null;
  }
  await q(
    'UPDATE kentsel_donusum SET baslik = $1, icerik = $2, durum = $3, ek_dosya = $4 WHERE id = $5',
    [baslik.trim(), temizIcerik, (durum || 'Planlama').trim(), ekDosya, req.params.id]
  );
  req.flash('basari', 'Kayıt güncellendi.');
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
    const hedef = (await q('SELECT id FROM uyeler WHERE email_dogrulandi = 1')).rows;
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
  const uyeler = (await q('SELECT id, ad_soyad, daire_no FROM uyeler WHERE email_dogrulandi = 1 ORDER BY ad_soyad ASC')).rows;
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
  const temizBaslik = baslik.trim().slice(0, 200);
  const temizMesaj = zenginMetin(mesaj);

  if (tum_uyeler) {
    const hedef = (await q('SELECT id FROM uyeler WHERE email_dogrulandi = 1')).rows;
    for (const u of hedef) {
      await q('INSERT INTO uye_mesajlari (uye_id, baslik, mesaj) VALUES ($1, $2, $3)', [u.id, temizBaslik, temizMesaj]);
    }
    req.flash('basari', `${hedef.length} üyeye mesaj gönderildi.`);
  } else {
    if (!uye_id) {
      req.flash('hata', 'Üye seçin veya "Tüm üyeler" işaretleyin.');
      return res.redirect('/yonetim/mesaj-gonder');
    }
    await q('INSERT INTO uye_mesajlari (uye_id, baslik, mesaj) VALUES ($1, $2, $3)', [uye_id, temizBaslik, temizMesaj]);
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
  const blok = (req.query.blok || '').trim();
  const ara = (req.query.ara || '').trim();
  const siraSql = "ORDER BY NULLIF(regexp_replace(daire, '\\D', '', 'g'), '')::int ASC NULLS LAST, id ASC";

  // Bina ızgarası (blok seçilmemiş)
  if (!blok) {
    const gruplar = (await q(
      `SELECT COALESCE(NULLIF(TRIM(blok), ''), 'Diğer') AS blok, COUNT(*)::int AS adet
       FROM sakinler GROUP BY 1 ORDER BY 1`
    )).rows;
    const toplam = gruplar.reduce((a, g) => a + g.adet, 0);
    return res.render('admin/sakinler', { aktifSayfa: 'sakinler', mod: 'grid', gruplar, toplam });
  }

  // Blok detayı (isteğe bağlı arama ile)
  let sakinler;
  if (ara) {
    const like = '%' + ara + '%';
    sakinler = (await q(
      `SELECT * FROM sakinler
       WHERE COALESCE(NULLIF(TRIM(blok), ''), 'Diğer') = $1
       AND (isim_soyisim ILIKE $2 OR daire ILIKE $2 OR adres ILIKE $2 OR iletisim ILIKE $2 OR ptt ILIKE $2 OR bilgi ILIKE $2 OR yakinlik ILIKE $2)
       ${siraSql}`,
      [blok, like]
    )).rows;
  } else {
    sakinler = (await q(
      `SELECT * FROM sakinler WHERE COALESCE(NULLIF(TRIM(blok), ''), 'Diğer') = $1 ${siraSql}`,
      [blok]
    )).rows;
  }
  res.render('admin/sakinler', { aktifSayfa: 'sakinler', mod: 'detay', blok, ara, sakinler });
}));

app.post('/yonetim/sakinler/ekle', adminGerekli, ah(async (req, res) => {
  const d = SAKIN_ALANLAR.map((a) => (req.body[a] || '').trim());
  await q(
    `INSERT INTO sakinler (blok, daire, eksik, isim_soyisim, ptt, ptt2, adres, iletisim, bilgi, yakinlik, bilgi_iletisim)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    d
  );
  req.flash('basari', 'Yeni kayıt eklendi.');
  res.redirect('/yonetim/sakinler?blok=' + encodeURIComponent((req.body.blok || '').trim()));
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
  res.redirect('/yonetim/sakinler?blok=' + encodeURIComponent((req.body.blok || '').trim()));
}));

app.post('/yonetim/sakinler/sil/:id', adminGerekli, ah(async (req, res) => {
  await q('DELETE FROM sakinler WHERE id = $1', [req.params.id]);
  req.flash('basari', 'Kayıt silindi.');
  res.redirect('/yonetim/sakinler?blok=' + encodeURIComponent((req.body.donus_blok || '').trim()));
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
      if (v.result !== undefined && v.result !== null) return String(v.result).trim();
      if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join('').trim();
      if (v.hyperlink) return String(v.text || v.hyperlink).trim();
      return '';
    }
    return String(v).trim();
  };

  // Satırları topla (başlık satırını atla, boş/toplam satırları atla)
  const kayitlar = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // başlık
    const d = [];
    for (let c = 1; c <= 11; c++) d.push(hucre(row, c));
    const blokDeg = (d[0] || '').toLocaleUpperCase('tr-TR');
    if (blokDeg === 'TOPLAM' || blokDeg === 'BLOK') return; // toplam/başlık satırı
    if (d.some((x) => x !== '')) kayitlar.push(d);
  });

  let eklenen = 0;
  for (const d of kayitlar) {
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
