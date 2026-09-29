const fs = require('fs');
const ejs = require('./node_modules/ejs');
let src = fs.readFileSync('views/admin/sakin-bilgileri.ejs', 'utf8');
const lines = src.split('\n');
const part106 = lines.slice(0, 106).join('\n');
try { ejs.compile(part106, { filename: 's' }); console.log('106 OK'); } catch (e) { console.log('106 HATA:', e.message); }
const part107 = part106 + '\n' + lines[106];
try { ejs.compile(part107, { filename: 's' }); console.log('107 OK'); } catch (e) { console.log('107 HATA:', e.message); }