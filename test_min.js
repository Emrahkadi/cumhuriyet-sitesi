// Minimal test
const fs = require('fs');
const ejs = require('./node_modules/ejs');

// Sadece "if/else" yapısı
const t1 = `<% if (x) { %>A<% } else { %>B<% } %>`;
try { ejs.compile(t1, { filename: 't' }); console.log('t1 OK'); } catch (e) { console.log('t1 HATA:', e.message); }

// EJS include
const t2 = `<% if (x) { %><%- include('p') %><% } else { %>B<% } %>`;
try { ejs.compile(t2, { filename: 't' }); console.log('t2 OK'); } catch (e) { console.log('t2 HATA:', e.message); }

// Bizim gerçek yapı: tabs + if
const t3 = `<% if (tab === 'malik') { %><%- include('partials/header', { sayfaBaslik: 'X' }) %><% } %>`;
try { ejs.compile(t3, { filename: 't' }); console.log('t3 OK'); } catch (e) { console.log('t3 HATA:', e.message); }

// include + nested
const t4 = `<%- include('partials/header', { sayfaBaslik: 'X' }) %>
<% if (tab === 'sakin') { %><%- include('partials/sakin-tablosu') %><% } else { %>OTHER<% } %>`;
try { ejs.compile(t4, { filename: 't' }); console.log('t4 OK'); } catch (e) { console.log('t4 HATA:', e.message); }

// partial dosyasının içeriği önemli mi?
const sakinPartial = fs.readFileSync('C:/Users/PIT 170/Desktop/cumhuriyet-sitesi/views/admin/partials/sakin-tablosu.ejs', 'utf8');
try {
  ejs.compile(sakinPartial, { filename: 'sakin-tablosu' });
  console.log('sakin-tablosu partial OK');
} catch (e) {
  console.log('sakin-tablosu partial HATA:', e.message);
}