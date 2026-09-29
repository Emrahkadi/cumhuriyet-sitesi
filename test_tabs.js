// Test filtre & tab çalışması
const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

(async () => {
  // Tab=malik (default)
  const r1 = await get('https://cumhuriyetsitesi.org/yonetim/sakin-bilgileri?tab=malik');
  console.log('=== tab=malik ===');
  console.log('Status:', r1.status);
  console.log('Includes "Malik Listesi":', r1.body.includes('Malik Listesi'));
  console.log('Includes "Tüm Sakinler":', r1.body.includes('Tüm Sakinler'));
  console.log('Includes "Imzaladı" card:', r1.body.includes('İmzaladı'));

  // Tab=sakin
  const r2 = await get('https://cumhuriyetsitesi.org/yonetim/sakin-bilgileri?tab=sakin');
  console.log('\n=== tab=sakin ===');
  console.log('Status:', r2.status);
  console.log('Includes "İsim Soyisim":', r2.body.includes('İsim Soyisim'));
  console.log('Includes "Yeni Sakin Ekle":', r2.body.includes('Yeni Sakin Ekle'));

  // Tab=sakin + filtre
  const r3 = await get('https://cumhuriyetsitesi.org/yonetim/sakin-bilgileri?tab=sakin&sakinBlok=A&sakinAra=test');
  console.log('\n=== tab=sakin&sakinBlok=A&sakinAra=test ===');
  console.log('Status:', r3.status);

  // CSV malik
  const r4 = await get('https://cumhuriyetsitesi.org/yonetim/sakin-bilgileri/csv?tab=malik');
  console.log('\n=== CSV malik ===');
  console.log('Status:', r4.status);
  console.log('Headers (via body start):', r4.body.substring(0, 100));

  // CSV sakin
  const r5 = await get('https://cumhuriyetsitesi.org/yonetim/sakin-bilgileri/csv?tab=sakin');
  console.log('\n=== CSV sakin ===');
  console.log('Status:', r5.status);
  console.log('Body start:', r5.body.substring(0, 100));
})();