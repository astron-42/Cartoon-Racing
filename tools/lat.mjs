import { CHAPTERS } from '../src/core/constants.js';
import { buildTrack } from '../src/core/track.js';
import { runRace } from '../src/core/world.js';
const keys = ['ch1', 'ch5', 'ch7'];
const f = v => v.toFixed(1).padStart(6);
for (const ch of CHAPTERS) {
  if (!keys.includes(ch.key)) continue;
  const track = buildTrack(ch.layout);
  const r = runRace({ track, vehicle: 'balance', seed: 7, chapter: ch.key, seconds: 900 });
  const w = r.world;
  const ai = w.karts.filter(k => !k.isPlayer);
  const bests = ai.map(k => k.bestLap).filter(v => v !== null);
  const mean = bests.reduce((a, b) => a + b, 0) / (bests.length || 1);
  console.log(ch.key + ' 玩家最佳圈 ' + f(w.player.bestLap) + ' | AI 平均最佳圈 ' + f(mean) + ' (最快 ' + f(Math.min(...bests)) + ') | AI 出界 ' +
    ai.reduce((a, k) => a + k.offTrackEvents, 0) + ' 次 复位 ' + ai.reduce((a, k) => a + k.respawnCount, 0) + ' 次 | 完赛 ' + w.karts.filter(k => k.finished).length + '/8');
}
