/**
 * Site_Odeme_Listesi.xlsx -> ek_odenek_taksitler odemelerini isaretler
 *
 * KURALLAR (kullanici onayi ile):
 *  - 400 TL  -> 1. taksit (KASIM 2026) odendi
 *  - 2500 TL -> 2. taksit (ARALIK 2026) odendi  [kullanici: "2500 olanlar Kasim"]
 *  - 2900 TL -> 1. taksit (400) + 2. taksit (2500) odendi
 *  - 5000 TL -> 2. taksit (2500 Kasim) + 3. taksit (2500 Aralik) odendi
 *  - 7500 TL -> 2 + 3 + 4 taksit (2500 x3) odendi
 *  - 7900 TL -> 1+2+3+4 taksit (hepsi) odendi
 *  - Ayni dairede ikinci 400 varsa: fazla odeme -> aciklama, taksit sayilmaz
 *  - Odeme tarihi: Excel kaynagi fotograf bazli oldugu icin bugunun tarihi
 */
const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();
const { TAKSIL_PLAN, taksitleriHesapla } = require('./odeme-kurallari');

const EXCEL_JSON = process.argv[2] || 'odeme-excel.json';
const DRY_RUN = process.argv.includes('--dry-run');
// --reset: plandaki tum "odendi" isaretlerini temizler, sonra Excel'den yeniden isaretler
const RESET = process.argv.includes('--reset');
const ODEME_TARIHI = process.argv.find(a => a.startsWith('--tarih='))?.split('=')[1]
  || new Date().toISOString().slice(0, 10);

const norm = s => String(s || '').trim();
const upper = s => norm(s).toLocaleUpperCase('tr-TR');

const d = JSON.parse(fs.readFileSync(EXCEL_JSON, 'utf8'));
const keys = Object.keys(d);
const listeKey = keys.find(k => /Listesi/i.test(k)) || keys[0];
const kontrolKey = keys.find(k => /Kontrol/i.test(k));

// --- Kontrol sayfasindaki el yazisi uyarilari (blok|daire -> not) ---
const kontrolNotlari = new Map();
if (kontrolKey) {
  d[kontrolKey].forEach(r => {
    if (!r || !r.A || !r.B || !r.H) return;
    const k = `${upper(r.A)}|${norm(r.B)}`;
    if (!kontrolNotlari.has(k)) kontrolNotlari.set(k, []);
    kontrolNotlari.get(k).push(norm(r.H));
  });
}
console.log('Kontrol uyarilari:', kontrolNotlari.size, 'daire icin');

// --- Excel kayitlarini blok|daire -> [{tutar, kaynak}] olarak grupla ---
const groups = new Map();
d[listeKey].filter(r => r && r.D && upper(r.D) && upper(r.D) !== 'BLOK').forEach(r => {
  const b = upper(r.D);
  const daire = norm(r.E);
  const tutar = Number(r.F) || 0;
  if (!groups.has(b)) groups.set(b, new Map());
  const m = groups.get(b);
  if (!m.has(daire)) m.set(daire, []);
  m.get(daire).push({ tutar, kaynak: norm(r.A) });
});

// --- Odeme planini taksit sirasiyla (400, 2500, 2500, 2500) olustur ---
// Taksit 1 = 400 (KASIM), 2 = 2500 (ARALIK), 3 = 2500 (OCAK), 4 = 2500 (SUBAT)
// Kurallar ve donem metinleri scripts/odeme-kurallari.js modulunde.

