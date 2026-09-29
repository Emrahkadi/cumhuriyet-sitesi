const fs = require('fs');
const lines = fs.readFileSync('C:/Users/PIT 170/Desktop/cumhuriyet-sitesi/views/admin/sakin-bilgileri.ejs', 'utf8').split('\n');
lines.forEach((l, i) => {
  if (/href="[^"]*\/yonetim\/sakin-bilgileri[^"]*"/.test(l)) {
    console.log((i+1) + ': ' + l.trim());
  }
});