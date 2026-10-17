import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = process.argv[2];
const PROF = process.argv[3];
const RIGHTS = parseInt(process.argv[4] || '0', 10);
const TAG = process.argv[5] || 'shot';
const PORT = parseInt(process.argv[6] || '9340', 10);
const OUT = 'D:/DSH-projects/paper-racing/shots/' + TAG + '.json';
let result = { tag: TAG, url: URL, status: 'start' };
const finish = (code) => {
  try { writeFileSync(OUT, JSON.stringify(result, null, 1)); } catch (e) {}
  const d = String(result.diag || '');
  const pick = k => { const m = new RegExp(k + '=([-0-9]+)').exec(d); return m ? m[1] : '-'; };
  console.log('TAG=' + TAG + ' status=' + result.status + ' cap=' + JSON.stringify(result.cap || '') + ' mt=' + pick('mt') + ' tt=' + pick('tt') + ' mm=' + pick('mm') + ' msig=' + pick('msig'));
};
process.on('uncaughtException', e => { result.status = 'uncaught:' + String(e).slice(0, 200); finish(1); process.exit(1); });
process.on('unhandledRejection', e => { result.status = 'rejected:' + String(e).slice(0, 200); finish(1); process.exit(1); });
const chrome = spawn(CHROME, ['--headless=new','--no-sandbox','--disable-gpu','--enable-unsafe-swiftshader',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROF, '--window-size=1280,720', 'about:blank'], { stdio: 'ignore' });
async function target() {
  for (let i = 0; i < 60; i++) {
    try { const list = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
      const p = list.find(t => t.type === 'page'); if (p && p.webSocketDebuggerUrl) return p; } catch (e) {}
    await new Promise(r => setTimeout(r, 400));
  }
  return null;
}
const t = await target();
if (!t) { result.status = 'no-target'; finish(1); process.exit(1); }
const ws = new WebSocket(t.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
const send = (m, p) => ws.send(JSON.stringify({ id: ++id, method: m, params: p || {} }));
const call = (m, p) => new Promise(res => { const my = ++id; pending.set(my, res); ws.send(JSON.stringify({ id: my, method: m, params: p || {} })); });
await new Promise(res => { ws.onopen = () => res(); });
ws.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
send('Page.enable'); send('Runtime.enable');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const key = (code, k, vk) => { send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code: code, key: k, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }); send('Input.dispatchKeyEvent', { type: 'keyUp', code: code, key: k, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }); };
const probe = "JSON.stringify({diag:((document.querySelector('#diag')||{}).textContent||'').slice(0,600),cap:((document.querySelector('#mapCap')||{}).textContent||''),wiz:((document.querySelector('.detail .dttl')||{}).textContent||'')})";
const read = async () => {
  const r = await call('Runtime.evaluate', { expression: probe, returnByValue: true });
  const v = r && r.result && r.result.result && r.result.result.value;
  if (typeof v !== 'string') throw new Error('evaluate failed: ' + JSON.stringify(r && r.result).slice(0, 200));
  const o = JSON.parse(v);
  o.diag = String(o.diag).slice(0, 600); o.cap = String(o.cap).slice(0, 120); o.wiz = String(o.wiz).slice(0, 60);
  return o;
};
send('Page.navigate', { url: URL + '#select&diag' });
await sleep(3200);
const boot = await read();
result.boot = boot;
for (let i = 0; i < RIGHTS; i++) { key('ArrowRight', 'ArrowRight', 39); await sleep(160); }
await sleep(350);
const picked = await read();
result.picked = picked;
key('Enter', 'Enter', 13); await sleep(500);
key('Enter', 'Enter', 13); await sleep(4500);
const after = await read();
result.diag = after.diag; result.cap = after.cap; result.wiz = after.wiz;
const shot = await call('Page.captureScreenshot', { format: 'png' });
if (shot && shot.result && shot.result.data) writeFileSync('D:/DSH-projects/paper-racing/shots/' + TAG + '.png', Buffer.from(shot.result.data, 'base64'));
result.status = 'ok';
finish(0);
chrome.kill();
process.exit(0);
