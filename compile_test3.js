// EJS satır satır compile - hatalı satırı bul
const fs = require('fs');
const ejs = require('./node_modules/ejs');
let src = fs.readFileSync('C:/Users/PIT 170/Desktop/cumhuriyet-sitesi/views/admin/sakin-bilgileri.ejs', 'utf8');

// Binary search: ortadan ikiye böl
function tryCompile(s) {
  try {
    ejs.compile(s, { filename: 'sakin-bilgileri.ejs' });
    return null;
  } catch (e) {
    return e.message;
  }
}

// Tüm dosya parçalar halinde dene
const lines = src.split('\n');
console.log('Toplam satır:', lines.length);

// Satır satır sil ve dene
for (let i = lines.length; i > 0; i--) {
  const partial = lines.slice(0, i).join('\n');
  const err = tryCompile(partial);
  if (err) continue;
  // Bu kısmi dosya çalışıyor, demek ki sorun i+1'den sonra
  // i satırına kadar sorun yok, demek ki sorun i+1. satırda
  console.log('Ilk hatalı satır:', i + 1);
  console.log('İçerik:', lines[i]);
  break;
}