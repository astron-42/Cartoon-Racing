import { CHAPTERS } from '../src/core/constants.js';
import { buildTrack } from '../src/core/track.js';
const only = process.argv.slice(2);
for (const ch of CHAPTERS) {
  if (only.length && !only.includes(ch.key)) continue;
  const t = buildTrack(ch.layout);
  const N = t.sampleCount, sp = t.spacing;
  // 带符号转角逐 15 m 平滑, 再数换向次数与单向占比 → 量化"有多圆"
  const signed = [];
  for (let i = 0; i < N; i++) {
    const a = t.tan[(i - 1 + N) % N], b = t.tan[(i + 1) % N];
    const cross = a.tx * b.tz - a.tz * b.tx;
    signed.push(Math.atan2(cross, a.tx * b.tx + a.tz * b.tz));
  }
  const W = Math.max(3, Math.round(15 / sp));
  const sm = [];
  for (let i = 0; i < N; i++) { let s = 0; for (let j = -W; j <= W; j++) s += signed[(i + j + N * 2) % N]; sm.push(s); }
  const T = 0.006;                                   // 约 0.34° 判为直道
  let alt = 0, sign = 0, pos = 0, neg = 0, straight = 0, turns = 0;
  const RAD = 180 / Math.PI;
  for (let i = 0; i < N; i++) {
    const v = sm[i]; if (Math.abs(v) < T) { straight++; continue; }
    const sg = v > 0 ? 1 : -1; if (sg > 0) pos += Math.abs(v); else neg += Math.abs(v);
    if (sign === 0) { sign = sg; turns++; } else if (sg !== sign) { alt++; sign = sg; turns++; }
  }
  const dom = Math.max(pos, neg) / Math.max(pos + neg, 1e-9);
  const deg = (pos + neg) * RAD;
  const xs = t.pts.map(p => p.x), zs = t.pts.map(p => p.z);
  console.log(ch.key + ' ' + ch.name.padEnd(7) + ' 长' + t.total.toFixed(0).padStart(5) + 'm Rmin=' + t.minRadius.toFixed(1).padStart(5) +
    ' bbox=' + (Math.max(...xs) - Math.min(...xs)).toFixed(0).padStart(3) + 'x' + (Math.max(...zs) - Math.min(...zs)).toFixed(0).padStart(3) +
    ' 总转角=' + deg.toFixed(0).padStart(4) + '° 单向占比=' + (dom * 100).toFixed(0).padStart(3) + '% 换向=' + String(alt).padStart(2) +
    ' 弯段数=' + String(turns).padStart(2) + ' 直道率=' + (straight / N * 100).toFixed(0).padStart(2) + '%' +
    ' 单位长换向=' + (alt / t.total * 1000).toFixed(2));
}
