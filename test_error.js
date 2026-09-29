// Sayfayı al ve hata mesajının tamamını gör
const https = require('https');

function request(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const headers = opts.headers || {};
    if (opts.cookie) headers.Cookie = opts.cookie;
    https.get({ hostname: u.hostname, path: u.pathname + u.search, headers }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    }).on('error', reject);
  });
}

function postForm(url, data, cookie) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = new URLSearchParams(data).toString();
    const req = https.request({
      hostname: u.hostname, path: u.pathname, method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        ...(cookie ? { Cookie: cookie } : {})
      }
    }, (res) => {
      let buf = '';
      res.on('data', (c) => buf += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: buf }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  // Login
  const lp = await request('https://cumhuriyetsitesi.org/giris');
  const cookie = lp.headers['set-cookie']
    ? lp.headers['set-cookie'].map(c => c.split(';')[0]).join('; ')
    : '';
  const login = await postForm('https://cumhuriyetsitesi.org/giris', {
    kullanici: 'admin', sifre: 'admin123'
  }, cookie);
  const cookie2 = login.headers['set-cookie']
    ? login.headers['set-cookie'].map(c => c.split(';')[0]).join('; ')
    : cookie;

  // Test malik
  const r = await request('https://cumhuriyetsitesi.org/yonetim/sakin-bilgileri?tab=malik', { cookie: cookie2 });
  console.log('Status:', r.status);
  console.log('Body:', r.body.substring(0, 800));
})();