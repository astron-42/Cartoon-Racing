import { spawn } from 'node:child_process';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9333;
const PROF = 'D:\\DSH-projects\\paper-racing\\shots\\prof7';
const scenarios = [
  ['race-ch1', 'file:///D:/DSH-projects/paper-racing/dist/paper-racing.html#auto&noin&warp=20'],
  ['select-idle', 'file:///D:/DSH-projects/paper-racing/dist/paper-racing.html'],
  ['help', 'file:///D:/DSH-projects/paper-racing/dist/paper-racing.html#help'],
  ['records', 'file:///D:/DSH-projects/paper-racing/dist/paper-racing.html#records'],
  ['race-ch4', 'file:///D:/DSH-projects/paper-racing/dist/paper-racing.html#auto&noin&ch=ch4&warp=20'],
  ['results', 'file:///D:/DSH-projects/paper-racing/dist/paper-racing.html#auto&noin&warp=295']
];

function startChrome() {
  return spawn(CHROME, ['--headless=new','--no-sandbox','--disable-gpu','--enable-unsafe-swiftshader',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROF, '--window-size=1280,720',
    '--enable-logging=stderr', '--log-level=3', 'about:blank'], { stdio: 'ignore' });
}
async function pageTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch('http://127.0.0.1:' + PORT + '/json/list');
      const list = await r.json();
      const p = list.find(t => t.type === 'page');
      if (p && p.webSocketDebuggerUrl) return p;
    } catch (e) {}
    await new Promise(r => setTimeout(r, 400));
  }
  return null;
}
function attach(target, sink) {
  return new Promise((resolve) => {
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    let id = 0;
    const send = (method, params) => ws.send(JSON.stringify({ id: ++id, method, params: params || {} }));
    ws.onopen = () => { send('Runtime.enable'); send('Log.enable'); send('Page.enable'); resolve({ ws, send }); };
    ws.onmessage = (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.method === 'Runtime.consoleAPICalled') {
        const text = (m.params.args || []).map(a => (a.value !== undefined ? a.value : (a.description || a.type))).join(' ');
        sink.push({ level: m.params.type === 'error' ? 'error' : (m.params.type === 'warning' ? 'warning' : m.params.type), text: String(text) });
      } else if (m.method === 'Runtime.exceptionThrown') {
        const d = m.params.exceptionDetails;
        sink.push({ level: 'error', text: 'UNCAUGHT ' + ((d.exception && d.exception.description) || d.text) });
      } else if (m.method === 'Log.entryAdded') {
        sink.push({ level: m.params.entry.level, text: m.params.entry.text });
      }
    };
    ws.onerror = () => resolve(null);
  });
}

const chrome = startChrome();
const out = [];
for (const [name, url] of scenarios) {
  const target = await pageTarget();
  if (!target) { out.push(name + ': NO TARGET'); break; }
  const sink = [];
  const conn = await attach(target, sink);
  if (!conn) { out.push(name + ': NO WS'); continue; }
  conn.send('Page.navigate', { url });
  await new Promise(r => setTimeout(r, 9000));
  const errs = sink.filter(s => s.level === 'error');
  const warns = sink.filter(s => s.level === 'warning');
  const groups = new Map();
  for (const s of errs) { const k = s.text.replace(/\s+/g,' ').slice(0,140); groups.set(k, (groups.get(k)||0)+1); }
  const wgroups = new Map();
  for (const s of warns) { const k = s.text.replace(/\s+/g,' ').slice(0,140); wgroups.set(k, (wgroups.get(k)||0)+1); }
  out.push('=== ' + name + '  errors=' + errs.length + ' warnings=' + warns.length);
  [...groups.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6).forEach(([k,v]) => out.push('   E x' + v + '  ' + k));
  [...wgroups.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6).forEach(([k,v]) => out.push('   W x' + v + '  ' + k));
  conn.ws.close();
}
console.log(out.join('\n'));
chrome.kill();
process.exit(0);
