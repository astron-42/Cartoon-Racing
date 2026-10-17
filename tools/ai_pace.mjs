// 扫「AI 过弯侧向加速度」对圈速/名次的影响: 同一场里只改 World.aiCornerLat。
// 用法: node tools/ai_pace.mjs [章节 key...]
import { buildTrack } from '../src/core/track.js';
import { World, hotLine } from '../src/core/world.js';
import { AI, CHAPTERS } from '../src/core/constants.js';

const f = (x, n = 1) => Number(x).toFixed(n);
const lats = [9, 11, 12, 13, 14, 15, 16];
const playerLat = [12, 14];
const keys = process.argv.slice(2).length ? process.argv.slice(2) : ['ch1', 'ch3', 'ch4', 'ch7'];

function race(layout, chapter, aiLat, pLat, veh = 'rush') {
  const track = buildTrack(layout);
  const w = new World({ track, chapter, vehicle: veh, racer: 'rong', seed: 7 });
  w.aiCornerLat = aiLat;
  w.start();
  let g = 0;
  while (!w.karts.every(k => k.finished) && g++ < 60 * 700) { hotLine(w, w.player, pLat); w.step(1 / 60); }
  const fin = w.karts.filter(k => k.finished);
  const champ = Math.min(...fin.filter(k => !k.isPlayer).map(k => k.finishTime));
  return {
    aiChamp: champ, player: w.player.finishTime, rank: w.player.rank,
    aiBest: Math.min(...fin.filter(k => !k.isPlayer).map(k => k.bestLap)),
    fin: fin.length, off: w.karts.reduce((a, k) => a + k.offTrackEvents, 0), resp: w.karts.reduce((a, k) => a + k.respawnCount, 0),
  };
}

for (const key of keys) {
  const ch = CHAPTERS.find(c => c.key === key);
  for (const pLat of playerLat) {
    const row = lats.map(l => {
      const r = race(ch.layout, key, l, pLat);
      return 'lat' + l + ':' + f(r.aiChamp) + '/P' + r.rank + (r.fin === 8 ? '' : '!' + r.fin) + (r.resp ? ' r' + r.resp : '');
    });
    console.log(key + ' 玩家' + pLat + 'g | ' + row.join('  '));
  }
}
console.log('AI 参数: spd 1.05-1.15, cornerLat 扫描值; 数字 = AI 冠军总时间(s)/玩家名次; !n = 未完赛台数, rN = 总复位次数');
