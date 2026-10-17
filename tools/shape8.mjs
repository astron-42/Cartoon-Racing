import { LAYOUTS, buildTrack, TRACK_STEP } from '../src/core/track.js';
import { corners, ascii, report } from './design.mjs';
const keys = Object.keys(LAYOUTS);
for (const k of keys) {
  const L = LAYOUTS[k];
  const t = buildTrack(k, 15.0);
  const cc = corners(t);
  const pos = cc.cs.filter(c => c.sweep > 0).reduce((a, c) => a + c.sweep, 0);
  const neg = cc.cs.filter(c => c.sweep < 0).reduce((a, c) => a - c.sweep, 0);
  const u = cc.cs.filter(c => Math.abs(c.sweep) >= 150).length;
  const str = cc.straights.map(s => s.len).sort((a, b) => b - a);
  console.log(k.padEnd(9) + (L.name || '').padEnd(10) + ' len=' + t.total.toFixed(0).padStart(5) +
    ' 段=' + L.segments.length + ' 弯=' + String(cc.cs.length).padStart(2) + ' U=' + u +
    ' Rmin=' + t.minRadius.toFixed(0).padStart(4) +
    ' 单向=' + (100 * Math.max(pos, neg) / (pos + neg)).toFixed(0) + '%' +
    ' 直道 min/max=' + Math.min(...cc.straights.map(s => s.len)).toFixed(0) + '/' + str[0].toFixed(0) +
    ' 最长3=' + str.slice(0, 3).map(v => v.toFixed(0)).join(','));
}
console.log('');
for (const k of ['valley', 'chengdu', 'zhuhai']) { console.log('== ' + k + ' =='); console.log(ascii(buildTrack(k, 15.0), 96, 30)); }
console.log('zhuhai segs: ' + JSON.stringify(LAYOUTS.zhuhai.segments));
console.log('valley segs: ' + JSON.stringify(LAYOUTS.valley.segments));
console.log('chengdu segs: ' + JSON.stringify(LAYOUTS.chengdu.segments));
