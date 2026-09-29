// EJS compile hata satırı bulucu
const fs = require('fs');
const path = require('path');

// EJS modülünü yükle (proje node_modules'tan)
const Module = require('module');
const ejsPath = path.join(__dirname, 'node_modules', 'ejs');
let ejs;
try { ejs = require(ejsPath); } catch (e) {
  console.log('ejs modülü bulunamadı, npm install gerekli:', e.message);
  process.exit(0);
}

const src = fs.readFileSync('C:/Users/PIT 170/Desktop/cumhuriyet-sitesi/views/admin/sakin-bilgileri.ejs', 'utf8');
try {
  ejs.compile(src, { filename: 'sakin-bilgileri.ejs' });
  console.log('OK');
} catch (e) {
  console.log('HATA:', e.message);
  if (e.line) console.log('Line:', e.line);
}