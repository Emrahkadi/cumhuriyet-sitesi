const fs = require('fs');
const src = fs.readFileSync('C:/Users/PIT 170/Desktop/cumhuriyet-sitesi/views/admin/sakin-bilgileri.ejs', 'utf8');
const lines = src.split('\n');
lines.forEach((l, i) => {
  if (/catch/i.test(l)) console.log((i+1) + ': ' + l);
});