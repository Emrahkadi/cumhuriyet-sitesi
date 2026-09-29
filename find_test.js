// Test et: önce satır 109'dan SONRA sadece malik kısmı ile compile et
const fs = require('fs');
const ejs = require('./node_modules/ejs');
let src = fs.readFileSync('C:/Users/PIT 170/Desktop/cumhuriyet-sitesi/views/admin/sakin-bilgileri.ejs', 'utf8');

// Tüm <% if (tab === 'sakin') { %>...</%} else { ... kısmını kaldır, sadece malik kalsın
// Basit yöntem: dosyayı ikiye böl, malik kısmı ile dene
const lines = src.split('\n');
console.log('Toplam:', lines.length);

// Malik kısmı başlangıcını bul
let malikStart = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('MALİK LİSTESİ') || lines[i].includes('Malik Listesi')) {
    malikStart = i;
    break;
  }
}
console.log('Malik başlangıç satırı:', malikStart + 1);

// Sadece malik kısmı: önceki kısım + malik kısmı
const malikPart = lines.slice(0, malikStart).join('\n') + '\n<% /* malik */ %>';
try {
  ejs.compile(malikPart, { filename: 'sakin-bilgileri.ejs' });
  console.log('Önceki kısım OK');
} catch (e) {
  console.log('Önceki kısım HATA:', e.message);
}

// Şimdi orijinal dosyayı parça parça dene
let lo = 1, hi = lines.length;
while (lo < hi) {
  const mid = Math.floor((lo + hi + 1) / 2);
  const partial = lines.slice(0, mid).join('\n');
  try {
    ejs.compile(partial, { filename: 'sakin-bilgileri.ejs' });
    lo = mid;
  } catch (e) {
    hi = mid - 1;
  }
}
console.log('Son çalışan satır:', lo, '/', lines.length);
console.log('İlk hatalı satır içeriği:');
console.log(lines[lo]);
console.log('Önceki satır:');
console.log(lines[lo-1]);