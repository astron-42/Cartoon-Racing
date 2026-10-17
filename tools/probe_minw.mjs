// 量 body/#app/canvas 的实际宽度, 验证「body 最小宽度 760px」
// 用法: node tools/probe_minw.mjs <窗口宽> [窗口高] [截图路径]
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const W = parseInt(process.argv[2] || '420', 10), H = parseInt(process.argv[3] || '760', 10);
const SHOT = process.argv[4] || '';
const PORT = 9390 + (W % 7);
const chrome = spawn(CHROME, ['--headless=new','--no-sandbox','--disable-gpu','--enable-unsafe-swiftshader','--remote-debugging-port='+PORT,'--user-data-dir=D:/DSH-projects/paper-racing/shots/pf_minw_'+W,'--window-size='+W+','+H,'about:blank'], { stdio: 'ignore' });
async function target() { for (let i=0;i<60;i++) { try { const l = await (await fetch('http://127.0.0.1:'+PORT+'/json/list')).json(); const p = l.find(t=>t.type==='page'&&t.webSocketDebuggerUrl); if (p) return p; } catch(e){} await new Promise(r=>setTimeout(r,400)); } return null; }
const t = await target(); if (!t) { console.log('no-target'); process.exit(1); }
const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const pending = new Map();
const call = (m,p) => new Promise(res => { const my = ++id; pending.set(my,res); ws.send(JSON.stringify({ id: my, method: m, params: p||{} })); });
await new Promise(res => { ws.onopen = () => res(); });
ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch(x) { return; } if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const sleep = ms => new Promise(r=>setTimeout(r,ms));
await call('Page.enable'); await call('Runtime.enable');
await call('Page.navigate', { url: 'file:///D:/DSH-projects/paper-racing/dist/paper-racing.html' });
await sleep(4000);
const code = `(() => {
  const b = document.body, a = document.getElementById('app'), c = document.querySelector('canvas');
  const scr = document.querySelector('.screen');
  return JSON.stringify({
    win: innerWidth + 'x' + innerHeight,
    bodyMinW: getComputedStyle(b).minWidth,
    bodyW: +b.getBoundingClientRect().width.toFixed(1),
    htmlScrollW: document.documentElement.scrollWidth,
    appW: a ? +a.getBoundingClientRect().width.toFixed(1) : null,
    appClientW: a ? a.clientWidth : null,
    hudW: (() => { const h = document.getElementById('hud'); return h ? +h.getBoundingClientRect().width.toFixed(1) : null; })(),
    screenW: scr ? +scr.getBoundingClientRect().width.toFixed(1) : null,
    canvasAttrW: c ? c.width : null,
    canvasCssW: c ? +c.getBoundingClientRect().width.toFixed(1) : null,
    canvasCssH: c ? +c.getBoundingClientRect().height.toFixed(1) : null
  });
})()`;
const r = await call('Runtime.evaluate', { expression: code, returnByValue: true });
console.log('WIN' + W + ' :: ' + (r && r.result && r.result.result && r.result.result.value));
if (SHOT) { const sc = await call('Page.captureScreenshot', { format: 'png' }); if (sc && sc.result && sc.result.data) writeFileSync(SHOT, Buffer.from(sc.result.data, 'base64')); }
chrome.kill(); process.exit(0);
