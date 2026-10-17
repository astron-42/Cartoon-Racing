
import { LAYOUTS, closeByLengths, buildPolyline, closeLoop, smoothClosed, Track, TRACK_STEP } from '../src/core/track.js';
import { PHYS } from '../src/core/constants.js';
function pipeline(segs, width) {
  const closed = closeByLengths(segs);
  const pts = smoothClosed(closeLoop(buildPolyline(closed, TRACK_STEP)), 1, 0.12);
  return new Track(pts.map(p => [p.x, p.z]), width, { dense: true });
}
function clearAt(t, fac, s, side, off) {
  const p = t.sample(s), nx = p.nx, nz = p.nz, tx = p.tx, tz = p.tz;
  let minLat = Infinity;
  for (let i = 0; i <= 10; i++) {
    const lz = -fac.len/2 + fac.len * i/10;
    for (let j = 0; j <= 4; j++) {
      const lx = side * (off + fac.din + (fac.dout - fac.din) * j/4);
      const lat = Math.abs(t.project(p.x + nx*lx - tx*lz, p.z + nz*lx - tz*lz).lateral);
      if (lat < minLat) minLat = lat;
    }
  }
  let maxK = 0;
  for (let d = -fac.len/2 - 2; d <= fac.len/2 + 2; d += 2) maxK = Math.max(maxK, t.curvatureAt(s + d));
  return { clear: minLat - t.halfWidth, R: maxK > 0 ? 1/maxK : Infinity };
}
const STAND = { len: 31, din: -0.5, dout: 9.6, minR: 60, minClear: 3.0, offK: 0.80 };
const PIT   = { len: 48, din: -2.0, dout: 11.8, minR: 45, minClear: 2.5, offK: 0.72 };
const MILL  = { len: 7,  din: -3.0, dout: 3.0, minR: 40, minClear: 1.5, offK: 0.34 };
function gap(a, b, T) { let d = Math.abs(a - b) % T; return Math.min(d, T - d); }
const FACLIST = [
  ['pit', PIT, 0.905, 1],
  ['std', STAND, 0.075, -1],
  ['std', STAND, 0.42, 1],
  ['std', STAND, 0.74, -1],
  ['mill', MILL, 0.62, 1],
];
function findSpots(t, fieldHW) {
  const used = [], res = [];
  for (const [tag, fac, hint, side0] of FACLIST) {
    const off = tag === 'mill' ? t.halfWidth * 1.7 : fieldHW * fac.offK;
    const cur = clearAt(t, fac, hint * t.total, side0, off);
    let best = null;
    for (const side of [side0, -side0]) {
      for (let d = 0; d < t.total; d += 2) {
        const s = (hint * t.total + d) % t.total;
        if (used.some(u => gap(u.s, s, t.total) < (u.len + fac.len)/2 + 16)) continue;
        const r = clearAt(t, fac, s, side, off);
        if (r.R < fac.minR || r.clear < fac.minClear) continue;
        if (!best || d < best.dist) best = { s, side, off, dist: d, r };
      }
      if (best) break;
    }
    if (best) {
      used.push({ s: best.s, len: fac.len });
      const moved = best.side !== side0 || best.dist > 0;
      res.push(tag + ' ' + (100*best.s/t.total).toFixed(1) + '%sd' + (best.side>0?'+':'-') + ' C=' + best.r.clear.toFixed(1) + ' R=' + (best.r.R===Infinity?'inf':best.r.R.toFixed(0))
        + (moved ? ' [移' + best.dist.toFixed(0) + 'm' + (best.side!==side0?'换边':'') + ' 原:' + (cur.clear<0?'压路'+(-cur.clear).toFixed(1):'C'+cur.clear.toFixed(1)) + ' R' + (cur.R===Infinity?'inf':cur.R.toFixed(0)) + ']' : ' [原位]'));
    } else res.push(tag + ' NONE [原: C' + cur.clear.toFixed(1) + ']');
  }
  return res;
}
for (const key of Object.keys(LAYOUTS)) {
  const ch = LAYOUTS[key];
  const t = pipeline(ch.segments, ch.width || 15.0);
  const fieldHW = t.halfWidth * PHYS.lateralMax + 1.2;
  console.log(key.padEnd(8), findSpots(t, fieldHW).join('\n         '));
}
