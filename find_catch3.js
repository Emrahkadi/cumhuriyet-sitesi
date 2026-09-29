// EJS'in parse ettiği text'i görelim
const fs = require('fs');
const ejs = require('./node_modules/ejs');

// EJS kütüphanesinde parseTemplate fonksiyonu var mı?
console.log('ejs keys:', Object.keys(ejs));

// Template.compile edilen source'u almak için
const src = fs.readFileSync('C:/Users/PIT 170/Desktop/cumhuriyet-sitesi/views/admin/sakin-bilgileri.ejs', 'utf8');
// Direkt compile et, hata verirse parse et
const opts = { filename: 'sakin-bilgileri.ejs', client: false };
try {
  ejs.compile(src, opts);
} catch (e) {
  console.log('Hatada:', e.line);
  // EJS hata satırı için ctx.parse error varsa kullan
  console.log('Parse error catch test');
  // EJS v3'te template'i parseTemplate ile parse edebiliriz
  try {
    const out = ejs.parseTemplate || ejs.Parser || null;
    if (out) {
      const p = new out(src, opts);
      console.log('parsed:', p);
    }
  } catch (e3) {
    console.log('e3:', e3.message);
  }
}