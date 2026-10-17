import { buildTrack } from '../src/core/track.js';
import { World, hotLine } from '../src/core/world.js';
import { CHAPTERS } from '../src/core/constants.js';
const f = (x, n = 1) => Number(x).toFixed(n);
for (const lat of [12, 12.5, 13]) {
  const line = [];
  for (const key of ['ch1', 'ch3', 'ch4', 'ch7']) {
    const ch = CHAPTERS.find(c => c.key === key);
    const track = buildTrack(ch.layout);
    const w = new World({ track, chapter: key, vehicle: 'rush', racer: 'rong', seed: 7 });
    w.aiCornerLat = lat; w.start();
    let g = 0;
    while (!w.karts.every(k => k.finished) && g++ < 60 * 700) { hotLine(w, w.player, 14); w.step(1 / 60); }
    const ai = w.karts.filter(k => !k.isPlayer);
    const off = w.karts.reduce((a, k) => a + k.offTrackEvents, 0);
    const resp = w.karts.reduce((a, k) => a + k.respawnCount, 0);
    line.push(key + ' AI ' + f(Math.min(...ai.map(k => k.finishTime))) + 's 玩家 ' + f(w.player.finishTime) + 's P' + w.player.rank + ' 出界' + off + ' 复位' + resp + ' 完赛' + ai.filter(k => k.finished).length + '/7');
  }
  console.log('lat ' + lat + ': ' + line.join(' | '));
}
