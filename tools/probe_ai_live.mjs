// 在打包产物 (dist) 里验证 AI 弯速 12.5 是否生效: auto 模式发车后用 __game.warp 快进到完赛, 读真实完赛时间。
// 用法: node tools/probe_ai_live.mjs [chapter] [shotPath]
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CH = process.argv[2] || 'ch1';
const SHOT = process.argv[3] || '';
const PORT = 9412;
const prof = 'D:/DSH-projects/paper-racing/shots/pf_ai_' + CH;
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
await call('Page.navigate', { url: 'file:///D:/DSH-projects/paper-racing/dist/paper-racing.html#auto&noin&diag&ch=' + CH + '&warp=5' });
await sleep(4000);
const probe = `(() => {
  const g = window.__game, w = g && g.world;
  if (!w || !w.karts) return JSON.stringify({ err: 'no world' });
  return JSON.stringify({ state: g.state, t: +(w.time||0).toFixed(1),
    karts: w.karts.map(k => ({ p: !!k.isPlayer, fin: !!k.finished, ft: k.finished ? +k.finishTime.toFixed(1) : null, rank: k.rank, off: k.offTrackEvents|0, resp: k.respawnCount|0 })) });
})()`;
let st = null;
for (let i = 0; i < 10; i++) {
  const raw = await evalJs(probe); st = raw ? JSON.parse(raw) : null;
  if (st && st.karts && st.karts.every(k => k.fin)) break;
  await evalJs('__game.warp(60)');
  await sleep(300);
}
if (SHOT) { const sc = await call('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOT, Buffer.from(sc.result.data, 'base64')); console.log('shot -> ' + SHOT); }
if (st && st.karts) {
  const ai = st.karts.filter(k => !k.p && k.ft).map(k => k.ft).sort((a,b)=>a-b);
  const pl = st.karts.find(k => k.p);
  console.log('CH ' + CH + ' 状态 ' + st.state + ' 比赛时间 ' + st.t + ' s | AI 完赛 ' + ai.length + '/7 | 冠军 ' + (ai[0]||0).toFixed(1) + ' s | 末位 ' + (ai[ai.length-1]||0).toFixed(1) + ' s | auto玩家 ' + (pl.ft||'-') + ' s 名次 ' + pl.rank + ' | 总出界 ' + st.karts.reduce((a,k)=>a+k.off,0) + ' 总复位 ' + st.karts.reduce((a,k)=>a+k.resp,0));
}
ws.close(); chrome.kill();
process.exit(0);
