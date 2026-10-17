import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.argv[2], CH = process.argv[3], TARGETS = process.argv[4], TAG = process.argv[5], PORT = parseInt(process.argv[6] || '9360', 10);
const lines = [];
process.on('uncaughtException', e => { console.log('TAG=' + TAG + ' err=' + String(e).slice(0, 160)); process.exit(1); });
const chrome = spawn(CHROME, ['--headless=new','--no-sandbox','--disable-gpu','--enable-unsafe-swiftshader','--remote-debugging-port=' + PORT,'--user-data-dir=' + BASE + '/shots/prof_' + TAG,'--window-size=1280,720','about:blank'], { stdio: 'ignore' });
let t = null;
for (let i = 0; i < 60 && !t; i++) { try { const l = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json(); t = l.find(x => x.type === 'page' && x.webSocketDebuggerUrl); } catch (e) {} if (!t) await new Promise(r => setTimeout(r, 400)); }
if (!t) { console.log('TAG=' + TAG + ' no-target'); process.exit(1); }
const ws = new WebSocket(t.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
const call = (m, p) => new Promise(res => { const my = ++id; pending.set(my, res); ws.send(JSON.stringify({ id: my, method: m, params: p || {} })); });
await new Promise(r => { ws.onopen = () => r(); });
ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
await call('Page.enable'); await call('Runtime.enable');
const ev = async expr => { const r = await call('Runtime.evaluate', { expression: expr, returnByValue: true }); const v = r && r.result && r.result.result && r.result.result.value; return v; };
await call('Page.navigate', { url: BASE + '/dist/paper-racing.html#auto&noin&diag&ch=' + CH });
let ready = false;
for (let i = 0; i < 80 && !ready; i++) { await new Promise(r => setTimeout(r, 250)); ready = (await ev("!!(window.__game && __game.state === 'racing')")) === true; }
if (!ready) { console.log('TAG=' + TAG + ' not-racing'); process.exit(1); }
const total = await ev('__game.track.total');
// 车在发车格上, s 已经接近 total (起跑线之前): 用「累计里程」l*total+s 记进度
const abs = async () => { const o = JSON.parse(await ev("(() => { const k = __game.world.player; return JSON.stringify({ s: k.s, l: k.laps, st: __game.state }); })()")); o.abs = o.l * total + o.s; return o; };
const start = await abs();
for (const frac of TARGETS.split(',').map(Number)) {
  const target = start.abs + frac * total;
  let guard = 0;
  while (guard++ < 1200) {
    const st = await abs();
    if (st.st !== 'racing' || st.abs >= target - 10) break;
    const dt = Math.min(2, Math.max(0.12, (target - st.abs) / 45));
    await ev('__game.warp(' + dt.toFixed(2) + ')');
  }
  const st = await abs();
  const sc = await call('Page.captureScreenshot', { format: 'png' });
  if (sc && sc.result && sc.result.data) writeFileSync(BASE + '/shots/' + TAG + '_u' + frac.toFixed(2) + '.png', Buffer.from(sc.result.data, 'base64'));
  lines.push(frac.toFixed(2) + '@abs=' + st.abs.toFixed(0) + '(want ' + target.toFixed(0) + ')');
}
console.log('TAG=' + TAG + ' total=' + total.toFixed(0) + ' start=' + start.abs.toFixed(0) + ' ' + lines.join(' '));
chrome.kill(); process.exit(0);
