/**
 * Ek odenek odeme kurallari (tek kaynak - import ve dogrulama script'leri bunu kullanir)
 *
 * PLAN: taksit 1 = 400 TL (KASIM 2026), 2/3/4 = 2500 TL (ARALIK 2026 / OCAK 2027 / SUBAT 2027)
 *
 * KULLANICI KURALLARI:
 *   400  -> 1 taksit (Kasim)
 *   2500 -> 1 taksit (Kasim)
 *   2900 -> 400 + 2500            = taksit 1 + 2
 *   5000 -> 2500 + 2500           = taksit 2 + 3   (Kasim + Aralik)
 *   7500 -> 2500 + 2500 + 2500   = taksit 2 + 3 + 4
 *   7900 -> 400 + 2500 + 2500 + 2500 = taksit 1 + 2 + 3 + 4 (hepsi)
 *
 * Artan tutar (or. ayni dairede ikinci 400) taksit sayilmaz -> "Fazla odeme" notu.
 */

const TAKSIL_PLAN = [
  { no: 1, tutar: 400,  donem: 'KASIM 2026 \u2013 1/4 Taksit' },
  { no: 2, tutar: 2500, donem: 'ARALIK 2026 \u2013 2/4 Taksit' },
  { no: 3, tutar: 2500, donem: 'OCAK 2027 \u2013 3/4 Taksit' },
  { no: 4, tutar: 2500, donem: '\u015eUBAT 2027 \u2013 4/4 Taksit' }
];

// Toplam tutara gore kesin kurallar
//  7900 = 400 + 2500*3 = taksit 1 + 2 + 3 + 4 (hepsi)
//  7500 = 2500*3      = taksit 2 + 3 + 4
//  5000 = 2500*2      = taksit 2 + 3  (Kasim + Aralik)
//  2900 = 400 + 2500  = taksit 1 + 2
const KURALLAR = {
  7900: [1, 2, 3, 4],
  7500: [2, 3, 4],
  5000: [2, 3],
  2900: [1, 2]
};

/**
 * Odeme kayitlarindan (tutar listesi) odenen taksitleri belirler.
 * @param {number[]} odemeTutarlari Excel'deki odeme satirlarinin tutarlari
 * @returns {{taksitler:number[], fazla:number}}
 */
function taksitleriHesapla(odemeTutarlari) {
  const toplam = odemeTutarlari.reduce((a, b) => a + b, 0);

  // Kesin kurallar
  if (KURALLAR[toplam]) return { taksitler: KURALLAR[toplam].slice(), fazla: 0 };

  const taksitler = [];
  const kullanilan = new Set();
  let fazla = 0;

  // 1) Taksit 1 (400 TL) her zaman oncelikli
  const adet400 = odemeTutarlari.filter(t => t === 400).length;
  if (adet400 > 0) { taksitler.push(1); kullanilan.add(1); }
  if (adet400 > 1) fazla += (adet400 - 1) * 400;

  // 2) 2500 TL kayitlari sirayla taksit 2, 3, 4'e yerlestirilir
  const adet2500 = odemeTutarlari.filter(t => t === 2500).length;
  for (let i = 0; i < adet2500; i++) {
    const s = [2, 3, 4].find(n => !kullanilan.has(n));
    if (s) { taksitler.push(s); kullanilan.add(s); }
    else fazla += 2500;
  }

  // 3) Kalan birlestirilmis kayitlar (2900 / 5000 / 5400 / 7500 / 7900 ...)
  //    2500 carpani ve 400 artigi hesaplanir, uygun taksitlerle eslestirilir.
  const kalanKayitlar = odemeTutarlari.filter(t => t !== 400 && t !== 2500);
  for (const kayit of kalanKayitlar) {
    const gereken2500 = Math.floor(kayit / 2500);
    const gereken400 = (kayit % 2500) === 400 ? 1 : 0;

    const adaylar = [];
    if (gereken400 && !kullanilan.has(1)) adaylar.push(1);
    for (let i = 0; i < gereken2500; i++) {
      const s = [2, 3, 4].find(n => !kullanilan.has(n));
      if (s) adaylar.push(s);
    }

    const adayToplam = adaylar.reduce((s, n) => s + TAKSIL_PLAN[n - 1].tutar, 0);
    const adaySayisiTam = adaylar.length === gereken400 + gereken2500;

    if (adaySayisiTam && adayToplam <= kayit) {
      adaylar.forEach(n => kullanilan.add(n));
      taksitler.push(...adaylar);
      fazla += kayit - adayToplam;
    } else {
      fazla += kayit;
    }
  }

  return { taksitler: taksitler.sort((a, b) => a - b), fazla };
}

/** Excel'deki bir kaydin (blok|daire) taksit haritasini dondurur */
function taksitHaritasi(odemeTutarlari) {
  const { taksitler, fazla } = taksitleriHesapla(odemeTutarlari);
  return {
    taksitler,
    fazla,
    tutar: taksitler.reduce((s, n) => s + TAKSIL_PLAN[n - 1].tutar, 0)
  };
}

module.exports = { TAKSIL_PLAN, KURALLAR, taksitleriHesapla, taksitHaritasi };
