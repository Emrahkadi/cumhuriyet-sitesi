// 109'dan sonraki hatayı bul
const fs = require('fs');
const ejs = require('./node_modules/ejs');
const src = fs.readFileSync('C:/Users/PIT 170/Desktop/cumhuriyet-sitesi/views/admin/sakin-bilgileri.ejs', 'utf8');
const lines = src.split('\n');

// İlk 108 satır + 109-208
function tryCompileRange(end) {
  const partial = lines.slice(0, end).join('\n');
  try {
    ejs.compile(partial, { filename: 'sakin-bilgileri.ejs' });
    return true;
  } catch (e) {
    return e.message;
  }
}

// Binary search between 109 and 408
let lo = 109, hi = 408;
while (lo < hi) {
  const mid = Math.floor((lo + hi + 1) / 2);
  const r = tryCompileRange(mid);
  if (r === true) {
    lo = mid;
  } else {
    hi = mid - 1;
  }
}
console.log('Son çalışan satır sayısı:', lo);
console.log('İlk hatalı satır:', lo + 1);
console.log('İçerik:', lines[lo]);
console.log('Önceki:', lines[lo-1]);
console.log('Sonraki:', lines[lo+1]);