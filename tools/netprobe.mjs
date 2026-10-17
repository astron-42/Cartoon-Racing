const urls = [
  'https://unpkg.com/three@0.169.0/build/three.module.js',
  'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js',
  'https://registry.npmjs.org/three'
];
for (const u of urls) {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 12000);
    const r = await fetch(u, { method: 'GET', headers: { range: 'bytes=0-15' }, signal: ctl.signal });
    clearTimeout(t);
    const txt = await r.text();
    console.log('OK ' + r.status + ' len=' + (r.headers.get('content-length') ?? '?') + ' body16=' + JSON.stringify(txt.slice(0, 16)) + ' <- ' + u);
  } catch (e) {
    console.log('FAIL ' + (e && e.message) + ' <- ' + u);
  }
}
console.log('proxy env: ' + JSON.stringify({ http: process.env.HTTP_PROXY ?? process.env.http_proxy ?? null, https: process.env.HTTPS_PROXY ?? process.env.https_proxy ?? null }));
