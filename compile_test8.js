// EJS'te generated source'u new Function ile parse et
const fs = require('fs');
const path = require('path');
const ejs = require(path.join(__dirname, 'node_modules', 'ejs', 'lib', 'ejs.js'));
const src = fs.readFileSync('C:/Users/PIT 170/Desktop/cumhuriyet-sitesi/views/admin/sakin-bilgileri.ejs', 'utf8');
const t = new ejs.Template(src, { filename: 'sakin-bilgileri.ejs' });
try {
  new Function('locals', t.source);
  console.log('OK Function');
} catch (e) {
  console.log('Function hata:', e.message);
  // Function error'da line/column var
  console.log('Stack:', e.stack);
}