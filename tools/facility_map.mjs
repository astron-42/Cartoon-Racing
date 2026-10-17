// 设施落位体检图: 每章一张俯视图, 画出路面带 + 长模型(看台/维修楼/风车)的矩形底面。
// 红虚线 = 改前写死的位置, 实色 = 现在的落位。用来证明模型不再压到赛道上。
// 用法: node tools/facility_map.mjs  → shots/facility_map.html
import { writeFileSync } from 'node:fs';
import { LAYOUTS, closeByLengths, buildPolyline, closeLoop, smoothClosed, Track, TRACK_STEP } from '../src/core/track.js';
import { PHYS, CHAPTERS } from '../src/core/constants.js';

const WIDTH = 18.0;
function pipeline(segs) {
  const closed = closeByLengths(segs);
  const pts = smoothClosed(closeLoop(buildPolyline(closed, TRACK_STEP)), 1, 0.12);
  return new Track(pts.map(p => [p.x, p.z]), WIDTH, { dense: true });
}
function clearAt(t, fac, s, side, off) {
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
function findSpot(t, fac, hint, side, used) {
  for (const sd of [side, -side]) {
    let best = null;
    for (let d = 0; d < t.total; d += 2) {
      const s = (hint * t.total + d) % t.total;
      let clash = false;
      for (const u of used) {
        const raw = Math.abs(u.s - s) % t.total; const gap = Math.min(raw, t.total - raw);
        if (gap < (u.len + fac.len)/2 + 16) { clash = true; break; }
      }
      if (clash) continue;
      const r = clearAt(t, fac, s, sd, fac.off);
      if (r.R < fac.minR || r.clear < fac.minClear) continue;
      if (!best || d < best.d) best = { s, side: sd, d, clear: r.clear, R: r.R };
    }
    if (best) return best;
  }
  return null;
}
const PLAN = [
  ['维修楼', { len: 48, din: -2.0, dout: 11.8, minR: 45, minClear: 2.5, k: 0.72 }, 0.905, 1, '#5b6b7d'],
  ['看台A', { len: 31, din: -0.5, dout: 9.6, minR: 60, minClear: 3.0, k: 0.80 }, 0.075, -1, '#c8553d'],
  ['看台B', { len: 31, din: -0.5, dout: 9.6, minR: 60, minClear: 3.0, k: 0.80 }, 0.42, 1, '#c8553d'],
  ['看台C', { len: 31, din: -0.5, dout: 9.6, minR: 60, minClear: 3.0, k: 0.80 }, 0.74, -1, '#c8553d'],
  ['风车', { len: 7, din: -3.0, dout: 3.0, minR: 40, minClear: 1.5, k: -1 }, 0.62, 1, '#6fa96b'],
];
function rect(t, fac, s, side, off) {
  const p = t.sample(s);
  const pts = [];
  for (const [lx, lz] of [[fac.din, -fac.len/2], [fac.dout, -fac.len/2], [fac.dout, fac.len/2], [fac.din, fac.len/2]]) {
    const L = side * (off + lx);
    pts.push([p.x + p.nx*L - p.tx*lz, p.z + p.nz*L - p.tz*lz]);
  }
  return pts;
}
let panels = '', report = [];
for (let ci = 0; ci < CHAPTERS.length; ci++) {
  const ch = CHAPTERS[ci], key = ch.layout || 'valley';
  const t = pipeline(LAYOUTS[key].segments);
  const fhw = t.halfWidth * PHYS.lateralMax + 1.2;
  const used = [], rows = [];
  const shapes = [];
  for (const [name, fac, hint, side0, color] of PLAN) {
    const off = fac.k < 0 ? t.halfWidth * 1.7 : fhw * fac.k;
    const f2 = Object.assign({}, fac, { off });
    const spot = findSpot(t, f2, hint, side0, used);
    const old = rect(t, f2, hint * t.total, side0, off);
    if (spot) {
      used.push({ s: spot.s, len: fac.len });
      shapes.push('<polygon points="' + old.map(p => p.join(',')).join(' ') + '" fill="none" stroke="#d9453d" stroke-width="1.6" stroke-dasharray="6 5" opacity="0.75"/>');
      shapes.push('<polygon points="' + rect(t, f2, spot.s, spot.side, off).map(p => p.join(',')).join(' ') + '" fill="' + color + '" fill-opacity="0.55" stroke="' + color + '" stroke-width="2"/>');
      rows.push(name + ' ' + (100*spot.s/t.total).toFixed(1) + '% sd' + (spot.side>0?'+':'-') + ' 余量' + spot.clear.toFixed(1) + 'm R' + (spot.R===Infinity?'inf':spot.R.toFixed(0)));
    } else rows.push(name + ' 无位置');
  }
  // 路面
  const ns = [];
  const step = Math.max(1, Math.floor(t.sampleCount / 400));
  for (let i = 0; i < t.sampleCount; i += step) ns.push(i);
  const left = ns.map(i => [t.pts[i].x + (-t.tan[i].tz) * t.halfWidth, t.pts[i].z + t.tan[i].tx * t.halfWidth]);
  const right = ns.slice().reverse().map(i => [t.pts[i].x - (-t.tan[i].tz) * t.halfWidth, t.pts[i].z - t.tan[i].tx * t.halfWidth]);
  const band = '<polygon points="' + left.concat(right).map(p => p.join(',')).join(' ') + '" fill="#e7dcc4" stroke="#c9bda4" stroke-width="1"/>';
  const line = '<polyline points="' + t.pts.filter((_, i) => i % step === 0).map(p => p.x + ',' + p.z).join(' ') + '" fill="none" stroke="#7f8f6a" stroke-width="1" stroke-dasharray="4 4"/>';
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of t.pts) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
  const mg = 55, vb = (x0-mg) + ' ' + (z0-mg) + ' ' + (x1-x0+2*mg) + ' ' + (z1-z0+2*mg);
  panels += '<figure><figcaption>第 ' + (ci+1) + ' 章 · ' + ch.name + ' [' + key + '] ' + t.total.toFixed(0) + ' m</figcaption>'
    + '<svg viewBox="' + vb + '" preserveAspectRatio="xMidYMid meet">' + band + line + shapes.join('') + '</svg>'
    + '<div class="rows">' + rows.join('<br>') + '</div></figure>';
  report.push('ch' + (ci+1) + ' ' + key + ' :: ' + rows.join(' | '));
}
const html = '<!doctype html><meta charset="utf-8"><title>设施落位体检</title><style>'
  + 'body{margin:16px;background:#f7f3e8;font:14px/1.5 -apple-system,"Microsoft YaHei",sans-serif;color:#3a3226}'
  + 'h1{font-size:20px;margin:0 0 4px}p.sub{margin:0 0 12px;color:#6b6152;font-size:12px}'
  + '.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}'
  + 'figure{margin:0;background:#fffdf6;border:1px solid #e4dcc8;border-radius:8px;padding:6px}'
  + 'figcaption{font-size:12px;font-weight:600;margin-bottom:2px}'
  + 'svg{display:block;width:100%;height:360px}'
  + '.rows{font-size:10px;color:#6b6152;line-height:1.45}'
  + '.sw{display:inline-block;width:26px;height:0;border-top:2px dashed #d9453d;vertical-align:middle;margin:0 6px}'
  + '</style><h1>赛道设施落位体检 (路面 18 m)</h1>'
  + '<p class="sub">实色块 = 现在的位置 (粗线看台 / 灰维修楼 / 绿风车); <span class="sw"></span>红虚线 = 改前写死的位置。实色块必须完全落在浅色路面带之外。</p>'
  + '<div class="grid">' + panels + '</div>';
writeFileSync(new URL('../shots/facility_map.html', import.meta.url), html);
console.log(report.join('\n'));
