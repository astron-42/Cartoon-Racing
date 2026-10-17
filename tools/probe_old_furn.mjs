
import { LAYOUTS, closeByLengths, buildPolyline, closeLoop, smoothClosed, Track, TRACK_STEP } from '../src/core/track.js';
import { PHYS } from '../src/core/constants.js';
function pipeline(segs, width) {
  const closed = closeByLengths(segs);
  const pts = smoothClosed(closeLoop(buildPolyline(closed, TRACK_STEP)), 1, 0.12);
  return new Track(pts.map(p => [p.x, p.z]), width, { dense: true });
}
// 改前的写死落位: 看台/维修楼按切线方向摆好后, 矩形底面到"整条赛道"的余量 (负 = 压在路上)
function clear(t, fac, s, side, off) {
  const p = t.sample(s), nx = p.nx, nz = p.nz, tx = p.tx, tz = p.tz;
  let minLat = Infinity;
  for (let i = 0; i <= 20; i++) for (let j = 0; j <= 6; j++) {
    const lz = -fac.len/2 + fac.len * i/20;
    const lx = side * (off + fac.din + (fac.dout - fac.din) * j/6);
    const lat = Math.abs(t.project(p.x + nx*lx - tx*lz, p.z + nz*lx - tz*lz).lateral);
    if (lat < minLat) minLat = lat;
  }
  let maxK = 0;
  for (let d = -fac.len/2 - 2; d <= fac.len/2 + 2; d += 2) maxK = Math.max(maxK, t.curvatureAt(s + d));
  return { clear: minLat - t.halfWidth, R: maxK > 0 ? 1/maxK : Infinity };
}
const STAND = { len: 31, din: -0.5, dout: 9.6 };
const PIT = { len: 48, din: -2.0, dout: 11.8 };
const MILL = { len: 7, din: -3.0, dout: 3.0 };
const OLD = [['pit', PIT, 0.905, 1, 0.72], ['stand-a', STAND, 0.075, -1, 0.80], ['stand-b', STAND, 0.42, 1, 0.80], ['stand-c', STAND, 0.74, -1, 0.80], ['mill', MILL, 0.62, 1, 0.34]];
for (const key of Object.keys(LAYOUTS)) {
  const ch = LAYOUTS[key];
  const t = pipeline(ch.segments, 18.0);
  const fhw = t.halfWidth * PHYS.lateralMax + 1.2;
  const rows = OLD.map(([tag, fac, hint, side, k]) => {
    const off = tag === 'mill' ? t.halfWidth * 1.7 : fhw * k;
    const r = clear(t, fac, hint * t.total, side, off);
    return tag + ' ' + (100*hint).toFixed(1) + '%sd' + (side>0?'+':'-') + ' C=' + r.clear.toFixed(1) + ' R=' + (r.R===Infinity?'inf':r.R.toFixed(0)) + (r.clear < 0 ? '  <<压路' + (-r.clear).toFixed(1) : '');
  });
  console.log(key.padEnd(8), rows.join(' | '));
}
