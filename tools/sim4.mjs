import { buildTrack } from '../src/core/track.js';
import { runRace } from '../src/core/world.js';
import { DEFAULT_VEHICLE } from '../src/core/constants.js';
const MAP = { zhuhai:'第三章 蓝屿环道', ningbo:'第五章 麦浪平原环道', tianjin:'第六章 暖金丘环道', ordos:'第七章 长风草原环道' };
for (const lk of Object.keys(MAP)) {
  const track = buildTrack(lk);
  const t0 = Date.now();
  const { world, topSpeed } = runRace({ track, seed: 7, seconds: 600, vehicle: DEFAULT_VEHICLE, racer: 'rong' });
  const fin = world.karts.filter(k=>k.finished);
  const times = fin.map(k=>k.finishTime).sort((a,b)=>a-b);
  console.log(MAP[lk]+' ('+lk+'): 长 '+track.total.toFixed(0)+' m | 完赛 '+fin.length+'/'+world.karts.length+
    ' | 冠军 '+times[0].toFixed(1)+' s | 末位 '+times[times.length-1].toFixed(1)+' s'+
    ' | 玩家最佳圈 '+(world.player.bestLap||0).toFixed(1)+' s, 圈数 '+world.player.laps+
    ' | 出界 '+world.karts.map(k=>k.offTrackEvents).join('/')+' | 复位 '+world.karts.map(k=>k.respawnCount).join('/')+
    ' | 仿真 '+(Date.now()-t0)+' ms');
}
