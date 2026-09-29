// Admin login + sayfa testi
const https = require('https');

function request(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const headers = opts.headers || {};
    if (opts.cookie) headers.Cookie = opts.cookie;
    https.get({
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers
    }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body,
        location: res.headers.location
      }));
    }).on('error', reject);
  });
}

function postForm(url, data, cookie) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = new URLSearchParams(data).toString();
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        ...(cookie ? { Cookie: cookie } : {})
      }
    }, (res) => {
      let buf = '';
      res.on('data', (c) => buf += c);
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: buf,
        setCookie: res.headers['set-cookie']
      }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  // 1) GET /giris -> cookie al
  const loginPage = await request('https://cumhuriyetsitesi.org/giris');
  const cookie = loginPage.headers['set-cookie']
    ? loginPage.headers['set-cookie'].map(c => c.split(';')[0]).join('; ')
    : '';
  console.log('Giris sayfasi status:', loginPage.status, 'cookie:', cookie ? 'OK' : 'yok');

  // 2) Login form
  const login = await postForm('https://cumhuriyetsitesi.org/giris', {
    kullanici: 'admin',
    sifre: 'admin123'
  }, cookie);
  console.log('Login status:', login.status, 'location:', login.location);
  const cookie2 = login.setCookie
    ? login.setCookie.map(c => c.split(';')[0]).join('; ')
    : cookie;
  console.log('Session cookie:', cookie2 ? 'OK' : 'yok');

  // 3) Test pages with session
  const pages = [
    '/yonetim/sakin-bilgileri?tab=malik',
    '/yonetim/sakin-bilgileri?tab=sakin',
    '/yonetim/sakin-bilgileri?tab=sakin&sakinBlok=A',
    '/yonetim/sakin-bilgileri?tab=malik&blok=A&durum=Imzaladi',
    '/yonetim/sakin-bilgileri/csv?tab=sakin',
    '/yonetim/sakin-bilgileri/csv?tab=malik'
  ];
  for (const p of pages) {
    const r = await request('https://cumhuriyetsitesi.org' + p, { cookie: cookie2 });
    const head = r.body.substring(0, 80).replace(/\n/g, ' | ');
    console.log(p, '->', r.status, '|', head);
  }
})();