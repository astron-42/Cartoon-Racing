
// 赛道几何: 控制点 → Catmull-Rom 闭合样条 → 等距采样 → 弧长/切线/法线查询。
// 几何只有一份, 两个章节通过主题换色复用 (PRD FR-05 假设: MVP 2 章)。

const SUBDIV = 26;

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}
function catmullRomD(p0, p1, p2, p3, t) {
  const t2 = t * t;
  return 0.5 * ((-p0 + p2) + (2 * p0 - 5 * p1 + 4 * p2 - p3) * 2 * t + (-p0 + 3 * p1 - 3 * p2 + p3) * 3 * t2);
}

// 赛道中心线: 椭圆 + 二次谐波 (轻微 S 形), 保证曲率平缓 —— 无折角, 最小转弯半径约 43 m。
// 形状由公式生成而非手写坐标, 便于再调参; 相位取 -90° 使起跑线落在最平直处。
const SHAPE = { A: 156, B: 8, C: 98, D: 7, scale: 0.8152, count: 20, phase: -Math.PI / 2 };
function centerlinePoint(t) {
  const { A, B, C, D, scale } = SHAPE;
  return [scale * (A * Math.cos(t) + B * Math.cos(2 * t)), scale * (C * Math.sin(t) + D * Math.sin(2 * t))];
}
const CONTROL_POINTS = Object.freeze(
  Array.from({ length: SHAPE.count }, (_, i) => {
    const p = centerlinePoint(SHAPE.phase + (i / SHAPE.count) * Math.PI * 2);
    return [Number(p[0].toFixed(1)), Number(p[1].toFixed(1))];
  }),
);

class Track {
  constructor(points = CONTROL_POINTS, width = 15.0) {
    this.width = width;
    this.halfWidth = width * 0.5;
    this.points = points;
    const pts = [];
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const p0 = points[(i - 1 + n) % n], p1 = points[i], p2 = points[(i + 1) % n], p3 = points[(i + 2) % n];
      for (let k = 0; k < SUBDIV; k++) {
        const t = k / SUBDIV;
        pts.push({
          x: catmullRom(p0[0], p1[0], p2[0], p3[0], t),
          z: catmullRom(p0[1], p1[1], p2[1], p3[1], t),
          dx: catmullRomD(p0[0], p1[0], p2[0], p3[0], t),
          dz: catmullRomD(p0[1], p1[1], p2[1], p3[1], t),
        });
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
    // 均匀化采样: 每个点等弧长, 简化曲率/切线差分
    const STEP = 1.0;
    const N = Math.max(64, Math.round(total / STEP));
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
      const x = a.x + (b.x - a.x) * f, z = a.z + (b.z - a.z) * f;
      const dx = b.x - a.x, dz = b.z - a.z;
      const len = Math.hypot(dx, dz) || 1e-6;
      this.pts.push({ x, z, dx, dz });
      this.arc.push(s);
      this.spacing = total / N;
    }
    this.sampleCount = this.pts.length;
    // 切线 (中心差分, 等弧长 → 稳定)
    this.tan = [];
    for (let i = 0; i < this.sampleCount; i++) {
      const a = this.pts[(i - 1 + this.sampleCount) % this.sampleCount];
      const b = this.pts[(i + 1) % this.sampleCount];
      const dx = b.x - a.x, dz = b.z - a.z;
      const len = Math.hypot(dx, dz) || 1e-6;
      this.tan.push({ tx: dx / len, tz: dz / len });
    }
    // 曲率 (rad/m) 与最小转弯半径
    this.curv = [];
    let maxK = 0;
    for (let i = 0; i < this.sampleCount; i++) {
      const a = this.tan[(i - 1 + this.sampleCount) % this.sampleCount];
      const b = this.tan[(i + 1) % this.sampleCount];
      let dot = a.tx * b.tx + a.tz * b.tz;
      dot = Math.max(-1, Math.min(1, dot));
      const k = Math.acos(dot) / (2 * this.spacing);
      this.curv.push(k);
      if (k > maxK) maxK = k;
    }
    this.maxCurvature = maxK;
    this.minRadius = 1 / Math.max(maxK, 1e-9);
    // 空间哈希
    this.cell = 24;
    this.grid = new Map();
    for (let i = 0; i < this.sampleCount; i++) {
      const k = Math.floor(this.pts[i].x / this.cell) + ',' + Math.floor(this.pts[i].z / this.cell);
      let arr = this.grid.get(k); if (!arr) { arr = []; this.grid.set(k, arr); }
      arr.push(i);
    }
  }

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
    return { x: p.x, z: p.z, tx: t.tx, tz: t.tz, nx: -t.tz, nz: t.tx, s };
  }

  curvatureAt(s) { return this.curv[this.indexAt(s)]; }

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

  // 安全复位点: 位于中心线, 朝向赛道前进方向, 避免复位后立刻再次出界
  safePoint(s, lateralRatio = 0) {
    const a = this.sample(s);
    const lat = Math.max(-1, Math.min(1, lateralRatio)) * this.halfWidth * 0.5;
    return { x: a.x + a.nx * lat, z: a.z + a.nz * lat, heading: Math.atan2(a.tx, a.tz) };
  }
}

function buildTrack(points = CONTROL_POINTS, width = 15.0) { return new Track(points, width); }

