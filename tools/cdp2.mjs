import { spawn } from 'node:child_process';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9334;
const PROF = 'D:\\DSH-projects\\paper-racing\\shots\\prof8';
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
const sink = [];
const ws = new WebSocket(t.webSocketDebuggerUrl);
let id = 0;
const send = (method, params) => ws.send(JSON.stringify({ id: ++id, method, params: params || {} }));
const ready = new Promise(res => { ws.onopen = () => res(); });
ws.onmessage = (ev) => {
  let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
  if (m.method === 'Runtime.consoleAPICalled') {
    const text = (m.params.args || []).map(a => (a.value !== undefined ? a.value : (a.description || a.type))).join(' ');
    sink.push({ level: m.params.type, text: String(text) });
  } else if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    sink.push({ level: 'uncaught', text: ((d.exception && d.exception.description) || d.text) + ' @' + d.lineNumber });
  } else if (m.method === 'Log.entryAdded') {
    sink.push({ level: 'log:' + m.params.entry.level, text: m.params.entry.text + ' [' + (m.params.entry.url || '') + ']' });
  }
};
await ready;
send('Runtime.enable'); send('Log.enable'); send('Page.enable');
send('Page.navigate', { url: URL });
await new Promise(r => setTimeout(r, 2500));

function key(code, keyName, vk) {
  send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code: code, key: keyName, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
  send('Input.dispatchKeyEvent', { type: 'keyUp', code: code, key: keyName, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
}
// 选章节箭头, Enter 进步骤2, Enter 发车
key('ArrowRight','ArrowRight',39);
key('ArrowRight','ArrowRight',39);
key('Enter','Enter',13);
await new Promise(r => setTimeout(r, 400));
key('Enter','Enter',13);
await new Promise(r => setTimeout(r, 1500));
// 油门按住 3 秒 (真实按键, 会触发音频手势)
send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code: 'ArrowUp', key: 'ArrowUp', windowsVirtualKeyCode: 38, nativeVirtualKeyCode: 38 });
await new Promise(r => setTimeout(r, 3000));
send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'ArrowUp', key: 'ArrowUp', windowsVirtualKeyCode: 38, nativeVirtualKeyCode: 38 });
// 转向
send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code: 'ArrowLeft', key: 'ArrowLeft', windowsVirtualKeyCode: 37, nativeVirtualKeyCode: 37 });
await new Promise(r => setTimeout(r, 1200));
send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'ArrowLeft', key: 'ArrowLeft', windowsVirtualKeyCode: 37, nativeVirtualKeyCode: 37 });
// 暂停 / 继续 / 静音 / 帮助
key('Escape','Escape',27);
await new Promise(r => setTimeout(r, 800));
key('Escape','Escape',27);
await new Promise(r => setTimeout(r, 500));
key('KeyM','m',77);
key('KeyR','r',82);
await new Promise(r => setTimeout(r, 2500));
key('Enter','Enter',13);
await new Promise(r => setTimeout(r, 1200));

const byLevel = {};
for (const s of sink) byLevel[s.level] = (byLevel[s.level] || 0) + 1;
const groups = new Map();
for (const s of sink) { const k = s.level + ' :: ' + s.text.replace(/\s+/g,' ').slice(0,160); groups.set(k, (groups.get(k)||0)+1); }
const lines = ['TOTAL=' + sink.length + '  ' + JSON.stringify(byLevel)];
[...groups.entries()].sort((a,b)=>b[1]-a[1]).slice(0,20).forEach(([k,v]) => lines.push('x' + v + '  ' + k));
console.log(lines.join('\n'));
chrome.kill();
process.exit(0);
