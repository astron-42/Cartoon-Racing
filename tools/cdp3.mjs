import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9336;
const PROF = 'D:\\DSH-projects\\paper-racing\\shots\\prof10';
const URL = 'file:///D:/DSH-projects/paper-racing/dist/paper-racing.html';

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
const ws = new WebSocket(t.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (method, params) => ws.send(JSON.stringify({ id: ++id, method, params: params || {} }));
const call = (method, params) => new Promise(res => { const my = ++id; pending.set(my, res); ws.send(JSON.stringify({ id: my, method, params: params || {} })); });
const ready = new Promise(res => { ws.onopen = () => res(); });
ws.onmessage = (ev) => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
await ready;
send('Page.enable'); send('Runtime.enable');
const sleep = ms => new Promise(r => setTimeout(r, ms));

function key(code, keyName, vk, hold) {
  send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code: code, key: keyName, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
  if (!hold) send('Input.dispatchKeyEvent', { type: 'keyUp', code: code, key: keyName, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
}
async function shoot(file) {
  const r = await call('Page.captureScreenshot', { format: 'png' });
  writeFileSync(file, Buffer.from(r.result.data, 'base64'));
}
async function read() {
  const r = await call('Runtime.evaluate', { expression: "JSON.stringify({diag:(document.querySelector('#diag')||{}).textContent||'',cap:(document.querySelector('#mapCap')||{}).textContent||'',wiz:(document.querySelector('.detail .dttl')||{}).textContent||''})", returnByValue: true });
  return JSON.parse(r.result.result.value);
}
async function race(hash, rights, tag) {
  send('Page.navigate', { url: URL + hash });
  await sleep(3000);
  const before = await read();
  for (let i = 0; i < rights; i++) { key('ArrowRight', 'ArrowRight', 39); await sleep(150); }
  await sleep(300);
  const picked = await read();
  key('Enter', 'Enter', 13); await sleep(500);
  key('Enter', 'Enter', 13); await sleep(4500);
  const after = await read();
  await shoot('D:/DSH-projects/paper-racing/shots/' + tag + '.png');
  console.log('[' + tag + '] boot wizard card=' + JSON.stringify(before.wiz) + ' | picked=' + JSON.stringify(picked.wiz));
  console.log('[' + tag + '] cap=' + JSON.stringify(after.cap) + ' diag=' + after.diag);
}
await race('#select&diag', 4, 'fixA');
await race('#select&diag', 1, 'fixB');
chrome.kill();
process.exit(0);
