// 生成平滑环形赛道的控制点: x=A cos t + B cos 2t, z=C sin t + D sin 2t
// 目标: 总长 ~660 m, 最小转弯半径 >= 42 m, 起跑线落在最平直的位置
function analyze(pts, subdiv = 26, target = 1.0) {
  const n = pts.length;
  const cr = (p0, p1, p2, p3, t) => 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
  const raw = [];
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n], d = pts[(i + 2) % n];
    for (let k = 0; k < subdiv; k++) raw.push([cr(a[0], b[0], c[0], d[0], k / subdiv), cr(a[1], b[1], c[1], d[1], k / subdiv)]);
  }
  let total = 0; const arc = [0];
  for (let i = 0; i < raw.length; i++) { const a = raw[i], b = raw[(i + 1) % raw.length]; total += Math.hypot(b[0] - a[0], b[1] - a[1]); arc.push(total); }
  const N = Math.max(64, Math.round(total / target));
  const P = [];
  for (let i = 0; i < N; i++) {
    const s = i * (total / N);
    let lo = 0, hi = raw.length;
    while (lo < hi - 1) { const m = (lo + hi) >> 1; if (arc[m] <= s) lo = m; else hi = m; }
    const a = raw[lo], b = raw[(lo + 1) % raw.length];
    const f = (s - arc[lo]) / ((arc[lo + 1] - arc[lo]) || 1e-6);
    P.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
  }
  const spacing = total / N;
  const T = [];
  for (let i = 0; i < N; i++) { const a = P[(i - 1 + N) % N], b = P[(i + 1) % N]; const dx = b[0] - a[0], dz = b[1] - a[1]; const L = Math.hypot(dx, dz) || 1e-6; T.push([dx / L, dz / L]); }
  const R = [];
  for (let i = 0; i < N; i++) {
    const a = T[(i - 1 + N) % N], b = T[(i + 1) % N];
    const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1]));
    R.push(1 / Math.max(Math.acos(dot) / (2 * spacing), 1e-9));
  }
  // 最平直的 40 m 窗口 (起跑线应落在这里)
  const W = Math.round(40 / spacing);
  let bestI = 0, bestScore = -Infinity;
  for (let i = 0; i < N; i++) { let s = 0; for (let j = 0; j < W; j++) s += R[(i + j) % N]; if (s > bestScore) { bestScore = s; bestI = i; } }
  return { P, R, total, spacing, N, flatStart: (bestI + Math.floor(W / 2)) % N };
}
function emit(A, B, C, D, n, wantLen = 660) {
  const pts = [];
  for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; pts.push([A * Math.cos(t) + B * Math.cos(2 * t), C * Math.sin(t) + D * Math.sin(2 * t)]); }
  const a0 = analyze(pts);
  const scale = wantLen / a0.total;
  const sp = pts.map(p => [p[0] * scale, p[1] * scale]);
  const a = analyze(sp, 26, 1.0);
  const Rmin = Math.min(...a.R);
  const Rmax = Math.max(...a.R);
  const straight = a.R.filter(r => r > 150).length / a.N;
  const slow = a.R.filter(r => r < 70).length / a.N;
  return { a, sp, Rmin, Rmax, straight, slow, scale };
}
const cands = [];
for (const A of [120, 132, 144, 156]) for (const C of [80, 89, 98, 107]) for (const B of [0, 8, 14, 20]) for (const D of [0, 7, 12, 17]) cands.push([A, B, C, D]);
const rows = [];
for (const [A, B, C, D] of cands) {
  const e = emit(A, B, C, D, 16);
  if (e.Rmin >= 42) rows.push({ A, B, C, D, ...e });
}
rows.sort((x, y) => y.slow - x.slow);
console.log('候选 (Rmin>=42): ' + rows.length + ' / ' + cands.length);
for (const r of rows.slice(0, 12)) {
  console.log('A=' + r.A + ' B=' + r.B + ' C=' + r.C + ' D=' + r.D + ' scale=' + r.scale.toFixed(3) + ' L=' + r.a.total.toFixed(0) + ' Rmin=' + r.Rmin.toFixed(0) + ' Rmax=' + r.Rmax.toFixed(0) + ' 直道%=' + (r.straight * 100).toFixed(0) + ' 慢弯%=' + (r.slow * 100).toFixed(0) + ' 平直段起点s=' + (r.a.flatStart * r.a.spacing).toFixed(0));
}
// 输出最优候选的控制点(旋转到起跑线位于最平直处)
const best = rows[0];
if (best) {
  const a = best.a;
  const n = 20;
  const step = a.N / n;
  const out = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.round((a.flatStart + i * step)) % a.N;
    out.push([+a.P[idx][0].toFixed(1), +a.P[idx][1].toFixed(1)]);
  }
  console.log('');
  console.log('BEST A=' + best.A + ' B=' + best.B + ' C=' + best.C + ' D=' + best.D);
  console.log('export const CONTROL_POINTS = Object.freeze([');
  for (let i = 0; i < out.length; i += 5) console.log('  ' + out.slice(i, i + 5).map(p => '[' + p[0] + ', ' + p[1] + ']').join(', ') + (i + 5 < out.length ? ',' : ','));
  console.log(']);');
  // 起跑线处曲率与最平直窗口长度
  const i0 = a.flatStart;
  console.log('起跑线: 点=(' + a.P[i0][0].toFixed(1) + ',' + a.P[i0][1].toFixed(1) + ') R=' + a.R[i0].toFixed(0) + ' m | 前 40m 平均 R=' + (a.R.slice(i0, i0 + 40).reduce((x, y) => x + y, 0) / 40).toFixed(0) + ' m');
  const itemS = [0.16, 0.42, 0.68, 0.90].map(f => Math.round(f * a.total));
  console.log('道具箱处 R: ' + itemS.map(s => 's=' + s + '→R=' + a.R[Math.round(s / a.spacing) % a.N].toFixed(0)).join(', '));
}
