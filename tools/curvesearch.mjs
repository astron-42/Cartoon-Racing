// 搜索一条曲率平缓、长度合适的环形赛道控制点 (替代手写控制点: 手写的 [0,0] 处有 82° 折角)
function measure(pts, subdiv = 26, target = 1.0) {
  const n = pts.length;
  const raw = [];
  const cr = (p0, p1, p2, p3, t) => 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
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
  const T = [];
  for (let i = 0; i < N; i++) { const a = P[(i - 1 + N) % N], b = P[(i + 1) % N]; const dx = b[0] - a[0], dz = b[1] - a[1]; const L = Math.hypot(dx, dz) || 1e-6; T.push([dx / L, dz / L]); }
  let maxK = 0, argS = 0, straight = 0;
  const spacing = total / N;
  for (let i = 0; i < N; i++) {
    const a = T[(i - 1 + N) % N], b = T[(i + 1) % N];
    const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1]));
    const k = Math.acos(dot) / (2 * spacing);
    if (k > maxK) { maxK = k; argS = i * spacing; }
    if (1 / Math.max(k, 1e-9) > 200) straight++;
  }
  return { total, Rmin: 1 / Math.max(maxK, 1e-9), argS, straightFrac: straight / N };
}

// 参数化闭合曲线: x = A cos t + B cos 3t,  z = C sin t + D sin 2t
function curve(A, B, C, D, n) {
  const pts = [];
  for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; pts.push([A * Math.cos(t) + B * Math.cos(3 * t), C * Math.sin(t) + D * Math.sin(2 * t)]); }
  return pts;
}
const cands = [
  [170, 26, 120, 30], [180, 20, 125, 24], [190, 14, 130, 18], [200, 10, 140, 14],
  [175, 30, 118, 34], [165, 34, 112, 38], [210, 0, 140, 12], [185, 22, 132, 22],
  [195, 18, 138, 20], [200, 16, 145, 16], [160, 40, 110, 42], [205, 8, 142, 16],
];
for (const [A, B, C, D] of cands) {
  const line = [];
  for (const n of [10, 12, 14, 16, 20]) {
    const m = measure(curve(A, B, C, D, n));
    line.push('n=' + n + ': L=' + m.total.toFixed(0) + ' Rmin=' + m.Rmin.toFixed(0) + ' 直道占比=' + (m.straightFrac * 100).toFixed(0) + '%');
  }
  console.log('A=' + A + ' B=' + B + ' C=' + C + ' D=' + D + '  ' + line.join(' | '));
}
