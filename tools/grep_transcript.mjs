import fs from 'node:fs';
const txt = fs.readFileSync('shots/live.jsonl', 'utf8');
const lines = txt.split('\n').filter(Boolean);
console.log('lines=' + lines.length);
let n = 0;
for (const L of lines) {
  let o; try { o = JSON.parse(L); } catch { continue; }
  if (o.type !== 'user/message') continue;
  const parts = (o.data && o.data.content) || [];
  const text = parts.filter(p => p.type === 'text').map(p => p.text).join('\n');
  if (!text || text.startsWith('<path>') || text.startsWith('This is an automatically generated checkpoint') || text.startsWith('Current runtime context') || text.startsWith('<system-reminder>') || text.startsWith('background job')) continue;
  const role = o.data && o.data.source ? o.data.source : '';
  n++;
  console.log('### seq=' + o.seq + ' [' + role + '] >>> ' + text.replace(/\s+/g, ' ').slice(0, 700));
}
console.log('typed=' + n);
