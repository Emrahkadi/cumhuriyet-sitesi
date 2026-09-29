const fs = require('fs');
const path = require('path');
const ejs = require(path.join(__dirname, 'node_modules', 'ejs', 'lib', 'ejs.js'));
const src = fs.readFileSync('C:/Users/PIT 170/Desktop/cumhuriyet-sitesi/views/admin/sakin-bilgileri.ejs', 'utf8');
const t = new ejs.Template(src, { filename: 'sakin-bilgileri.ejs' });
fs.writeFileSync('C:/Users/PIT 170/Desktop/cumhuriyet-sitesi/generated.js', t.source);
console.log('OK, dosya:', 'C:\\Users\\PIT 170\\Desktop\\cumhuriyet-sitesi\\generated.js');
// catch geçen satırlar
const lines = t.source.split('\n');
lines.forEach((l, i) => {
  if (/catch/i.test(l)) console.log((i+1) + ': ' + l.substring(0, 200));
});