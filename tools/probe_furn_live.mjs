import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9361;
const pageCode = readFileSync('D:/DSH-projects/paper-racing/tools/inpage_furn.js', 'utf8');
const chrome = spawn(CHROME, ['--headless=new','--no-sandbox','--disable-gpu','--enable-unsafe-swiftshader','--remote-debugging-port='+PORT,'--user-data-dir=D:/DSH-projects/paper-racing/shots/pf_live','--window-size=1280,720','about:blank'], { stdio: 'ignore' });
async function target() { for (let i=0;i<60;i++) { try { const l = await (await fetch('http://127.0.0.1:'+PORT+'/json/list')).json(); const p = l.find(t=>t.type==='page'); if (p && p.webSocketDebuggerUrl) return p; } catch(e){} await new Promise(r=>setTimeout(r,400)); } return null; }
const t = await target(); if (!t) { console.log('no-target'); process.exit(1); }
const ws = new WebSocket(t.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
const call = (m,p) => new Promise(res => { const my = ++id; pending.set(my,res); ws.send(JSON.stringify({ id: my, method: m, params: p||{} })); });
await new Promise(res => { ws.onopen = () => res(); });
ws.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch(e) { return; } if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
await call('Page.enable'); await call('Runtime.enable');
await call('Page.navigate', { url: 'file:///D:/DSH-projects/paper-racing/dist/paper-racing.html#select&diag' });
await sleep(3500);
const r = await call('Runtime.evaluate', { expression: pageCode, returnByValue: true, awaitPromise: true });
const v = r && r.result && r.result.result && r.result.result.value;
if (typeof v !== 'string') { console.log('EVAL FAIL ' + JSON.stringify(r && r.result).slice(0,400)); } else { console.log(v); }
chrome.kill(); process.exit(0);