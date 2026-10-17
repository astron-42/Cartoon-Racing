import { buildTrack, LAYOUTS } from '../src/core/track.js';
function cross(P, stride) {
  const seg = (x1,z1,x2,z2,x3,z3,x4,z4) => {
    const d1x=x2-x1,d1z=z2-z1,d2x=x4-x3,d2z=z4-z3;
    const den=d1x*d2z-d1z*d2x; if (Math.abs(den)<1e-12) return false;
    const t=((x3-x1)*d2z-(z3-z1)*d2x)/den, u=((x3-x1)*d1z-(z3-z1)*d1x)/den;
    return t>0.002&&t<0.998&&u>0.002&&u<0.998;
  };
  let n = 0; const at = [];
  for (let i = 0; i < P.length; i += stride) for (let j = i + stride * 2; j < P.length; j += stride) {
    const a = P[i], b = P[(i + stride) % P.length], c = P[j], d = P[(j + stride) % P.length];
    if (seg(a.x,a.z,b.x,b.z,c.x,c.z,d.x,d.z)) { n++; if (at.length < 3) at.push((i * 1.0 / P.length * 100).toFixed(0) + '%'); }
  }
  return { n, at };
}
function ascii(P, cols = 104, rows = 34, marks = []) {
  const xs = P.map(p => p.x), zs = P.map(p => p.z);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
  const g = Array.from({ length: rows }, () => new Array(cols).fill(' '));
  const put = (x, z, ch) => {
    const c = Math.round((x - x0) / (x1 - x0 || 1) * (cols - 1));
    const r = Math.round((z - z0) / (z1 - z0 || 1) * (rows - 1));
    if (r >= 0 && r < rows && c >= 0 && c < cols) g[r][c] = ch;
  };
  for (let i = 0; i < P.length; i++) put(P[i].x, P[i].z, '-');
  for (const m of marks) put(m[0], m[1], m[2]);
  return g.map(r => r.join('').replace(/ +$/, '')).join('\n');
}
for (const key of Object.keys(LAYOUTS)) {
  const t = buildTrack(key);
  const P = t.pts;
  const c = cross(P, 2);
  const spd = []; for (let s = 0; s < t.total; s += 5) spd.push(Math.sqrt(9 / Math.max(t.curvatureAt(s), 1e-6)));
  spd.sort((a, b) => a - b);
  const seam = Math.hypot(P[0].x - P[P.length - 1].x, P[0].z - P[P.length - 1].z);
  const xs = P.map(p => p.x), zs = P.map(p => p.z);
  const hs = []; for (let s = 0; s < t.total; s += 10) hs.push(t.heightAt(s));
  console.log('=== ' + key + ' (' + t.name + ') 长 ' + t.total.toFixed(0) + 'm | 最小R ' + t.minRadius.toFixed(1) + 'm @s=' + t.tightestAt.toFixed(0) +
    ' | 自交 ' + c.n + (c.at.length ? ' @' + c.at.join(',') : '') + ' | 接缝 ' + seam.toFixed(2) + 'm | bbox ' + (Math.max(...xs) - Math.min(...xs)).toFixed(0) + '×' + (Math.max(...zs) - Math.min(...zs)).toFixed(0) +
    ' | 落差 ' + (Math.max(...hs) - Math.min(...hs)).toFixed(1) + 'm | 弯速 中位 ' + spd[Math.floor(spd.length / 2)].toFixed(1) + ' 最低 ' + spd[0].toFixed(1) + ' 最高 ' + spd[spd.length - 1].toFixed(1) + ' m/s');
  console.log(ascii(P, 104, 34, [[P[0].x, P[0].z, 'S']]));
}
