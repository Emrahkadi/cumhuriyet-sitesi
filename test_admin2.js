// Doğru login URL'i bul
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
        body
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
        body: buf
      }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  // Login sayfasini cek
  const lp = await request('https://cumhuriyetsitesi.org/giris');
  console.log('/giris status:', lp.status);
  // Form action'ini bul
  const m = lp.body.match(/<form[^>]*action="([^"]+)"/);
  console.log('Form action:', m ? m[1] : 'bulunamadi');
  // Input name'leri bul
  const inputs = [...lp.body.matchAll(/<input[^>]*name="([^"]+)"/g)].map(x => x[1]);
  console.log('Input names:', inputs);
})();