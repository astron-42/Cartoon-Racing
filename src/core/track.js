import { PHYS } from './constants.js';
// 赛道几何 v2: 用"路段脚本"(直线 + 圆弧)描述赛道走线, 支持高程起伏。
// 八条环道各有一份独立几何, 全部为虚构走线: 名字与形状属于这套纸雕世界, 不影射任何现实赛车场。
// 注意: 参数化走线, 靠 closeByLengths 自动闭合, 不是测绘复刻。

export const TRACK_STEP = 2;                 // 生成中心线的采样步长 (m)

// 路段: ['s', 长度] 直线 | ['a', 半径, 转角°] 圆弧 (转角正 = 左转)
export const LAYOUTS = Object.freeze({
  valley: Object.freeze({
    key: 'valley', name: '暖谷环道', ref: '虚构环道走线',
    width: 15.0,
    elev: [[0, 0], [0.09, 0], [0.21, 6.5], [0.33, 1.2], [0.47, 9.5], [0.59, 2.6], [0.72, 11.0], [0.85, 3.4]],
    segments: [
      ['s', 202], ['a', 38, -88], ['s', 47], ['a', 52, 83], ['s', 34],
      ['a', 30, -115], ['s', 27], ['a', 32, 84], ['s', 22], ['a', 30, -96],
      ['s', 61], ['a', 58, 55], ['s', 68], ['a', 24, -183], ['s', 42],
      ['a', 44, 80], ['s', 30], ['a', 34, -78], ['s', 50], ['a', 50, 55],
      ['s', 38], ['a', 32, -77], ['s', 35], ['a', 44, 80], ['s', 52],
      ['a', 60, -41], ['s', 39], ['a', 48, -116],
    ],
  }),
  strait: Object.freeze({
    key: 'strait', name: '落霞湾环道', ref: '虚构环道走线',
    width: 15.0,
    elev: [[0, 0], [0.12, 1.0], [0.28, 7.5], [0.42, 0.5], [0.56, 5.5], [0.70, 10.5], [0.88, 2.0]],
    segments: [
      ['s', 300], ['a', 60, -90], ['s', 180], ['a', 45, 55], ['a', 45, -55],
      ['s', 60], ['a', 50, -90], ['s', 120], ['a', 30, -170], ['s', 40],
      ['a', 30, 170], ['a', 55, -90], ['s', 140], ['a', 70, -90],
    ],
  }),
  zhuhai: Object.freeze({
    key: 'zhuhai', name: '蓝屿环道', ref: '虚构环道走线',
    width: 15.0,
    elev: [[0, 0], [0.22, 2.5], [0.45, 6.0], [0.68, 1.5], [0.86, 4.5]],
    // 海岸长豆形: 北岸长直道 + 东端钩弯 + 南岸深海湾 (tools/route.mjs 轮廓法生成, 与走线设计稿一致)
    segments: [
      ['s', 322.2], ['a', 35, 12.656], ['s', 101.1], ['a', 28.6, 44.301], ['s', 74.2],
      ['a', 31.8, 49.627], ['s', 72.3], ['a', 31.8, 40.373], ['s', 84.4], ['a', 28.6, 17.592],
      ['s', 55.6], ['a', 25.4, 92.359], ['s', 87.3], ['a', 22.9, -52.058], ['s', 62.6],
      ['a', 21.6, -93.759], ['s', 81.4], ['a', 24.2, 45.655], ['s', 74.7], ['a', 28.6, 50.02],
      ['s', 89.3], ['a', 31.8, 33.921], ['s', 83.7], ['a', 35, 54.162], ['s', 69.9],
      ['a', 31.8, 31.809], ['s', 26.1], ['a', 28.6, 14.436], ['s', 18.8], ['a', 28.6, 18.904],
    ],
  }),
  macau: Object.freeze({
    key: 'macau', name: '霓虹街环道', ref: '虚构环道走线',
    width: 14.0,
    elev: [[0, 0], [0.18, 3.5], [0.34, 8.5], [0.50, 4.0], [0.66, 9.5], [0.82, 2.0]],
    segments: [
      ['s', 713.7], ['a', 22, -38.7], ['s', 112.1], ['a', 20, -44.6], ['s', 156],
      ['a', 20, -38.3], ['s', 137.9], ['a', 18, -47.1], ['s', 194.3], ['a', 20, 10.5],
      ['s', 296.5], ['a', 26, -143.4], ['s', 10.3], ['a', 24, 138.7], ['s', 62.7],
      ['a', 22, -47.4], ['s', 119.5], ['a', 20, -52.1], ['s', 135.7], ['a', 18, -35.9],
      ['s', 126], ['a', 20, 76.7], ['s', 104.1], ['a', 18, -3.4], ['s', 17.4],
      ['a', 16, -135],
    ],
  }),
  ningbo: Object.freeze({
    key: 'ningbo', name: '麦浪平原环道', ref: '虚构环道走线',
    width: 15.0,
    elev: [[0, 0], [0.20, 1.5], [0.42, 5.5], [0.63, 2.0], [0.82, 7.0]],
    // 哑铃形: 西大东小两个环 + 中间窄走廊
    segments: [
      ['s', 143.9], ['a', 45.8, -16.39], ['s', 120.7], ['a', 34.3, 25.852], ['s', 98.8],
      ['a', 30.5, 33.99], ['s', 60.7], ['a', 38.1, 76.024], ['s', 53.3], ['a', 41.9, 45.698],
      ['s', 111.3], ['a', 34.3, 16.872], ['s', 82], ['a', 26.7, 73.023], ['s', 81],
      ['a', 22.9, -75.069], ['s', 127], ['a', 53.4, -32.471], ['s', 176.5], ['a', 45.8, 16.947],
      ['s', 107.6], ['a', 38.1, 72.619], ['s', 103.5], ['a', 34.3, 67.414], ['s', 103.8],
      ['a', 41.9, 54.059], ['s', 120.8], ['a', 53.4, 21.988], ['s', 142.8], ['a', 53.4, -20.556],
    ],
  }),
  tianjin: Object.freeze({
    key: 'tianjin', name: '暖金丘环道', ref: '虚构环道走线',
    width: 15.5,
    elev: [[0, 0], [0.15, 1.0], [0.32, 4.5], [0.50, 8.0], [0.68, 3.0], [0.85, 6.0]],
    // 蛇形三腿: 三条不等长平行路 + 两个发夹回折
    segments: [
      ['s', 385.5], ['a', 29.6, 51.892], ['s', 32.4], ['a', 26.3, 119.745], ['s', 226.8],
      ['a', 25, -90.361], ['s', 21.9], ['a', 27.6, -77.978], ['s', 216.5], ['a', 26.3, 73.113],
      ['s', 24.5], ['a', 25, 99.531], ['s', 424], ['a', 36.2, 85.695], ['s', 224.1],
      ['a', 39.5, 90.316], ['s', 37.2], ['a', 32.9, 8.048],
    ],
  }),
  ordos: Object.freeze({
    key: 'ordos', name: '长风草原环道', ref: '虚构环道走线',
    width: 16.0,
    elev: [[0, 0], [0.28, 3.0], [0.55, 8.0], [0.80, 4.0]],
    // 用户手绘走线 (m04313): 底部长直道 + 左上长斜线/尖刺 + 东端大回环 + 中右小环
    segments: [
      ['s', 234.3], ['a', 57.8, 18.087], ['s', 46.1], ['a', 26.8, 113.966], ['s', 46.6],
      ['a', 57.8, 16.366], ['s', 179.3], ['a', 57.8, 25.792], ['s', 41.9], ['a', 45.5, 71.222],
      ['s', 14.4], ['a', 34.6, -62.127], ['s', 10.3], ['a', 43.9, -37.572], ['s', 67.9],
      ['a', 57.8, 21.72], ['s', 56.7], ['a', 57.8, 15.599], ['s', 63.7], ['a', 57.8, -21.297],
      ['s', 114.6], ['a', 57.8, 18.514], ['s', 92.2], ['a', 57.8, 36.209], ['s', 49],
      ['a', 57.8, 41.774], ['s', 38.1], ['a', 47.5, 58.235], ['s', 18.4], ['a', 57.8, 41.843],
      ['s', 90.5], ['a', 57.8, -12.621], ['s', 125.1], ['a', 25.3, -46.759], ['s', 10.3],
      ['a', 15.3, -106.467], ['s', 32.7], ['a', 57.8, 13.785], ['s', 42.2], ['a', 21.4, 50.87],
      ['s', 10.3], ['a', 18.2, 76.128], ['s', 12.6], ['a', 48.9, 19.475], ['s', 44.6],
      ['a', 57.8, -13.296], ['s', 50.3], ['a', 57.8, 23.388], ['s', 43.2], ['a', 57.8, 31.581],
      ['s', 49.9], ['a', 57.8, 21.319], ['s', 29.7], ['a', 57.8, -41.846], ['s', 69.3],
      ['a', 57.8, -13.887],
    ],
  }),
  chengdu: Object.freeze({
    key: 'chengdu', name: '晨雾峡环道', ref: '虚构环道走线',
    width: 15.0,
    elev: [[0, 0], [0.14, 2.0], [0.30, 6.5], [0.45, 3.0], [0.60, 9.0], [0.75, 1.5], [0.90, 5.0]],
    segments: [
      ['s', 404], ['a', 55, -70], ['s', 47], ['a', 50, 70], ['s', 47],
      ['a', 50, -70], ['s', 47], ['a', 50, 70], ['s', 47], ['a', 50, -70],
      ['s', 67], ['a', 20, -175], ['s', 81], ['a', 55, 80], ['s', 94],
      ['a', 60, -60], ['s', 121], ['a', 55, 60], ['s', 108], ['a', 50, -65],
      ['s', 135], ['a', 60, -130],
    ],
  }),
});

