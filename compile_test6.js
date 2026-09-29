// EJS'in compile methodunun parse edip nerede hata verdiğini bul
const fs = require('fs');
const path = require('path');

// Force yükle (sadece runtime parse için)
const ejsPath = path.join(__dirname, 'node_modules', 'ejs', 'lib', 'ejs.js');
const ejs = require(ejsPath);
const src = fs.readFileSync('C:/Users/PIT 170/Desktop/cumhuriyet-sitesi/views/admin/sakin-bilgileri.ejs', 'utf8');

// Template objesi oluşturup compile et
const t = new ejs.Template(src, { filename: 'sakin-bilgileri.ejs' });
try {
  t.compile();
  console.log('OK');
} catch (e) {
  console.log('Hata:', e.message);
  console.log('Line:', e.line);
  console.log('Source length:', t.source.length);
  // source'u satır satır göster
  const lines = t.source.split('\n');
  console.log('Toplam satır:', lines.length);
  // hata line'ına yakın
  if (e.line) {
    for (let i = Math.max(0, e.line - 5); i < Math.min(lines.length, e.line + 5); i++) {
      console.log((i+1) + ':', lines[i]);
    }
  }
}