(async () => {
  const p = new Pool({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL });

  // Plan
  const planRow = (await p.query(
    'SELECT * FROM ek_odenek_planlar ORDER BY id DESC LIMIT 1'
  )).rows[0];
  if (!planRow) throw new Error('Ek odenek plani bulunamadi');
  console.log(`PLAN: #${planRow.id} "${planRow.ad}" tutarlar=${planRow.tutarlar} donem_basi=${planRow.donem_basi}`);

  // Sakinler
  const sakinler = (await p.query(
    `SELECT id, blok, daire, isim_soyisim FROM sakinler
     WHERE UPPER(COALESCE(TRIM(blok),'')) <> 'TOPLAM'
       AND UPPER(COALESCE(TRIM(daire),'')) <> 'TOPLAM'`
  )).rows;

  const sakinMap = new Map();
  sakinler.forEach(s => {
    const k = `${upper(s.blok)}|${norm(s.daire)}`;
    if (!sakinMap.has(k)) sakinMap.set(k, []);
    sakinMap.get(k).push(s);
  });

  // Mevcut odeme durumu (bu planda)
  const mevcut = (await p.query(
    'SELECT id, malik_id, taksit_no, tutar, odendi FROM ek_odenek_taksitler WHERE plan_id = $1',
    [planRow.id]
  )).rows;
  const mevcutMap = new Map();
  mevcut.forEach(t => {
    if (!mevcutMap.has(t.malik_id)) mevcutMap.set(t.malik_id, {});
    mevcutMap.get(t.malik_id)[t.taksit_no] = t;
  });

  // --reset: once tum isaretleri temizle (Excel listesinde olmayan odemeleri de kaldirir)
  const temizlenecek = mevcut.filter(t => t.odendi === 1);
  if (RESET && !DRY_RUN) {
    await p.query(
      `UPDATE ek_odenek_taksitler SET odendi = 0, odeme_tarihi = NULL, aciklama = NULL
       WHERE plan_id = $1 AND odendi = 1`,
      [planRow.id]
    );
    console.log(`RESET: ${temizlenecek.length} odeme isareti temizlendi`);
    temizlenecek.forEach(t => { const m = mevcutMap.get(t.malik_id)[t.taksit_no]; m.odendi = 0; });
  } else if (RESET) {
    console.log(`RESET (dry-run): ${temizlenecek.length} odeme isareti temizlenecek`);
  }

  console.log(`Sakin: ${sakinler.length} | planda taksit kaydi: ${mevcut.length}`);

  const guncellemeler = [];
  const eslesmeyen = [];
  const cokluSakin = [];
  const kontrolUyarilari = [];
  const istatistik = { toplamDaire: 0, taksit1: 0, taksit2: 0, taksit3: 0, taksit4: 0, fazlaOdeme: 0 };

  for (const [blok, daireMap] of groups) {
    for (const [daire, odemeler] of daireMap) {
      const k = `${blok}|${daire}`;
      const adaylar = sakinMap.get(k);
      if (!adaylar || adaylar.length === 0) {
        eslesmeyen.push(`${k} (${odemeler.map(o => o.tutar).join('+')})`);
        continue;
      }
      if (adaylar.length > 1) cokluSakin.push(`${k} -> ${adaylar.length} kayit`);
      const malik = adaylar[0];

      const tutarlar = odemeler.map(o => o.tutar);
      const { taksitler, fazla } = taksitleriHesapla(tutarlar);
      istatistik.toplamDaire++;

      const aciklamaParcalar = [];
      const kaynaklar = [...new Set(odemeler.map(o => o.kaynak).filter(Boolean))];
      if (kaynaklar.length) aciklamaParcalar.push(`Kaynak: ${kaynaklar.join(', ')}`);

      // Kontrol sayfasindaki el yazisi uyarisi (varsa)
      const uyarilar = kontrolNotlari.get(k);
      if (uyarilar && uyarilar.length) {
        aciklamaParcalar.push(...uyarilar);
        kontrolUyarilari.push(`${k}: ${uyarilar.join(' ')}`);
      }

      taksitler.forEach(no => {
        istatistik['taksit' + no]++;
        const mevcutTaksit = (mevcutMap.get(malik.id) || {})[no];
        if (mevcutTaksit) {
          if (mevcutTaksit.odendi === 1 && !RESET) return; // zaten odendi
          guncellemeler.push({
            tip: 'update',
            id: mevcutTaksit.id,
            malik_id: malik.id,
            taksit_no: no,
            tutar: TAKSIL_PLAN[no - 1].tutar,
            aciklama: aciklamaParcalar.join(' | ')
          });
        } else {
          guncellemeler.push({
            tip: 'insert',
            malik_id: malik.id,
            taksit_no: no,
            tutar: TAKSIL_PLAN[no - 1].tutar,
            aciklama: aciklamaParcalar.join(' | ')
          });
        }
      });

      if (fazla > 0) {
        istatistik.fazlaOdeme++;
        aciklamaParcalar.push(`Fazla odeme: ${fazla} TL`);
        // Fazla odemeyi ilgili taksidin aciklamasina ekle
        taksitler.forEach(no => {
          const g = guncellemeler.find(x => x.malik_id === malik.id && x.taksit_no === no
            && (x.tip === 'insert' || (x.tip === 'update' && x.id === (mevcutMap.get(malik.id) || {})[no]?.id)));
          if (g) g.aciklama = aciklamaParcalar.join(' | ');
        });
      }
    }
  }

  console.log('\n=== ISTATISTIK ===');
  console.log(JSON.stringify(istatistik, null, 1));
  console.log('Islem sayisi:', guncellemeler.length);
  console.log('Eslesmeyen:', eslesmeyen.length, eslesmeyen.length ? eslesmeyen : '');
  console.log('Coklu sakin:', cokluSakin.length, cokluSakin.length ? cokluSakin : '');

  // Detay: ornek 10 satir
  console.log('\n=== ORNEK ISLEMLER (ilk 12) ===');
  guncellemeler.slice(0, 12).forEach(g => {
    const s = sakinler.find(x => x.id === g.malik_id);
    console.log(`  #${s.blok}/${s.daire} ${s.isim_soyisim || '(isimsiz)'} | taksit ${g.taksit_no} ${g.tutar} TL | ${g.tip} | ${g.aciklama}`);
  });

  if (DRY_RUN) {
    console.log('\n[DRY-RUN] Veritabanina yazilmadi.');
    await p.end();
    return;
  }

  // --- Uygula ---
  console.log('\n=== UYGULANIYOR ===');
  await p.query('BEGIN');

  try {
    let ins = 0, upd = 0;
    for (const g of guncellemeler) {
      if (g.tip === 'insert') {
        await p.query(
          `INSERT INTO ek_odenek_taksitler (plan_id, malik_id, taksit_no, donem, tutar, odendi, odeme_tarihi, aciklama)
           VALUES ($1,$2,$3,$4,$5,1,$6,$7)`,
          [planRow.id, g.malik_id, g.taksit_no, TAKSIL_PLAN[g.taksit_no - 1].donem, g.tutar, ODEME_TARIHI, g.aciklama || '']
        );
        ins++;
      } else {
        await p.query(
          `UPDATE ek_odenek_taksitler
           SET odendi = 1, odeme_tarihi = $2, tutar = $3, aciklama = COALESCE(NULLIF($4,''), aciklama)
           WHERE id = $1`,
          [g.id, ODEME_TARIHI, g.tutar, g.aciklama || '']
        );
        upd++;
      }
    }
    await p.query('COMMIT');
    console.log(`Eklendi: ${ins} | Guncellendi: ${upd}`);
  } catch (e) {
    await p.query('ROLLBACK');
    throw e;
  }

  // --- Dogrulama ---
  const v = await p.query(
    `SELECT t.taksit_no, count(*) adet, sum(t.tutar) toplam
     FROM ek_odenek_taksitler t WHERE t.plan_id = $1 AND t.odendi = 1
     GROUP BY 1 ORDER BY 1`,
    [planRow.id]
  );
  console.log('\n=== DOGRULAMA: odenen taksitler ===');
  v.rows.forEach(r => console.log(`  taksit ${r.taksit_no}: ${r.adet} odeme | ${r.toplam} TL`));

  const toplam = await p.query(
    `SELECT count(*) adet, sum(tutar) toplam FROM ek_odenek_taksitler
     WHERE plan_id = $1 AND odendi = 1`,
    [planRow.id]
  );
  console.log(`TOPLAM: ${toplam.rows[0].adet} taksit | ${toplam.rows[0].toplam} TL`);

  await p.end();
})().catch(e => { console.error('HATA:', e.message); process.exit(1); });