export function buildPolyline(segments, step = TRACK_STEP) {
  let x = 0, z = 0, h = 0;                 // 前向 = (cos h, sin h)
  const pts = [{ x, z, h }];
  for (const seg of segments) {
    if (seg[0] === 's') {
      const n = Math.max(1, Math.round(seg[1] / step));
      for (let i = 0; i < n; i++) { x += Math.cos(h) * step; z += Math.sin(h) * step; pts.push({ x, z, h }); }
    } else {
      const R = seg[1], th = seg[2] * Math.PI / 180;
      const n = Math.max(2, Math.round(R * Math.abs(th) / step));
      const dh = th / n;
      for (let i = 0; i < n; i++) { h += dh; x += Math.cos(h) * step; z += Math.sin(h) * step; pts.push({ x, z, h }); }
    }
  }
  return pts;
}

// 闭合求解: 转角按比例归一到 ±360°(航向精确闭合), 再用"直道长度"吸收位置误差。
// 位置对直道长度是线性的(方向只由转角决定), 所以这是一个 2×2 最小范数问题 —— 弯道形状完全不变。
export function closeByLengths(segments) {
  let sum = 0;
  for (const s of segments) if (s[0] === 'a') sum += s[2] * Math.PI / 180;
  const target = sum < 0 ? -Math.PI * 2 : Math.PI * 2;
  const k = sum ? target / sum : 1;
  let x = 0, z = 0, h = 0;
  const us = [], lens = [];
  for (const s of segments) {
    if (s[0] === 's') {
      us.push(Math.cos(h), Math.sin(h));
      lens.push(s[1]);
      x += Math.cos(h) * s[1]; z += Math.sin(h) * s[1];
    } else {
      const R = s[1], th = (s[2] * Math.PI / 180) * k;
      const n = Math.max(2, Math.round(R * Math.abs(th) / TRACK_STEP));
      const dh = th / n;
      for (let i = 0; i < n; i++) { h += dh; x += Math.cos(h) * TRACK_STEP; z += Math.sin(h) * TRACK_STEP; }
    }
  }
  const E = [-x, -z];
  let m00 = 0, m01 = 0, m11 = 0;
  for (let i = 0; i < lens.length; i++) {
    const w2 = Math.pow(Math.max(8, lens[i]), 2);
    const ux = us[i * 2], uz = us[i * 2 + 1];
    m00 += w2 * ux * ux; m01 += w2 * ux * uz; m11 += w2 * uz * uz;
  }
  const det = m00 * m11 - m01 * m01;
  const out = [];
  if (Math.abs(det) < 1e-9) {
    for (const s of segments) out.push(s[0] === 'a' ? ['a', s[1], s[2] * k] : s);
    return out;
  }
  const l0 = (E[0] * m11 - E[1] * m01) / det;
  const l1 = (E[1] * m00 - E[0] * m01) / det;
  for (let i = 0, j = 0; i < segments.length; i++) {
    const s = segments[i];
    if (s[0] === 's') {
      const w2 = Math.pow(Math.max(8, lens[j]), 2);
      const ux = us[j * 2], uz = us[j * 2 + 1];
      out.push(['s', Math.max(4, s[1] + w2 * (ux * l0 + uz * l1))]);
      j++;
    } else {
      out.push(['a', s[1], s[2] * k]);
    }
  }
  return out;
}

