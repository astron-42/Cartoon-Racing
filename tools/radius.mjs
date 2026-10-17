import { CHAPTERS } from '../src/core/constants.js';
import { buildTrack } from '../src/core/track.js';
for (const ch of CHAPTERS) {
  const t = buildTrack(ch.layout);
  const step = Math.max(4, t.total / 240);
  let cx = 0, cz = 0, n = 0;
  for (let s = 0; s < t.total; s += step) { const p = t.sample(s); cx += p.x; cz += p.z; n++; }
  cx /= n; cz /= n;
  let selfR = 0, maxR = 0, uMaxR = 0, sMax = 0;
  for (let s = 0; s < t.total; s += step) {
    const p = t.sample(s);
    const r0 = Math.hypot(p.x, p.z), rc = Math.hypot(p.x - cx, p.z - cz);
    if (rc > selfR) selfR = rc;
    if (r0 > maxR) { maxR = r0; uMaxR = s / t.total; sMax = s; }
  }
  const ms = Math.max(1, (selfR + 170) / 600);
  console.log(ch.key + ' ' + ch.name.padEnd(7) + ' total=' + t.total.toFixed(0).padStart(5) +
    ' center=(' + cx.toFixed(0).padStart(4) + ',' + cz.toFixed(0).padStart(5) + ')' +
    ' selfR=' + selfR.toFixed(0).padStart(4) + ' ms=' + ms.toFixed(2) +
    ' 近丘半径=' + (600 * ms).toFixed(0).padStart(4) + ' 赛道最远端(离原点)=' + maxR.toFixed(0).padStart(4) + ' @u=' + uMaxR.toFixed(3) + ' (s=' + sMax.toFixed(0) + ')');
}
