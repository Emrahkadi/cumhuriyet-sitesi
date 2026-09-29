const fs = require('fs');
const src = fs.readFileSync('C:/Users/PIT 170/Desktop/cumhuriyet-sitesi/views/admin/sakin-bilgileri.ejs', 'utf8');
const lines = src.split('\n');
lines.forEach((line, i) => {
  // EJS <%? olmadan %> var mı?
  if (/%>/.test(line) && !/<%/.test(line.substring(0, line.indexOf('%>')))) {
    console.log((i+1) + ': ' + line);
  }
});