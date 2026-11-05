// Excel (xlsx) dosyasini ZIP acip sheet XML'ini okur (x: namespace destekli)
const fs = require('fs');
const zlib = require('zlib');

const file = process.argv[2];

function readZip(buf) {
  const entries = {};
  let offset = 0;
  while (offset < buf.length - 4) {
    if (buf.readUInt32LE(offset) !== 0x04034b50) break;
    const method = buf.readUInt16LE(offset + 8);
    const compSize = buf.readUInt32LE(offset + 18);
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const name = buf.toString('utf8', offset + 30, offset + 30 + nameLen);
    const dataStart = offset + 30 + nameLen + extraLen;
    const data = buf.slice(dataStart, dataStart + compSize);
    entries[name] = method === 0 ? data : zlib.inflateRawSync(data);
    offset = dataStart + compSize;
  }
  return entries;
}

function decodeXml(s) {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&amp;/g, '&');
}

function colToNum(col) {
  let n = 0;
  for (const ch of col) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

function parseSheet(xml) {
  const rows = [];
  const rowRe = /<(?:\w+:)?row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/(?:\w+:)?row>/g;
  let m;
  while ((m = rowRe.exec(xml))) {
    const rIdx = +m[1];
    const cells = {};
    const cellRe = /<(?:\w+:)?c([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g;
    let cm;
    while ((cm = cellRe.exec(m[2]))) {
      const attrs = cm[1] || '';
      const inner = cm[2] || '';
      const ref = (attrs.match(/\br="([A-Z]+)(\d+)"/) || [])[1];
      if (!ref) continue;
      const t = (attrs.match(/\bt="([^"]+)"/) || [])[1];
      let val = null;
      if (t === 'inlineStr') {
        const parts = [];
        const tRe = /<(?:\w+:)?t[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g;
        let tm;
        while ((tm = tRe.exec(inner))) parts.push(decodeXml(tm[1]));
        val = parts.join('');
      } else {
        const v = inner.match(/<(?:\w+:)?v[^>]*>([\s\S]*?)<\/(?:\w+:)?v>/);
        val = v ? decodeXml(v[1]) : '';
      }
      cells[ref] = val === null ? '' : val;
    }
    rows[rIdx] = cells;
  }
  return rows;
}

const zip = readZip(fs.readFileSync(file));

const wbx = zip['xl/workbook.xml'] ? zip['xl/workbook.xml'].toString('utf8') : '';
const sheetDefs = [...wbx.matchAll(/<(?:\w+:)?sheet[^>]*name="([^"]*)"[^>]*r:id="([^"]+)"/g)]
  .map(s => ({ name: decodeXml(s[1]), rid: s[2] }));
const relsXml = zip['xl/_rels/workbook.xml.rels'] ? zip['xl/_rels/workbook.xml.rels'].toString('utf8') : '';
const relMap = {};
for (const r of relsXml.matchAll(/<(?:\w+:)?Relationship[^>]*?Id="([^"]+)"[^>]*?Target="([^"]+)"/g)) relMap[r[1]] = r[2];
for (const r of relsXml.matchAll(/<(?:\w+:)?Relationship[^>]*?Target="([^"]+)"[^>]*?Id="([^"]+)"/g)) relMap[r[2]] = r[1];

console.log('SHEETS:', JSON.stringify(sheetDefs.map(s => s.name)));

const out = {};
sheetDefs.forEach((s, idx) => {
  let target = (relMap[s.rid] || '').replace(/^\/?xl\//, '').replace(/^\//, '');
  let key = 'xl/' + target;
  if (!zip[key]) key = 'xl/worksheets/sheet' + (idx + 1) + '.xml';
  if (!zip[key]) { console.log('!! eksik sheet:', s.name, s.rid, target, '| keys:', Object.keys(zip).join(',')); return; }
  const rows = parseSheet(zip[key].toString('utf8'));
  out[s.name] = rows;
  console.log('SHEET[' + idx + ']: "' + s.name + '" -> ' + key + ' | satirlar: ' + rows.length);
});

const limit = +(process.argv[3] || 12);
for (const name of Object.keys(out)) {
  console.log('\n##### ' + name + ' (ilk ' + limit + ' satir) #####');
  out[name].slice(0, limit).forEach((r, i) => {
    if (!r) return;
    const cells = Object.keys(r).sort((a, b) => colToNum(a) - colToNum(b)).map(c => c + '=' + JSON.stringify(r[c]));
    console.log('R' + (i + 1) + ': ' + cells.join(' | '));
  });
}

if (process.argv[4] === '--json') {
  fs.writeFileSync(process.argv[5] || 'odeme-excel.json', JSON.stringify(out, null, 2));
  console.log('\nJSON yazildi: ' + (process.argv[5] || 'odeme-excel.json'));
}
