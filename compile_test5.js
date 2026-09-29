// 109-208 satırları içinde catch araması
const fs = require('fs');
const ejs = require('./node_modules/ejs');
const src = fs.readFileSync('C:/Users/PIT 170/Desktop/cumhuriyet-sitesi/views/admin/sakin-bilgileri.ejs', 'utf8');
const lines = src.split('\n');

// İlk 109 + 110. satırı tek tek ekleyerek
let partial = lines.slice(0, 109).join('\n');
for (let i = 109; i < 208; i++) {
  const next = lines[i];
  const test = partial + '\n' + next;
  try {
    ejs.compile(test, { filename: 'sakin-bilgileri.ejs' });
    partial = test;
  } catch (e) {
    console.log('HATA satır:', i + 1);
    console.log('İçerik:', next);
    console.log('Hata:', e.message);
    break;
  }
}