const fs = require('fs');
const ejs = require('./node_modules/ejs');
const src = fs.readFileSync('C:/Users/PIT 170/Desktop/cumhuriyet-sitesi/views/admin/sakin-bilgileri.ejs', 'utf8');

try {
  const t = new ejs.Template(src, { filename: 'sakin-bilgileri.ejs' });
  // t.templateText var
  console.log('Template generated:');
  console.log(t.templateText);
  // source da kalsin
  console.log('\n--- source ---');
  console.log(t.source ? t.source.substring(0, 500) : 'yok');
} catch (e) {
  console.log('Hata:', e.message);
}