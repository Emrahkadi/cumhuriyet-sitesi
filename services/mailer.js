/**
 * E-posta gönderme modülü (Nodemailer).
 * Ortam değişkenleri tanımlı değilse konsola yazdırır (development için).
 * Tanımlıysa SMTP üzerinden gerçek gönderim yapar.
 *
 * Ortam değişkenleri (üretimde):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *   Örn: smtp.hostinger.com / 465 / info@cumhuriyetsitesi.org / uygulama şifresi
 */
'use strict';

const nodemailer = require('nodemailer');

const yapilandirmaVar =
  process.env.SMTP_HOST &&
  process.env.SMTP_PORT &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS;

let transporter = null;
if (yapilandirmaVar) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: parseInt(process.env.SMTP_PORT, 10) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

const FROM = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@cumhuriyetsitesi.org';

/**
 * E-posta gönder. SMTP yoksa konsola yazar.
 * @param {string} to - alıcı
 * @param {string} konu
 * @param {string} html - HTML içerik
 */
async function gonder(to, konu, html) {
  if (!transporter) {
    console.log('\n=== [MAIL DEV] Konu:', konu, '===');
    console.log('Alıcı:', to);
    console.log('Gönderici:', FROM);
    console.log('İçerik:\n', html.replace(/<[^>]+>/g, ''));
    console.log('========================\n');
    return { ok: true, dev: true };
  }
  try {
    await transporter.sendMail({ from: FROM, to, subject: konu, html });
    return { ok: true };
  } catch (err) {
    console.error('E-posta gönderilemedi:', err.message);
    return { ok: false, hata: err.message };
  }
}

/**
 * 6 haneli doğrulama kodu üretir
 */
function kodUret() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

module.exports = { gonder, kodUret, yapilandirmaVar };
