// 赛道路型设计器 (第三轮: U 型弯 + 大弯曲度 + 出弯直道 >=50m)
// 用法: node tools/design.mjs try <preset>
import { closeByLengths, buildPolyline, closeLoop, smoothClosed, Track, TRACK_STEP } from '../src/core/track.js';

const RAD = 180 / Math.PI;

export function rawEnd(segs) {
  let x = 0, z = 0, h = 0;
  for (const s of segs) {
    if (s[0] === 's') { x += Math.cos(h) * s[1]; z += Math.sin(h) * s[1]; }
    else {
      const R = s[1], th = s[2] * Math.PI / 180, n = Math.max(2, Math.round(R * Math.abs(th) / TRACK_STEP)), dh = th / n;
      for (let i = 0; i < n; i++) { h += dh; x += Math.cos(h) * TRACK_STEP; z += Math.sin(h) * TRACK_STEP; }
    }
  }
  return { x, z, h };
}

export function refine(segs, i, j) {
  const e0 = rawEnd(segs);
  const a = segs.map(s => s.slice());
  a[i][1] += 1; const u1 = rawEnd(a); a[i][1] -= 1;
  a[j][1] += 1; const u2 = rawEnd(a);
  const v1 = [u1.x - e0.x, u1.z - e0.z], v2 = [u2.x - e0.x, u2.z - e0.z];
  const det = v1[0] * v2[1] - v1[1] * v2[0];
  if (Math.abs(det) < 1e-3) return null;
  const E = [-e0.x, -e0.z];
  const d1 = (E[0] * v2[1] - E[1] * v2[0]) / det;
  const d2 = (v1[0] * E[1] - v1[1] * E[0]) / det;
  const out = segs.map(s => s.slice());
  out[i][1] += d1; out[j][1] += d2;
  return { segs: out, d1, d2 };
}

// 最小范数闭合: 取最长的 k 根直道, 解 dl = U^T (U U^T)^-1 E, 让修正量摊开
export function refineMinNorm(segs, k = 5, cap = 0.35) {
  const idx = [];
  for (let i = 0; i < segs.length; i++) if (segs[i][0] === 's') idx.push(i);
  idx.sort((a, b) => segs[b][1] - segs[a][1]);
  let free = idx.slice(0, k);
  for (let iter = 0; iter < 6; iter++) {
    const e0 = rawEnd(segs);
    const U = [];
    for (const i of free) {
      const a = segs.map(s => s.slice()); a[i][1] += 1; const u = rawEnd(a);
      U.push([u.x - e0.x, u.z - e0.z]);
    }
    // M = U U^T (2x2)
    let m00 = 0, m01 = 0, m11 = 0;
    for (const u of U) { m00 += u[0] * u[0]; m01 += u[0] * u[1]; m11 += u[1] * u[1]; }
    const det = m00 * m11 - m01 * m01;
    if (Math.abs(det) < 1e-6) return null;
    const E = [-e0.x, -e0.z];
    const w0 = (E[0] * m11 - E[1] * m01) / det;
    const w1 = (E[1] * m00 - E[0] * m01) / det;
    const dl = U.map(u => u[0] * w0 + u[1] * w1);
    let over = -1;
    for (let n = 0; n < free.length; n++) if (Math.abs(dl[n]) > cap * segs[free[n]][1] && (over < 0 || Math.abs(dl[n]) > Math.abs(dl[over]))) over = n;
    if (over < 0) {
      const out = segs.map(s => s.slice());
      free.forEach((i, n) => { out[i][1] += dl[n]; });
      return { segs: out, dl };
    }
    free.splice(over, 1);
    if (!free.length) return null;
  }
  return null;
}

