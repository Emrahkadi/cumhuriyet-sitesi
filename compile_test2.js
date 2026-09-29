// catch tokeni nerede?
const fs = require('fs');
const ejs = require('./node_modules/ejs');
const src = fs.readFileSync('C:/Users/PIT 170/Desktop/cumhuriyet-sitesi/views/admin/sakin-bilgileri.ejs', 'utf8');

// EJS tüm tag'leri text'e çevirip sonra JS olarak parse etmeyi dene
// Önce hangi satırda sorun var bul
const lines = src.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // EJS template'in generated JS'inde "catch" görünmemesi gereken yer
  // "<% sakinler.forEach(function(s){ %>" gibi inline fonksiyonlar OK
  // ama "<% try { %>" gibi try/catch template'te yasak
  if (/\bcatch\b/.test(line) && /<%/.test(line)) {
    console.log((i+1) + ': ' + line);
  }
  if (/\btry\b/.test(line) && /<%/.test(line)) {
    console.log('TRY ' + (i+1) + ': ' + line);
  }
  if (/\bawait\b/.test(line) && /<%/.test(line)) {
    console.log('AWAIT ' + (i+1) + ': ' + line);
  }
}