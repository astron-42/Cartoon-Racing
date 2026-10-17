
import { buildPolyline, closeByLengths, TRACK_STEP, LAYOUTS } from '../src/core/track.js';
for (const key of ['valley','chengdu']) {
  const segs = closeByLengths(LAYOUTS[key].segments);
  const P = buildPolyline(segs, TRACK_STEP);
  console.log('ref '+key+' buildPolyline seam = '+Math.hypot(P[P.length-1].x-P[0].x, P[P.length-1].z-P[0].z).toFixed(2)+' m; segs='+segs.length);
}
