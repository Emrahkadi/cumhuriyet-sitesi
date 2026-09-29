// İç içe template ile sorun var. server.js'i değiştir: tablo içeriğini HTML string olarak hazırla,
// sonra view'a gönder. EJS bunu güvenle render edebilir.

// Daha basit çözüm: sakinler tablosunu server-side render et, sonra EJS'e hazır HTML ver.
const fs = require('fs');
const path = require('path');
const ejs = require(path.join(__dirname, 'node_modules', 'ejs', 'lib', 'ejs.js'));

// TemplateText içinde ne var görelim
const src = fs.readFileSync('C:/Users/PIT 170/Desktop/cumhuriyet-sitesi/views/admin/sakin-bilgileri.ejs', 'utf8');

// 109. satırdan itibaren "<% if (tab === 'sakin') { %>" içeriğini al
const lines = src.split('\n');
const section = lines.slice(108, 200).join('\n');
console.log('=== 109-200 arası ===');
console.log(section);