// 闭合修正: 先把航向残差按弧长比例"扭"回去, 再摊掉位置残差 (线性翘曲, 不破坏走线性格)
export function closeLoop(raw) {
  const n = raw.length - 1;
  let dth = raw[n].h - raw[0].h;
  while (dth > Math.PI) dth -= Math.PI * 2;
  while (dth < -Math.PI) dth += Math.PI * 2;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, ang = -dth * u, c = Math.cos(ang), s = Math.sin(ang);
    const x = raw[i].x, z = raw[i].z;
    pts.push({ x: x * c - z * s, z: x * s + z * c, u });
  }
  const ex = pts[0].x - pts[n].x, ez = pts[0].z - pts[n].z;
  return pts.map(p => ({ x: p.x + ex * p.u, z: p.z + ez * p.u }));
}

export function smoothClosed(pts, passes, w) {
  let cur = pts;
  for (let k = 0; k < passes; k++) {
    cur = cur.map((p, i) => {
      const a = cur[(i - 1 + cur.length) % cur.length], b = cur[(i + 1) % cur.length];
      return { x: p.x + ((a.x + b.x) * 0.5 - p.x) * w, z: p.z + ((a.z + b.z) * 0.5 - p.z) * w };
    });
  }
  return cur;
}

// 闭合高程剖面: 控制点 [u, y] 之间用余弦过渡 (端点导数为 0 → 坡顶坡底平顺)
export function heightAtU(prof, u) {
  u -= Math.floor(u);
  let i = 0;
  while (i < prof.length - 1 && prof[i + 1][0] <= u) i++;
  const a = prof[i], b = prof[(i + 1) % prof.length];
  let u1 = b[0]; if (u1 <= a[0]) u1 += 1;
  let uu = u; if (uu < a[0]) uu += 1;
  const t = Math.max(0, Math.min(1, (uu - a[0]) / (u1 - a[0] || 1)));
  const s = 0.5 - 0.5 * Math.cos(Math.PI * t);
  return a[1] + (b[1] - a[1]) * s;
}

