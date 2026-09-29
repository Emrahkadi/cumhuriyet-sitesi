// EJS tag denge kontrolü
const fs = require('fs');
const src = fs.readFileSync('C:/Users/PIT 170/Desktop/cumhuriyet-sitesi/views/admin/sakin-bilgileri.ejs', 'utf8');

// Sayım: <% ... %> (scriptlet), <%= ... %> (escape), <%- ... %> (raw)
const opens = (src.match(/<%(?![=])/g) || []).length;  // <% that is not <%=
const equals = (src.match(/<%=/g) || []).length;
const minuses = (src.match(/<%-/g) || []).length;
const closes = (src.match(/%>/g) || []).length;
console.log('Open  <%   :', opens);
console.log('Equal <%=  :', equals);
console.log('Minus <%-  :', minuses);
console.log('Total <%?  :', opens + equals + minuses);
console.log('Close %>   :', closes);
console.log('Fark       :', (opens + equals + minuses) - closes);

// Satır satır aç-kapa eşleştirme
const lines = src.split('\n');
let stack = [];
lines.forEach((line, i) => {
  let pos = 0;
  while (pos < line.length) {
    const openMatch = line.substring(pos).match(/<%(=|%)?/);
    if (!openMatch) break;
    pos += openMatch.index + openMatch[0].length;
    stack.push({ line: i+1, type: openMatch[1] || '' });
    const closeMatch = line.substring(pos).match(/%>/);
    if (!closeMatch) break;
    pos += closeMatch.index + closeMatch[0].length;
    stack.pop();
  }
});
console.log('Açık tag sayısı:', stack.length);
stack.slice(0, 10).forEach(s => console.log('  Açık:', s.line, s.type));