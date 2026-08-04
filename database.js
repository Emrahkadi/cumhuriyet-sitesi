/**
 * Veritabanı kurulumu ve şema tanımları (PostgreSQL / pg)
 * Bağlantı için DATABASE_URL ortam değişkeni gereklidir (Neon/Supabase vb.).
 * Doğrudan çalıştırıldığında (npm run init-db) tabloları oluşturur.
 */
'use strict';

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

if (!process.env.DATABASE_URL) {
  console.error(
    'HATA: DATABASE_URL tanımlı değil. PostgreSQL bağlantı adresini ortam değişkeni olarak ekleyin.'
  );
}

// Yerel bağlantıda SSL kapalı, uzak (Neon/Supabase) bağlantıda açık
const yerel = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: yerel ? false : { rejectUnauthorized: false },
  max: 8,                       // ücretsiz PostgreSQL için makul havuz boyutu
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

// Beklenmeyen havuz hatalarında uygulamanın çökmemesi için
pool.on('error', (err) => {
  console.error('Beklenmeyen veritabanı havuzu hatası:', err.message);
});

// Kısa sorgu yardımcısı
function q(text, params) {
  return pool.query(text, params);
}

// --- Tablolar ---
async function createTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS uyeler (
      id SERIAL PRIMARY KEY,
      ad_soyad TEXT NOT NULL,
      daire_no TEXT NOT NULL,
      telefon TEXT NOT NULL UNIQUE,
      email TEXT UNIQUE,
      email_dogrulandi INTEGER NOT NULL DEFAULT 0,
      sifre_hash TEXT NOT NULL,
      onayli INTEGER NOT NULL DEFAULT 0,
      olusturma_tarihi TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI:SS')
    );

    -- E-posta doğrulama ve şifre sıfırlama kodları (15 dk geçerli)
    CREATE TABLE IF NOT EXISTS uye_dogrulama_kodlari (
      id SERIAL PRIMARY KEY,
      uye_id INTEGER REFERENCES uyeler(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      kod TEXT NOT NULL,
      amac TEXT NOT NULL,
      son_kullanma TEXT NOT NULL,
      kullanildi INTEGER NOT NULL DEFAULT 0,
      olusturma_tarihi TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI:SS')
    );
    CREATE INDEX IF NOT EXISTS idx_dogrulama_kod ON uye_dogrulama_kodlari (email, amac, kullanildi);

    CREATE TABLE IF NOT EXISTS yoneticiler (
      id SERIAL PRIMARY KEY,
      kullanici_adi TEXT NOT NULL UNIQUE,
      sifre_hash TEXT NOT NULL,
      olusturma_tarihi TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI:SS')
    );

    CREATE TABLE IF NOT EXISTS duyurular (
      id SERIAL PRIMARY KEY,
      baslik TEXT NOT NULL,
      icerik TEXT NOT NULL,
      kategori TEXT NOT NULL DEFAULT 'Genel',
      onemli INTEGER NOT NULL DEFAULT 0,
      ek_dosya TEXT,
      olusturma_tarihi TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI:SS')
    );

    CREATE TABLE IF NOT EXISTS mesajlar (
      id SERIAL PRIMARY KEY,
      ad_soyad TEXT NOT NULL,
      email TEXT,
      telefon TEXT,
      konu TEXT,
      mesaj TEXT NOT NULL,
      okundu INTEGER NOT NULL DEFAULT 0,
      olusturma_tarihi TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI:SS')
    );

    CREATE TABLE IF NOT EXISTS kentsel_donusum (
      id SERIAL PRIMARY KEY,
      baslik TEXT NOT NULL,
      icerik TEXT NOT NULL,
      durum TEXT NOT NULL DEFAULT 'Planlama',
      ek_dosya TEXT,
      olusturma_tarihi TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI:SS')
    );

    CREATE TABLE IF NOT EXISTS aidatlar (
      id SERIAL PRIMARY KEY,
      uye_id INTEGER NOT NULL REFERENCES uyeler(id) ON DELETE CASCADE,
      donem TEXT NOT NULL,
      tutar NUMERIC(10, 2) NOT NULL,
      odendi INTEGER NOT NULL DEFAULT 0,
      odeme_tarihi TEXT,
      aciklama TEXT,
      olusturma_tarihi TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI:SS')
    );

    CREATE TABLE IF NOT EXISTS uye_mesajlari (
      id SERIAL PRIMARY KEY,
      uye_id INTEGER NOT NULL REFERENCES uyeler(id) ON DELETE CASCADE,
      baslik TEXT NOT NULL,
      mesaj TEXT NOT NULL,
      okundu INTEGER NOT NULL DEFAULT 0,
      olusturma_tarihi TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI:SS')
    );

    CREATE TABLE IF NOT EXISTS sakinler (
      id SERIAL PRIMARY KEY,
      blok TEXT DEFAULT '',
      daire TEXT DEFAULT '',
      eksik TEXT DEFAULT '',
      isim_soyisim TEXT DEFAULT '',
      ptt TEXT DEFAULT '',
      ptt2 TEXT DEFAULT '',
      adres TEXT DEFAULT '',
      iletisim TEXT DEFAULT '',
      bilgi TEXT DEFAULT '',
      yakinlik TEXT DEFAULT '',
      bilgi_iletisim TEXT DEFAULT '',
      olusturma_tarihi TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI:SS')
    );

    -- Performans indeksleri
    CREATE INDEX IF NOT EXISTS idx_uye_mesajlari_uye ON uye_mesajlari (uye_id, okundu);
    CREATE INDEX IF NOT EXISTS idx_aidatlar_uye ON aidatlar (uye_id, odendi);
    CREATE INDEX IF NOT EXISTS idx_sakinler_blok ON sakinler (blok);
    CREATE INDEX IF NOT EXISTS idx_duyurular_sira ON duyurular (onemli DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_mesajlar_okundu ON mesajlar (okundu);
  `);

  // Mevcut tablolara yeni sütunları idempotent şekilde ekle
  await pool.query(`
    ALTER TABLE uyeler ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE uyeler ADD COLUMN IF NOT EXISTS email_dogrulandi INTEGER NOT NULL DEFAULT 0;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_uyeler_email ON uyeler (email) WHERE email IS NOT NULL;
    ALTER TABLE duyurular ADD COLUMN IF NOT EXISTS ek_dosya TEXT;
    ALTER TABLE kentsel_donusum ADD COLUMN IF NOT EXISTS ek_dosya TEXT;
  `);
}

// --- Varsayılan yönetici ---
async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  const { rows } = await pool.query('SELECT id FROM yoneticiler WHERE kullanici_adi = $1', [username]);
  if (rows.length === 0) {
    const hash = bcrypt.hashSync(password, 10);
    await pool.query('INSERT INTO yoneticiler (kullanici_adi, sifre_hash) VALUES ($1, $2)', [username, hash]);
    console.log(`Varsayılan yönetici oluşturuldu -> kullanıcı: ${username}`);
  }
}

// --- Örnek içerik (yalnızca boşsa) ---
async function seedContent() {
  const d = await pool.query('SELECT COUNT(*)::int AS c FROM duyurular');
  if (d.rows[0].c === 0) {
    const sql = 'INSERT INTO duyurular (baslik, icerik, kategori, onemli) VALUES ($1, $2, $3, $4)';
    await pool.query(sql, [
      'Site Aidatları Hakkında',
      'Değerli site sakinlerimiz, Temmuz ayı aidatlarının ödenmesi için son tarih ayın 15\'idir. Ödemelerinizi site yönetim ofisinden veya banka hesabımızdan yapabilirsiniz.',
      'Aidat',
      1
    ]);
    await pool.query(sql, [
      'Asansör Bakımı',
      'A ve B bloklarındaki asansörlerin yıllık periyodik bakımı 5 Ağustos tarihinde yapılacaktır. Bakım sırasında asansörler kısa süreli hizmet dışı kalabilir.',
      'Bakım',
      0
    ]);
    await pool.query(sql, [
      'Site Bahçe Düzenlemesi',
      'Ortak alanlardaki peyzaj ve bahçe düzenleme çalışmaları bu hafta içinde tamamlanacaktır. Anlayışınız için teşekkür ederiz.',
      'Genel',
      0
    ]);
  }

  const k = await pool.query('SELECT COUNT(*)::int AS c FROM kentsel_donusum');
  if (k.rows[0].c === 0) {
    await pool.query(
      'INSERT INTO kentsel_donusum (baslik, icerik, durum) VALUES ($1, $2, $3)',
      [
        'Kentsel Dönüşüm Süreci Başladı',
        'Sitemizin deprem yönetmeliğine uygunluğu ve kentsel dönüşüm imkanları için ilk değerlendirme çalışmaları başlatılmıştır. Sürecin her aşaması bu bölümden paylaşılacaktır.',
        'Planlama'
      ]
    );
  }
}

async function init() {
  await createTables();
  await seedAdmin();
  await seedContent();
}

// Modül olarak dışa aktar
module.exports = { pool, q, init };

// Doğrudan çalıştırıldıysa kurulumu yap
if (require.main === module) {
  init()
    .then(() => {
      console.log('Veritabanı başarıyla hazırlandı (PostgreSQL).');
      return pool.end();
    })
    .catch((err) => {
      console.error('Veritabanı hazırlanamadı:', err.message);
      process.exit(1);
    });
}
