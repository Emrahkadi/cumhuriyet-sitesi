/**
 * Veritabanı kurulumu ve şema tanımları (SQLite / better-sqlite3)
 * Bu dosya doğrudan çalıştırıldığında (npm run init-db) tabloları oluşturur
 * ve varsayılan yönetici hesabını ekler.
 */
'use strict';

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

// Veritabanı dosyasını data/ klasöründe tut
// Üretimde kalıcı disk için DB_DIR ortam değişkeni ile klasör değiştirilebilir.
const dataDir = process.env.DB_DIR
  ? path.resolve(process.env.DB_DIR)
  : path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'cumhuriyet.db'));
db.pragma('journal_mode = WAL');

// --- Tablolar ---
function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS uyeler (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ad_soyad TEXT NOT NULL,
      daire_no TEXT NOT NULL,
      telefon TEXT NOT NULL UNIQUE,
      sifre_hash TEXT NOT NULL,
      onayli INTEGER NOT NULL DEFAULT 0,
      olusturma_tarihi TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS yoneticiler (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kullanici_adi TEXT NOT NULL UNIQUE,
      sifre_hash TEXT NOT NULL,
      olusturma_tarihi TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS duyurular (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      baslik TEXT NOT NULL,
      icerik TEXT NOT NULL,
      kategori TEXT NOT NULL DEFAULT 'Genel',
      onemli INTEGER NOT NULL DEFAULT 0,
      olusturma_tarihi TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS mesajlar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ad_soyad TEXT NOT NULL,
      email TEXT,
      telefon TEXT,
      konu TEXT,
      mesaj TEXT NOT NULL,
      okundu INTEGER NOT NULL DEFAULT 0,
      olusturma_tarihi TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS kentsel_donusum (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      baslik TEXT NOT NULL,
      icerik TEXT NOT NULL,
      durum TEXT NOT NULL DEFAULT 'Planlama',
      olusturma_tarihi TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);
}

// --- Varsayılan yönetici ---
function seedAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  const existing = db.prepare('SELECT id FROM yoneticiler WHERE kullanici_adi = ?').get(username);
  if (!existing) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO yoneticiler (kullanici_adi, sifre_hash) VALUES (?, ?)').run(username, hash);
    console.log(`Varsayılan yönetici oluşturuldu -> kullanıcı: ${username} / şifre: ${password}`);
  }
}

// --- Örnek içerik (yalnızca boşsa) ---
function seedContent() {
  const duyuruSayisi = db.prepare('SELECT COUNT(*) AS c FROM duyurular').get().c;
  if (duyuruSayisi === 0) {
    const insert = db.prepare('INSERT INTO duyurular (baslik, icerik, kategori, onemli) VALUES (?, ?, ?, ?)');
    insert.run(
      'Site Aidatları Hakkında',
      'Değerli site sakinlerimiz, Temmuz ayı aidatlarının ödenmesi için son tarih ayın 15\'idir. Ödemelerinizi site yönetim ofisinden veya banka hesabımızdan yapabilirsiniz.',
      'Aidat',
      1
    );
    insert.run(
      'Asansör Bakımı',
      'A ve B bloklarındaki asansörlerin yıllık periyodik bakımı 5 Ağustos tarihinde yapılacaktır. Bakım sırasında asansörler kısa süreli hizmet dışı kalabilir.',
      'Bakım',
      0
    );
    insert.run(
      'Site Bahçe Düzenlemesi',
      'Ortak alanlardaki peyzaj ve bahçe düzenleme çalışmaları bu hafta içinde tamamlanacaktır. Anlayışınız için teşekkür ederiz.',
      'Genel',
      0
    );
  }

  const kdSayisi = db.prepare('SELECT COUNT(*) AS c FROM kentsel_donusum').get().c;
  if (kdSayisi === 0) {
    const insert = db.prepare('INSERT INTO kentsel_donusum (baslik, icerik, durum) VALUES (?, ?, ?)');
    insert.run(
      'Kentsel Dönüşüm Süreci Başladı',
      'Sitemizin deprem yönetmeliğine uygunluğu ve kentsel dönüşüm imkanları için ilk değerlendirme çalışmaları başlatılmıştır. Sürecin her aşaması bu bölümden paylaşılacaktır.',
      'Planlama'
    );
  }
}

function init() {
  createTables();
  seedAdmin();
  seedContent();
}

// Modül olarak dışa aktar
module.exports = { db, init };

// Doğrudan çalıştırıldıysa kurulumu yap
if (require.main === module) {
  init();
  console.log('Veritabanı başarıyla hazırlandı: data/cumhuriyet.db');
}
