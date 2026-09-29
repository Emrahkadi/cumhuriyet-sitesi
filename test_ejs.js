// EJS template syntax check
const ejs = require('ejs');
const fs = require('fs');

const template = fs.readFileSync('C:/Users/PIT 170/Desktop/cumhuriyet-sitesi/views/admin/sakin-bilgileri.ejs', 'utf8');

try {
  ejs.compile(template, { filename: 'sakin-bilgileri.ejs' });
  console.log('OK');
} catch (e) {
  console.log('HATA:', e.message);
  console.log('Line:', e.line || 'bilinmiyor');
}