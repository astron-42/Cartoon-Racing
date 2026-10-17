import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = process.argv[2], PROF = process.argv[3], WAIT = parseInt(process.argv[4] || '2600', 10), TAG = process.argv[5] || 'shot', PORT = parseInt(process.argv[6] || '9350', 10);
process.on('uncaughtException', e => { console.log('TAG=' + TAG + ' err=' + String(e).slice(0, 160)); process.exit(1); });
const chrome = spawn(CHROME, ['--headless=new','--no-sandbox','--disable-gpu','--enable-unsafe-swiftshader','--remote-debugging-port=' + PORT,'--user-data-dir=' + (PROF.startsWith('D:') ? PROF : 'D:/DSH-projects/paper-racing/' + PROF),'--window-size=1280,720','about:blank'], { stdio: ['ignore','inherit','inherit'] });
let t = null;
for (let i = 0; i < 60 && !t; i++) { try { const l = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json(); t = l.find(x => x.type === 'page' && x.webSocketDebuggerUrl); } catch (e) {} if (!t) await new Promise(r => setTimeout(r, 400)); }
if (!t) { console.log('TAG=' + TAG + ' no-target'); process.exit(1); }
const ws = new WebSocket(t.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
const call = (m, p) => new Promise(res => { const my = ++id; pending.set(my, res); ws.send(JSON.stringify({ id: my, method: m, params: p || {} })); });
await new Promise(r => { ws.onopen = () => r(); });
ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
await call('Page.enable'); await call('Runtime.enable');
await call('Page.navigate', { url: URL });
await new Promise(r => setTimeout(r, WAIT));
const s = await call('Page.captureScreenshot', { format: 'png' });
if (s && s.result && s.result.data) { writeFileSync('D:/DSH-projects/paper-racing/shots/' + TAG + '.png', Buffer.from(s.result.data, 'base64')); console.log('TAG=' + TAG + ' ok'); } else console.log('TAG=' + TAG + ' no-shot');
chrome.kill(); process.exit(0);
