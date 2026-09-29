const fs = require('fs');
const ejs = require('./node_modules/ejs');
const src = fs.readFileSync('C:/Users/PIT 170/Desktop/cumhuriyet-sitesi/views/admin/sakin-bilgileri.ejs', 'utf8');

try {
  const t = new ejs.Template(src, { filename: 'sakin-bilgileri.ejs' });
  // t.template var mı?
  console.log('t keys:', Object.keys(t));
  if (t.template) console.log('Template JS:', t.template.substring(0, 2000));
} catch (e) {
  console.log('Hata:', e.message);
}