// 一次性诊断: 打印竞速中玩家的 s/速度/横向/复位, 定位"跑不完一圈"的原因
import { buildTrack } from '../src/core/track.js';
import { World, laneFollower } from '../src/core/world.js';
import { RACE, DEFAULT_VEHICLE } from '../src/core/constants.js';

const track = buildTrack();
console.log('track total=' + track.total.toFixed(1) + ' samples=' + track.sampleCount + ' spacing=' + track.spacing.toFixed(3) + ' Rmin=' + track.minRadius.toFixed(1));

const w = new World({ track, vehicle: DEFAULT_VEHICLE, racer: 'rong', seed: 7 });
const p = w.player;
console.log('grid: s=' + p.s.toFixed(2) + ' x=' + p.x.toFixed(2) + ' z=' + p.z.toFixed(2) + ' heading=' + p.heading.toFixed(3) + ' maxSpeed=' + p.maxSpeed.toFixed(2) + ' accelG=' + p.accelG.toFixed(2) + ' timeTo90=' + p.timeTo90.toFixed(2));
w.start();
let lastLap = 0;
for (let f = 0; f < 60 * 60; f++) {
  p.input.steer = laneFollower(p);
  p.input.throttle = true;
  p.input.brake = false;
  w.step(RACE.dt);
  if (f % 60 === 0) {
    console.log('t=' + w.time.toFixed(0).padStart(3) + ' s=' + p.s.toFixed(1).padStart(6) + ' lat=' + p.lateral.toFixed(2).padStart(5) + ' v=' + p.speed.toFixed(1).padStart(5) + ' laps=' + p.laps + ' resp=' + p.respawnCount + ' grass=' + (p.onGrass ? 'Y' : 'n') + ' steer=' + p.input.steer.toFixed(2) + ' head=' + p.heading.toFixed(2));
  }
  if (p.laps !== lastLap) { lastLap = p.laps; console.log('   >>> LAP ' + p.laps + ' at t=' + w.time.toFixed(2) + ' lapTime=' + (p.lapTimes[p.lapTimes.length - 1] || 0).toFixed(2)); }
  if (p.respawnCount > 6) { console.log('too many respawns, abort'); break; }
  if (p.finished) break;
}
console.log('player finished=' + p.finished + ' finishTime=' + p.finishTime + ' laps=' + p.laps + ' lapTimes=' + JSON.stringify(p.lapTimes.map(x => +x.toFixed(2))));
for (const k of w.karts) console.log('  kart' + k.id + ' ' + k.racer.name + ' s=' + k.s.toFixed(0) + ' laps=' + k.laps + ' resp=' + k.respawnCount + ' v=' + k.speed.toFixed(1) + ' lat=' + k.lateral.toFixed(2) + ' finished=' + k.finished);
