const fs = require('fs');
const ejs = require('./node_modules/ejs');
let src = fs.readFileSync('views/admin/sakin-bilgileri.ejs', 'utf8');
const lines = src.split('\n');

// 106 + sadece 107
const part = lines.slice(0, 107).join('\n');
console.log('=== 107. satır ===');
console.log(JSON.stringify(lines[106]));

// Sadece o satırı farklı yaz
const altPart = lines.slice(0, 106).join('\n') + '\n<% if (tab === "sakin") { %>';
try { ejs.compile(altPart, { filename: 's' }); console.log('çift tırnak OK'); } catch (e) { console.log('çift tırnak HATA:', e.message); }

// Tek tırnak ile
const altPart2 = lines.slice(0, 106).join('\n') + '\n<% if (tab===\'sakin\') { %>';
try { ejs.compile(altPart2, { filename: 's' }); console.log('tek tırnak OK'); } catch (e) { console.log('tek tırnak HATA:', e.message); }