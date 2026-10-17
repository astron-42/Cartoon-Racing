// 赛道走线设计与体检工具 (改动 2 的第二轮: U 型弯 + 大弯曲度 + 出弯直道 ≥50m)
// 用法: node tools/gen.mjs base  → 还原并保存注入前的原始走线到 tools/base_layouts.json
//       node tools/gen.mjs report  → 体检当前 track.js 的四个章节
import { readFileSync, writeFileSync } from 'node:fs';
import { LAYOUTS, closeByLengths, buildPolyline, closeLoop, smoothClosed, Track, TRACK_STEP } from '../src/core/track.js';
import { PHYS } from '../src/core/constants.js';

export const FILE = new URL('../src/core/track.js', import.meta.url);
const R58 = 58, D45 = 45, ADV = 2 * R58 * Math.sin(D45 * Math.PI / 180);

// 把上一轮注入的 ['a',58,±45] 对剥掉, 直道长度加回 n*ADV → 还原原始走线
export function deInject(segs) {
  const out = []; let i = 0, pending = 0;
  while (i < segs.length) {
    const a = segs[i], b = segs[i + 1];
    if (a && b && a[0] === 'a' && b[0] === 'a' && a[1] === R58 && b[1] === R58 && Math.abs(a[2]) === D45 && Math.abs(b[2]) === D45 && a[2] === -b[2]) {
      pending++; i += 2; continue;
    }
    if (a[0] === 's' && pending) { out.push(['s', +(a[1] + pending * ADV).toFixed(1)]); pending = 0; i++; continue; }
    out.push(a); i++;
  }
  return out;
}

// 复刻 layoutPoints + buildTrack 的管线
export function pipeline(segs, width) {
  const closed = closeByLengths(segs);
  const pts = smoothClosed(closeLoop(buildPolyline(closed, TRACK_STEP)), 1, 0.12);
  const t = new Track(pts.map(p => [p.x, p.z]), width, { dense: true });
  return { t, closed };
}

export function metrics(t) {
  const N = t.sampleCount, sp = t.spacing, RAD = 180 / Math.PI;
  const signed = [];
  for (let i = 0; i < N; i++) {
    const a = t.tan[(i - 1 + N) % N], b = t.tan[(i + 1) % N];
    signed.push(Math.atan2(a.tx * b.tz - a.tz * b.tx, a.tx * b.tx + a.tz * b.tz));
  }
  const W = Math.max(3, Math.round(15 / sp)), sm = [];
  for (let i = 0; i < N; i++) { let s = 0; for (let j = -W; j <= W; j++) s += signed[(i + j + N * 2) % N]; sm.push(s); }
  const T = 0.006;
  let alt = 0, sign = 0, pos = 0, neg = 0, straight = 0;
  for (let i = 0; i < N; i++) {
    const v = sm[i]; if (Math.abs(v) < T) { straight++; continue; }
    const sg = v > 0 ? 1 : -1; if (sg > 0) pos += Math.abs(v); else neg += Math.abs(v);
    if (sign === 0) sign = sg; else if (sg !== sign) { alt++; sign = sg; }
  }
  // 非相邻自最近距离 (自交检测)
  const P = t.pts, n = P.length; let minD = 1e9;
  for (let i = 0; i < n; i++) { const a = P[i]; for (let j = i + 40; j < n; j++) { if (j - i > n - 40) break; const d = Math.hypot(P[j].x - a.x, P[j].z - a.z); if (d < minD) minD = d; } }
  const xs = P.map(p => p.x), zs = P.map(p => p.z);
  return {
    total: t.total, minRadius: t.minRadius, alt, straight: straight / N,
    posDeg: pos * RAD, negDeg: neg * RAD, dom: Math.max(pos, neg) / Math.max(pos + neg, 1e-9),
    minD, bbox: [Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)],
  };
}

export function specInfo(closed, width) {
  // 闭合后的弧转角 (k 缩放后) 与直道长度
  const arcs = closed.filter(s => s[0] === 'a').map(s => s[2]);
  const straights = closed.filter(s => s[0] === 's').map(s => s[1]);
  const uTurns = arcs.filter(a => Math.abs(a) >= 150).length;
  const shallow = arcs.filter(a => Math.abs(a) < 30).length;
  return { arcs, straights, uTurns, shallow, minStraight: Math.min(...straights), maxAbsArc: Math.max(...arcs.map(Math.abs)) };
}

export function estimateLap(t, vmax) {
  // 用逐点曲率估算: 弯道限速 sqrt(9R), 直道 vmax
  let time = 0;
  for (let i = 0; i < t.sampleCount; i++) time += t.spacing / Math.min(vmax, Math.sqrt(9 / Math.max(t.curv[i], 1e-9)));
  return time;
}

const cmd = process.argv[2] || 'report';
const keys = ['zhuhai', 'ningbo', 'tianjin', 'ordos'];
if (cmd === 'base') {
  const src = readFileSync(FILE, 'utf8');
  const base = {};
  for (const key of keys) {
    const at = src.indexOf(key + ": Object.freeze({");
    const s0 = src.indexOf('segments: [', at);
    let i = src.indexOf('[', s0), depth = 0, end = -1;
    for (; i < src.length; i++) { if (src[i] === '[') depth++; else if (src[i] === ']') { depth--; if (depth === 0) { end = i; break; } } }
    const cur = eval('(' + src.slice(s0 + 'segments: '.length, end + 1) + ')');
    base[key] = deInject(cur);
  }
  writeFileSync(new URL('./base_layouts.json', import.meta.url), JSON.stringify(base, null, 1));
  for (const key of keys) {
    const b = base[key];
    const r = pipeline(b, LAYOUTS[key].width); const m = metrics(r.t); const si = specInfo(r.closed);
    console.log('BASE ' + key.padEnd(7) + ' 段' + String(b.length).padStart(3) + ' 长' + m.total.toFixed(0).padStart(5) + ' Rmin=' + m.minRadius.toFixed(1).padStart(5) +
      ' 单向=' + (m.dom * 100).toFixed(0) + '% 换向=' + String(m.alt).padStart(2) + ' U型=' + si.uTurns + ' 最小直道=' + si.minStraight.toFixed(0) + ' 浅弧=' + si.shallow + ' 非邻=' + m.minD.toFixed(0));
  }
} else {
  for (const key of keys) {
    const L = LAYOUTS[key];
    const r = pipeline(L.segments, L.width); const m = metrics(r.t); const si = specInfo(r.closed);
    console.log(key.padEnd(7) + ' 段' + String(L.segments.length).padStart(3) + ' 长' + m.total.toFixed(0).padStart(5) + ' Rmin=' + m.minRadius.toFixed(1).padStart(5) +
      ' 单向=' + (m.dom * 100).toFixed(0) + '% 换向=' + String(m.alt).padStart(2) + ' U型=' + si.uTurns + ' 最小直道=' + si.minStraight.toFixed(0) + ' 浅弧=' + si.shallow +
      ' 非邻=' + m.minD.toFixed(0) + ' 估圈=' + estimateLap(r.t, PHYS.baseMaxSpeed * 0.92 * 0.99).toFixed(1) + 's');
  }
}
