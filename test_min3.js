const fs = require('fs');
const ejs = require('./node_modules/ejs');
const src = fs.readFileSync('views/admin/sakin-bilgileri.ejs', 'utf8');
const lines = src.split('\n');

// Satır 0-1: sadece include
const t1 = lines.slice(0, 1).join('\n');
try { ejs.compile(t1); console.log('sadece include OK'); } catch (e) { console.log('sadece include:', e.message); }

// + style
const t2 = lines.slice(0, 70).join('\n');
try { ejs.compile(t2); console.log('+style OK'); } catch (e) { console.log('+style:', e.message); }

// + style sonu
const t3 = lines.slice(0, 73).join('\n');
try { ejs.compile(t3); console.log('+style end OK'); } catch (e) { console.log('+style end:', e.message); }

// + istatistik kartları
const t4 = lines.slice(0, 95).join('\n');
try { ejs.compile(t4); console.log('+istatistik OK'); } catch (e) { console.log('+istatistik:', e.message); }

// + tabs başlangıcı
const t5 = lines.slice(0, 100).join('\n');
try { ejs.compile(t5); console.log('+tabs OK'); } catch (e) { console.log('+tabs:', e.message); }

// + tabs devamı
const t6 = lines.slice(0, 107).join('\n');
try { ejs.compile(t6); console.log('+tabs devam OK'); } catch (e) { console.log('+tabs devam:', e.message); }