export function layoutPoints(key) {
  const L = LAYOUTS[key] || LAYOUTS.valley;
  return smoothClosed(closeLoop(buildPolyline(closeByLengths(L.segments))), 1, 0.12);
}

export const SUBDIV = 26;
export function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}
export function catmullRomD(p0, p1, p2, p3, t) {
  const t2 = t * t;
  return 0.5 * ((-p0 + p2) + (2 * p0 - 5 * p1 + 4 * p2 - p3) * 2 * t + (-p0 + 3 * p1 - 3 * p2 + p3) * 3 * t2);
}

export class Track {
  // points: [x,z] 数组。默认按控制点做 Catmull-Rom 细分; dense=true 时视为已采样的中心线。
  constructor(points, width = 15.0, opts = {}) {
    this.width = width;
    this.halfWidth = width * 0.5;
    this.points = points;
    this.elev = opts.elev || null;
    this.name = opts.name || '';
    const pts = [];
    if (opts.dense) {
      for (const p of points) pts.push({ x: p[0] !== undefined ? p[0] : p.x, z: p[1] !== undefined ? p[1] : p.z });
    } else {
      const n = points.length;
      for (let i = 0; i < n; i++) {
        const p0 = points[(i - 1 + n) % n], p1 = points[i], p2 = points[(i + 1) % n], p3 = points[(i + 2) % n];
        for (let k = 0; k < SUBDIV; k++) {
          const t = k / SUBDIV;
          pts.push({
            x: catmullRom(p0[0], p1[0], p2[0], p3[0], t),
            z: catmullRom(p0[1], p1[1], p2[1], p3[1], t),
          });
        }
      }
    }
    this.pts = pts;
    this.sampleCount = pts.length;
    let total = 0;
    const arc = [0];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      total += Math.hypot(b.x - a.x, b.z - a.z);
      arc.push(total);
    }
    this.arc = arc;
    this.total = total;
    const STEPU = 1.0;
    const N = Math.max(64, Math.round(total / STEPU));
    this.uneven = { pts, arc, count: pts.length };
    this.pts = [];
    this.arc = [];
    for (let i = 0; i < N; i++) {
      const s = i * (total / N);
      let lo = 0, hi = pts.length;
      while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (arc[mid] <= s) lo = mid; else hi = mid; }
      const a = pts[lo], b = pts[(lo + 1) % pts.length];
      const segLen = arc[lo + 1] - arc[lo] || 1e-6;
      const f = (s - arc[lo]) / segLen;
      this.pts.push({ x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f });
      this.arc.push(s);
      this.spacing = total / N;
    }
    this.sampleCount = this.pts.length;
    this.tan = [];
    for (let i = 0; i < this.sampleCount; i++) {
      const a = this.pts[(i - 1 + this.sampleCount) % this.sampleCount];
      const b = this.pts[(i + 1) % this.sampleCount];
      const dx = b.x - a.x, dz = b.z - a.z;
      const len = Math.hypot(dx, dz) || 1e-6;
      this.tan.push({ tx: dx / len, tz: dz / len });
    }
    this.curv = [];
    let maxK = 0, maxKI = 0;
    for (let i = 0; i < this.sampleCount; i++) {
      const a = this.tan[(i - 1 + this.sampleCount) % this.sampleCount];
      const b = this.tan[(i + 1) % this.sampleCount];
      let dot = a.tx * b.tx + a.tz * b.tz;
      dot = Math.max(-1, Math.min(1, dot));
      const k = Math.acos(dot) / (2 * this.spacing);
      this.curv.push(k);
      if (k > maxK) { maxK = k; maxKI = i; }
    }
    // 中心线是直线段拼的, 接头处会出现虚假曲率尖峰 → 平滑 3 遍再取最紧处
    for (let pass = 0; pass < 3; pass++) {
      const c = this.curv.slice();
      for (let i = 0; i < this.sampleCount; i++) {
        const a = c[(i - 1 + this.sampleCount) % this.sampleCount], b = c[(i + 1) % this.sampleCount];
        this.curv[i] = (a + 2 * c[i] + b) * 0.25;
      }
    }
    maxK = 0; maxKI = 0;
    for (let i = 0; i < this.sampleCount; i++) if (this.curv[i] > maxK) { maxK = this.curv[i]; maxKI = i; }
    this.maxCurvature = maxK;
    this.minRadius = 1 / Math.max(maxK, 1e-9);
    this.tightestAt = maxKI * this.spacing;
    this.maxHeight = 0;
    if (this.elev) for (const e of this.elev) this.maxHeight = Math.max(this.maxHeight, e[1]);
    this.cell = 24;
    this.grid = new Map();
    for (let i = 0; i < this.sampleCount; i++) {
      const k = Math.floor(this.pts[i].x / this.cell) + ',' + Math.floor(this.pts[i].z / this.cell);
      let arr = this.grid.get(k); if (!arr) { arr = []; this.grid.set(k, arr); }
      arr.push(i);
    }
  }

  // 高程 (m): u = 沿赛道进度 0..1
  heightAtU(u) { return this.elev ? heightAtU(this.elev, u) : 0; }
  heightAt(s) { return this.heightAtU((s / this.total) % 1); }

  indexAt(s) {
    const N = this.sampleCount;
    let d = s % this.total; if (d < 0) d += this.total;
    let i = Math.round(d / this.spacing);
    return ((i % N) + N) % N;
  }

  sample(s) {
    const N = this.sampleCount;
    const i = this.indexAt(s);
    const p = this.pts[i], t = this.tan[i];
    let ss = s % this.total; if (ss < 0) ss += this.total;
    return { x: p.x, z: p.z, y: this.heightAt(ss), tx: t.tx, tz: t.tz, nx: -t.tz, nz: t.tx, s };
  }

  curvatureAt(s) { return this.curv[this.indexAt(s)]; }

  // 弯道极限速度 (m/s): v = sqrt(a_lat * R)
  cornerSpeedAt(s, aLat = 9) { return Math.sqrt(aLat / Math.max(this.curvatureAt(s), 1e-6)); }

  project(x, z) {
    const cx = Math.floor(x / this.cell), cz = Math.floor(z / this.cell);
    let best = -1, bestD = Infinity;
    for (let ox = -1; ox <= 1; ox++) for (let oz = -1; oz <= 1; oz++) {
      const arr = this.grid.get((cx + ox) + ',' + (cz + oz));
      if (!arr) continue;
      for (const i of arr) {
        const p = this.pts[i], d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
        if (d < bestD) { bestD = d; best = i; }
      }
    }
    if (best < 0) best = this.nearest(x, z).index;
    const p = this.pts[best], q = this.pts[(best + 1) % this.sampleCount];
    const dx = q.x - p.x, dz = q.z - p.z;
    const segLen = Math.hypot(dx, dz) || 1e-6;
    const tx = dx / segLen, tz = dz / segLen;
    const along = (x - p.x) * tx + (z - p.z) * tz;
    const clamped = Math.max(-segLen, Math.min(segLen, along));
    const s = this.arc[best] + clamped;
    const lateral = (x - (p.x + tx * clamped)) * (-tz) + (z - (p.z + tz * clamped)) * tx;
    return { s, lateral, dist: Math.sqrt(Math.max(0, bestD)), index: best, tangent: { x: tx, z: tz } };
  }

  nearest(x, z) {
    let best = 0, bestD = Infinity;
    for (let i = 0; i < this.sampleCount; i++) {
      const p = this.pts[i], d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
      if (d < bestD) { bestD = d; best = i; }
    }
    return { index: best, dist: Math.sqrt(bestD) };
  }

  // 安全复位点: 位于中心线附近, 朝向赛道前进方向
  safePoint(s, lateralRatio = 0) {
    const a = this.sample(s);
    const lat = Math.max(-1, Math.min(1, lateralRatio)) * this.halfWidth * 0.5;
    return { x: a.x + a.nx * lat, z: a.z + a.nz * lat, y: a.y, heading: Math.atan2(a.tx, a.tz) };
  }
}

export function buildTrack(key = 'valley', width = 18.0) {
  const L = LAYOUTS[key] || LAYOUTS.valley;
  const pts = layoutPoints(key).map(p => [p.x, p.z]);
  return new Track(pts, width, { dense: true, elev: L.elev, name: L.name });
}