// 终点几何分析: 弯道 run + 直道 run (从一段直道上"切开"再线性扫描, 避免环形合并出错)
export function corners(t, eps = 0.0025, mergeGap = 8) {
  const N = t.sampleCount, sp = t.spacing;
  const signed = [];
  for (let i = 0; i < N; i++) {
    const a = t.tan[(i - 1 + N) % N], b = t.tan[(i + 1) % N];
    signed.push(Math.atan2(a.tx * b.tz - a.tz * b.tx, a.tx * b.tx + a.tz * b.tz));
  }
  const W = Math.max(2, Math.round(4 / sp)), sm = [];
  for (let i = 0; i < N; i++) { let s = 0; for (let j = -W; j <= W; j++) s += signed[(i + j + N * 2) % N]; sm.push(s / (2 * W + 1) / (2 * sp)); }
  const isC = []; for (let i = 0; i < N; i++) isC.push(Math.abs(sm[i]) > eps);
  let k0 = isC.indexOf(false);
  if (k0 < 0) k0 = 0;                      // 没有直道: 退化为整体一圈
  const idx = i => (k0 + i) % N;
  let runs = []; let start = -1;
  for (let i = 0; i < N; i++) {
    const c = isC[idx(i)];
    if (c && start < 0) start = i;
    if ((!c || i === N - 1) && start >= 0) { runs.push([start, i - 1]); start = -1; }
  }
  // 合并被 < mergeGap 的短直道切开的弯道
  let merged = true;
  while (merged && runs.length > 1) {
    merged = false;
    for (let k = 0; k + 1 < runs.length; k++) {
      const gap = runs[k + 1][0] - runs[k][1] - 1;
      if (gap * sp < mergeGap) { runs[k] = [runs[k][0], runs[k + 1][1]]; runs.splice(k + 1, 1); merged = true; break; }
    }
  }
  const cs = runs.map(([s0, e0]) => {
    let sweep = 0, minR = 1e9;
    for (let k = s0; k <= e0; k++) { const i = idx(k); sweep += signed[i]; minR = Math.min(minR, 1 / Math.max(Math.abs(sm[i]), 1e-9)); }
    return { len: (e0 - s0 + 1) * sp, sweep: sweep * RAD * 0.5, minR, at: s0 * sp };
  }).filter(c => Math.abs(c.sweep) >= 8);
  const straights = cs.map((c, k) => {
    const nxt = cs[(k + 1) % cs.length];
    let gap = (nxt.at - c.at + t.total) % t.total - c.len;
    if (gap < 0) gap += t.total;
    return { len: gap, after: k };
  });
  return { cs, straights };
}

export function report(tag, segs, width, showAscii = true) {
  const closed = closeByLengths(segs);
  const pts = smoothClosed(closeLoop(buildPolyline(closed, TRACK_STEP)), 1, 0.12);
  const t = new Track(pts.map(p => [p.x, p.z]), width, { dense: true });
  const cc = corners(t);
  const uT = cc.cs.filter(c => Math.abs(c.sweep) >= 150);
  const pos = cc.cs.filter(c => c.sweep > 0).reduce((a, c) => a + c.sweep, 0);
  const neg = cc.cs.filter(c => c.sweep < 0).reduce((a, c) => a - c.sweep, 0);
  const worst = cc.cs.reduce((b, c) => (Math.abs(c.sweep) < Math.abs(b.sweep) ? c : b), cc.cs[0]);
  const minStr = Math.min(...cc.straights.map(s => s.len));
  const P = t.pts;
  let minD = 1e9;
  for (let i = 0; i < P.length; i++) for (let j = i + 40; j < P.length; j++) { if (j - i > P.length - 40) break; const d = Math.hypot(P[j].x - P[i].x, P[j].z - P[i].z); if (d < minD) minD = d; }
  console.log(tag.padEnd(10) + ' len=' + t.total.toFixed(0).padStart(5) + ' Rmin=' + t.minRadius.toFixed(1).padStart(5) +
    ' 弯' + String(cc.cs.length).padStart(2) + ' U型=' + String(uT.length).padStart(2) + ' 最浅=' + worst.sweep.toFixed(0).padStart(4) +
    ' 直道min=' + minStr.toFixed(0).padStart(4) + ' 直道均=' + (cc.straights.reduce((a, b) => a + b.len, 0) / cc.straights.length).toFixed(0).padStart(4) +
    ' 非邻=' + minD.toFixed(0).padStart(4) + ' 左=' + pos.toFixed(0) + ' 右=' + neg.toFixed(0) + ' 单向=' + (100 * Math.max(pos, neg) / (pos + neg)).toFixed(0) + '%');
  if (showAscii) console.log(ascii(t));
  return { t, closed, cc };
}

