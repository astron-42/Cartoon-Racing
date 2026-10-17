import { CHAPTERS } from '../src/core/constants.js';
import { buildTrack } from '../src/core/track.js';
const seen = new Map();
for (const c of CHAPTERS) {
  const t = buildTrack(c.layout);
  console.log([c.key, c.index, c.name, c.trackName, 'layout=' + c.layout, 'total=' + Math.round(t.total)].join(' | '));
  if (seen.has(c.layout)) console.log('   !! 重复 layout, 与 ' + seen.get(c.layout) + ' 相同');
  seen.set(c.layout, c.key);
}
