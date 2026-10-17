// 赛道路型求解器: 只微调弯道转角, 让环路精确闭合(半径/直道性格保留), 再让 closeByLengths 收尾。
import { LAYOUTS, Track, closeByLengths } from '../src/core/track.js';

const STEP = 3;
const D2R = Math.PI / 180;

function walk(segs) {
  let x = 0, z = 0, h = 0;
  for (const s of segs) {
    if (s[0] === 's') {
      const n = Math.max(1, Math.round(s[1] / STEP));
      for (let i = 0; i < n; i++) { x += Math.cos(h) * STEP; z += Math.sin(h) * STEP; }
    } else {
      const th = s[2] * D2R, n = Math.max(2, Math.round(s[1] * Math.abs(th) / STEP)), dh = th / n;
      for (let i = 0; i < n; i++) { h += dh; x += Math.cos(h) * STEP; z += Math.sin(h) * STEP; }
    }
  }
  return { x, z, h };
}

function norm(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }

function solve(segs0, iters = 260) {
  const segs = segs0.map(s => s.slice());
  const idx = []; for (let i = 0; i < segs.length; i++) if (segs[i][0] === 'a') idx.push(i);
  const cost = () => {
    const e = walk(segs);
    let hErr = norm(e.h);                        // 目标: 正好转一圈
    let pen = 0;
    for (const i of idx) pen += Math.pow((segs[i][2] - segs0[i][2]) * D2R, 2);
    return Math.hypot(e.x, e.z) ** 2 + 1.2e6 * hErr * hErr + 260 * pen;
  };
  let best = cost();
  for (let it = 0; it < iters; it++) {
    let improved = false;
    // 全局缩放转角: 修航向
    for (const f of [1.002, 0.998]) {
      const save = idx.map(i => segs[i][2]);
      let sum = 0; for (const i of idx) sum += segs[i][2];
      for (const i of idx) segs[i][2] = segs[i][2] + (sum * (f - 1)) * 0.5;
      const c = cost(); if (c < best) { best = c; improved = true; } else { idx.forEach((i, k) => segs[i][2] = save[k]); }
    }
    // 逐个转角试探
    for (const i of idx) {
      for (const d of [0.6, 0.2, -0.2, -0.6]) {
        const save = segs[i][2];
        segs[i][2] = save + d;
        const c = cost(); if (c < best) { best = c; improved = true; break; } else segs[i][2] = save;
      }
    }
    if (!improved && it > 40) break;
  }
  return { segs, cost: best, err: walk(segs) };
}

function segCross(x1, z1, x2, z2, x3, z3, x4, z4) {
  const d1x = x2 - x1, d1z = z2 - z1, d2x = x4 - x3, d2z = z4 - z3;
  const den = d1x * d2z - d1z * d2x; if (Math.abs(den) < 1e-12) return false;
  const t = ((x3 - x1) * d2z - (z3 - z1) * d2x) / den, u = ((x3 - x1) * d1z - (z3 - z1) * d1x) / den;
  return t > 0.002 && t < 0.998 && u > 0.002 && u < 0.998;
}

function ascii(P, cols = 108, rows = 40) {
  const xs = P.map(p => p.x), zs = P.map(p => p.z);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
  const g = Array.from({ length: rows }, () => new Array(cols).fill(' '));
  const put = (x, z, ch) => {
    const c = Math.round((x - x0) / (x1 - x0 || 1) * (cols - 1));
    const r = Math.round((z - z0) / (z1 - z0 || 1) * (rows - 1));
    if (r >= 0 && r < rows && c >= 0 && c < cols) g[r][c] = ch;
  };
  for (let i = 0; i < P.length; i += 2) put(P[i].x, P[i].z, '.');
  for (let i = 0; i < P.length; i += 18) put(P[i].x, P[i].z, 'o');
  put(P[0].x, P[0].z, 'S');
  return g.map(r => r.join('')).join('\n');
}

for (const key of Object.keys(LAYOUTS)) {
  const s0 = LAYOUTS[key].segments;
  const { segs, err } = solve(s0);
  const closed = closeByLengths(segs);
  const pts = (() => {
    let x = 0, z = 0, h = 0; const out = [[0, 0]];
    for (const s of closed) {
      if (s[0] === 's') { const n = Math.max(1, Math.round(s[1] / STEP)); for (let i = 0; i < n; i++) { x += Math.cos(h) * STEP; z += Math.sin(h) * STEP; out.push([x, z]); } }
      else { const th = s[2] * D2R, n = Math.max(2, Math.round(s[1] * Math.abs(th) / STEP)), dh = th / n; for (let i = 0; i < n; i++) { h += dh; x += Math.cos(h) * STEP; z += Math.sin(h) * STEP; out.push([x, z]); } }
    }
    return out;
  })();
  const t = new Track(pts, 15.0, { dense: true, elev: LAYOUTS[key].elev, name: key });
  let cross = 0;
  const stride = 3;
  for (let i = 0; i < pts.length; i += stride) for (let j = i + stride * 2; j < pts.length; j += stride) {
    if (segCross(pts[i][0], pts[i][1], pts[(i + stride) % pts.length][0], pts[(i + stride) % pts.length][1], pts[j][0], pts[j][1], pts[(j + stride) % pts.length][0], pts[(j + stride) % pts.length][1])) cross++;
  }
  let maxD = 0; for (const i of segs.map((s, k) => s[0] === 'a' ? k : -1).filter(k => k >= 0)) maxD = Math.max(maxD, Math.abs(segs[i][2] - s0[i][2]));
  console.log('=== ' + key + ' === 闭合后误差 ' + Math.hypot(err.x, err.z).toFixed(2) + 'm | 航向残差 ' + (norm(err.h) / D2R).toFixed(2) + '° | 最大转角修正 ' + maxD.toFixed(1) + '° | 长 ' + t.total.toFixed(0) + 'm | 最小R ' + t.minRadius.toFixed(1) + 'm | 自交 ' + cross);
  console.log(ascii(pts));
  console.log('segments: [' + closed.map(s => s[0] === 's' ? "['s'," + s[1].toFixed(0) + "]" : "['a'," + s[1] + ',' + s[2].toFixed(1) + ']').join(',') + ']');
}
