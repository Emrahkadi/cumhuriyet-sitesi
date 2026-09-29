const ejs = require('./node_modules/ejs');

// Test 1: minimal if
try {
  ejs.compile("<% if (tab === 'sakin') { %>A<% } else { %>B<% } %>", { filename: 's' });
  console.log('Test 1 OK');
} catch (e) {
  console.log('Test 1:', e.message);
}

// Test 2: 106 satırlık dosyamın son kısmını al
const fs = require('fs');
const src = fs.readFileSync('views/admin/sakin-bilgileri.ejs', 'utf8');
const lines = src.split('\n');

// 107 + </div> + if
const test = "</div>\n\n<% if (tab === 'sakin') { %>A<% } else { %>B<% } %>";
try { ejs.compile(test, { filename: 's' }); console.log('Test 2 OK'); } catch (e) { console.log('Test 2:', e.message); }

// Test 3: gerçek dosyadan satır 0-107
const test3 = lines.slice(0, 107).join('\n');
try { ejs.compile(test3, { filename: 's' }); console.log('Test 3 OK'); } catch (e) { console.log('Test 3:', e.message); }

// Test 4: sadece satır 0-106 (OK)
const test4 = lines.slice(0, 106).join('\n');
try { ejs.compile(test4, { filename: 's' }); console.log('Test 4 OK'); } catch (e) { console.log('Test 4:', e.message); }

// Test 5: 106 + minimal if
const test5 = lines.slice(0, 106).join('\n') + '\n<% if (true) { %>X<% } %>';
try { ejs.compile(test5, { filename: 's' }); console.log('Test 5 OK'); } catch (e) { console.log('Test 5:', e.message); }

// Test 6: 106 + if (tab === 'sakin') basit
const test6 = lines.slice(0, 106).join('\n') + '\n<% if (tab === "sakin") { %>X<% } %>';
try { ejs.compile(test6, { filename: 's' }); console.log('Test 6 OK'); } catch (e) { console.log('Test 6:', e.message); }