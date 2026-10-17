// 探针: 玩家用「AI 同款走线 + 可调过弯侧向加速度」跑 3 圈, 量新 AI 数值下还能不能赢。
// 用途: 验证「AI 直线更快, 但人类靠抓地优势可以扳回来」这一设计前提是否成立。
import { buildTrack, } from '../src/core/track.js';
import { World, laneFollower } from '../src/core/world.js';
import { AI, PHYS, CHAPTERS } from '../src/core/constants.js';

const f = (x, n = 2) => Number(x).toFixed(n);

function hotLimit(track, s, lat, lookahead = AI.cornerLookahead) {
  let limit = Infinity;
  for (let d = 6; d <= lookahead; d += 6) {
    const R = 1 / Math.max(track.curvatureAt(s + d), 1e-6);
    const v = Math.sqrt(lat * R);
    if (v < limit) limit = v;
  }
  return limit;
}

function hotDrive(w, k, lat) {
  if (k.finished) { k.input.throttle = false; k.input.brake = false; k.input.steer *= 0.9; return; }
  const look = AI.lookahead * (0.95 + 0.12 * Math.sin(k.phase));
  const desired = laneFollower(k, look);
  const vLim = hotLimit(w.track, k.s, lat);
  const target = Math.min(k.maxSpeed * AI.topKeep, vLim) * (k.onGrass ? 0.8 : 1);
  k.input.steer = Math.max(-1, Math.min(1, desired));
  const delta = target - k.speed;
  if (delta > 0.4) { k.input.throttle = true; k.input.brake = false; }
  else if (delta < -2.5) { k.input.throttle = false; k.input.brake = k.speed > k.maxSpeed * 0.55; }
  else { k.input.throttle = false; k.input.brake = false; }
}

const lats = [PHYS.latAccelMax, 12, 14];
const vehicles = ['balance', 'rush', 'grip'];
console.log('章节 | 车 | ' + lats.map(l => 'lat ' + l).join(' | '));
for (const ch of CHAPTERS) {
  const track = buildTrack(ch.layout);
  for (const veh of vehicles) {
    const cell = [];
    for (const lat of lats) {
      const w = new World({ track, chapter: ch.key, vehicle: veh, racer: 'rong', seed: 7 });
      w.start();   // 跳过倒计时, 与 runRace 一致
      let guard = 0;
      while (!w.player.finished && guard++ < 60 * 500) {
        hotDrive(w, w.player, lat);
        w.step(1 / 60);
      }
      w.rank();
      cell.push(f(w.player.finishTime ?? 0, 1) + 's/P' + w.player.rank);
    }
    console.log(ch.key + ' ' + ch.name + ' | ' + veh + ' | ' + cell.join(' | '));
  }
}
