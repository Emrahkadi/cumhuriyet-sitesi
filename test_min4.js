const ejs = require('./node_modules/ejs');

// Test: sadece sakinToplam || 0
const t = "<%= sakinToplam || 0 %>";
try { ejs.compile(t); console.log('Test A OK'); } catch (e) { console.log('Test A:', e.message); }

// Test: real HTML attribute icinde
const t2 = '<a style="flex:1"><%= sakinToplam || 0 %></a>';
try { ejs.compile(t2); console.log('Test B OK'); } catch (e) { console.log('Test B:', e.message); }

// Test: tum satir 102
const t3 = '<a href="?tab=sakin" class="mb-tab" style="flex:1;text-align:center;padding:12px;text-decoration:none;font-weight:600;border-radius:6px;margin-bottom:-2px;color:#65676b;background:transparent;border-bottom:none">🏠 Tüm Sakinler (Blok Bazlı) — <%= sakinToplam || 0 %></a>';
try { ejs.compile(t3); console.log('Test C OK'); } catch (e) { console.log('Test C:', e.message); }

// Test: tab === 'sakin' if
const t4 = '<a href="?tab=sakin">link</a><% if (tab === \'sakin\') { %>X<% } %>';
try { ejs.compile(t4); console.log('Test D OK'); } catch (e) { console.log('Test D:', e.message); }