export function ascii(t, W = 76, H = 30) {
  const P = t.pts; const xs = P.map(p => p.x), zs = P.map(p => p.z);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
  const g = []; for (let r = 0; r < H; r++) g.push(new Array(W).fill(' '));
  for (let i = 0; i < P.length; i += 2) {
    const c = Math.min(W - 1, Math.round((P[i].x - x0) / (x1 - x0 + 1e-9) * (W - 1)));
    const r = Math.min(H - 1, Math.round((P[i].z - z0) / (z1 - z0 + 1e-9) * (H - 1)));
    g[r][c] = '#';
  }
  const sr = Math.min(H - 1, Math.round((P[0].z - z0) / (z1 - z0 + 1e-9) * (H - 1)));
  const sc = Math.min(W - 1, Math.round((P[0].x - x0) / (x1 - x0 + 1e-9) * (W - 1)));
  g[sr][sc] = 'S';
  return g.map(r => r.join('')).join('\n');
}

export function crown(n, tipR, valR, la, lb) {
  const A = Array.isArray(la) ? la : new Array(n).fill(la);
  const B = Array.isArray(lb) ? lb : new Array(n).fill(lb);
  const segs = [];
  for (let i = 0; i < n; i++) segs.push(['s', A[i]], ['a', tipR, 180], ['s', B[i]], ['a', valR, -(180 - 360 / n)]);
  return segs;
}

export const PRESETS = {
  // ch3 蓝屿环道: 6 齿 (6 个 U 型弯 + 6 个 120 度反向弯), 直道 >=72
  ch3: crown(6, 22, 24, [150, 72, 72, 72, 72, 72], [72, 72, 72, 72, 72, 72]),
  // ch5 麦浪平原环道: 7 齿 (7 个 U 型弯 + 7 个 128.6 度反向弯)
  ch5: crown(7, 22, 23, [150, 72, 72, 72, 72, 72, 72], [72, 72, 72, 72, 72, 72, 72]),
  // ch6 暖金丘环道: 8 组大小不一 (160-180 度 U 型弯 / 110-150 度反向弯)
  ch6: [
    ['s', 150], ['a', 22, 180], ['s', 70], ['a', 26, -120],
    ['s', 70], ['a', 24, 180], ['s', 70], ['a', 24, -140],
    ['s', 70], ['a', 20, 160], ['s', 70], ['a', 28, -110],
    ['s', 70], ['a', 26, 180], ['s', 70], ['a', 22, -150],
    ['s', 70], ['a', 22, 180], ['s', 70], ['a', 26, -120],
    ['s', 70], ['a', 24, 160], ['s', 70], ['a', 24, -140],
    ['s', 70], ['a', 26, 180], ['s', 70], ['a', 22, -110],
    ['s', 70], ['a', 22, 180], ['s', 70], ['a', 26, -150],
  ],
  // ch7 长风草原环道: 8 齿, 直道 84 更舒展
  ch7: crown(8, 22, 22, [180, 84, 84, 84, 84, 84, 84, 84], [84, 84, 84, 84, 84, 84, 84, 84]),
};

if (process.argv[2] !== 'try') { /* imported as a library */ } else {
const tag = process.argv[3] || 'ch3';
let segs = PRESETS[tag];
const e = rawEnd(segs);
console.log(tag + ' raw=' + Math.hypot(e.x, e.z).toFixed(1) + ' degSum=' + segs.filter(s => s[0] === 'a').reduce((a, s) => a + s[2], 0).toFixed(2));
const rf = refineMinNorm(segs);
if (rf) { segs = rf.segs; console.log('refined dl=[' + rf.dl.map(v => v.toFixed(1)).join(',') + '] -> err=' + Math.hypot(rawEnd(segs).x, rawEnd(segs).z).toFixed(2)); }
const r = report(tag, segs, 15);
console.log('corners: ' + r.cc.cs.map(c => (c.sweep > 0 ? 'L' : 'R') + Math.abs(c.sweep).toFixed(0) + '@R' + c.minR.toFixed(0)).join(' '));
console.log('straights: ' + r.cc.straights.map(s => s.len.toFixed(0)).join(' '));
console.log('spec: ' + JSON.stringify(segs.map(s => s[0] === 's' ? ['s', +s[1].toFixed(0)] : ['a', s[1], +s[2].toFixed(1)])));
}
