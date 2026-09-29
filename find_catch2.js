const fs = require('fs');
const src = fs.readFileSync('C:/Users/PIT 170/Desktop/cumhuriyet-sitesi/views/admin/sakin-bilgileri.ejs', 'utf8');
// EJS compile edilen gerçek JS'i alalım
const ejs = require('./node_modules/ejs');
try {
  ejs.compile(src, { filename: 'sakin-bilgileri.ejs' });
} catch (e) {
  // Generate the source up to error location
  // EJS'in compile methodundan source string al
  try {
    const Template = ejs.Template || ejs;
    const t = new ejs.Template(src, { filename: 'sakin-bilgileri.ejs' });
    console.log('Source:', t.source || 'yok');
    console.log('parse hata mesajı:', t.message);
  } catch (e2) {
    console.log('e2:', e2.message);
  }
  console.log('stack:', e.stack.split('\n').slice(0, 5).join('\n'));
}