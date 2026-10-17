import { CHAPTERS } from '../src/core/constants.js';
import { buildTrack } from '../src/core/track.js';
import { runRace } from '../src/core/world.js';
const only = process.argv.slice(2);
const f = v => (v === null || v === undefined) ? '  ---' : v.toFixed(1).padStart(6);
for (const ch of CHAPTERS) {
  if (only.length && !only.includes(ch.key)) continue;
  const track = buildTrack(ch.layout);
  const r = runRace({ track, vehicle: 'balance', seed: 7, chapter: ch.key, seconds: 900 });
  const w = r.world, rows = w.results().rows, fin = rows.filter(x => x.finished);
  const p = w.player;
  const ai = w.karts.filter(k => !k.isPlayer).map(k => ({ t: k.finishTime, pace: k.aiSkill, v: k.maxSpeed, laps: k.laps }))
    .sort((a, b) => (a.t ?? 9e9) - (b.t ?? 9e9));
  console.log(ch.key + ' ' + ch.name.padEnd(7) + ' 玩家' + f(p.finishTime) + 's P' + p.rank + ' | 完赛 ' + fin.length + '/8 | ' +
    ai.map(a => (a.t === null ? 'DNF' : a.t.toFixed(0)) + '@' + a.pace.toFixed(2) + '/' + a.v.toFixed(1)).join(' '));
}
