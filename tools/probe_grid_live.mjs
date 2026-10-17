// 打包产物里核对发车排位: 玩家是否在最后一格 (第 8 位), 并截图倒计时画面。
// 用法: node tools/probe_grid_live.mjs [chapter] [shotPath]
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CH = process.argv[2] || 'ch3';
const SHOT = process.argv[3] || '';
const PORT = 9414;
const prof = 'D:/DSH-projects/paper-racing/shots/pf_grid_' + CH;
const chrome = spawn(CHROME, ['--headless=new','--no-sandbox','--disable-gpu','--enable-unsafe-swiftshader','--hide-scrollbars','--remote-debugging-port='+PORT,'--user-data-dir='+prof,'--window-size=1280,760','about:blank'], { stdio: 'ignore' });
async function target() { for (let i=0;i<60;i++) { try { const l = await (await fetch('http://127.0.0.1:'+PORT+'/json/list')).json(); const p = l.find(t=>t.type==='page'&&t.webSocketDebuggerUrl); if (p) return p; } catch(e){} await new Promise(r=>setTimeout(r,400)); } return null; }
const t = await target(); if (!t) { console.log('no-target'); process.exit(1); }
const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const pending = new Map();
const call = (m,p) => new Promise(res => { const my = ++id; pending.set(my,res); ws.send(JSON.stringify({ id: my, method: m, params: p||{} })); });
await new Promise(res => { ws.onopen = () => res(); });
ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch(x) { return; } if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const evalJs = async (expr) => { const r = await call('Runtime.evaluate', { expression: expr, returnByValue: true }); return r && r.result && r.result.result && r.result.result.value; };
await call('Page.enable'); await call('Runtime.enable');
await call('Page.navigate', { url: 'file:///D:/DSH-projects/paper-racing/dist/paper-racing.html#auto&noin&diag&ch=' + CH });
await sleep(2500);
const info = await evalJs(`(() => { const g = window.__game, w = g.world;
  return JSON.stringify({ state: g.state, t: +w.time.toFixed(2), karts: w.karts.map(k => ({ p: !!k.isPlayer, grid: k.gridIndex, rank: k.rank, s: +k.s.toFixed(1), lat: +k.lateral.toFixed(2) })) }); })()`);
console.log(info);
if (SHOT) { const sc = await call('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOT, Buffer.from(sc.result.data, 'base64')); console.log('shot -> ' + SHOT); }
ws.close(); chrome.kill();
process.exit(0);
