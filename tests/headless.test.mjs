// M0 断言: 把"手感"变成数字。渲染层不做任何假设, 全部逻辑在这里可验证。
// 用法: node tests/headless.test.mjs   (退出码 0 = 全部通过)
// 隔离测法: pin() 每帧把车按回中心线(或指定横向位置), 这样加速/刹车/草地等只测被测量的那一条曲线,
// 不受"车跑出赛道"干扰。
import { buildTrack } from '../src/core/track.js';
import { Kart, step } from '../src/core/kart.js';
import { World, runRace, laneFollower, perfectLine } from '../src/core/world.js';
import * as W from '../src/core/world.js';
import { PHYS, RACE, VEHICLES, RACERS, CHAPTERS, AI, racerByKey, DEFAULT_VEHICLE, steerFromKeys } from '../src/core/constants.js';

let pass = 0, fail = 0;
const results = [];
function check(name, cond, detail) {
  if (cond) { pass++; results.push('  PASS ' + name + (detail ? ' :: ' + detail : '')); }
  else { fail++; results.push('  FAIL ' + name + (detail ? ' :: ' + detail : '')); }
}
const f = (x, n = 2) => (x === null || x === undefined || Number.isNaN(x)) ? '  —  ' : Number(x).toFixed(n);

const track = buildTrack();
console.log('=== 赛道几何 ===');
console.log('  控制点 ' + track.points.length + ' 个 | 等距采样 ' + track.sampleCount + ' 点 | 总长 ' + f(track.total, 1) + ' m | 宽 ' + track.width + ' m');
let minR = Infinity, argS = 0;
for (let i = 0; i < track.sampleCount; i++) {
  const s = i * (track.total / track.sampleCount);
  const R = 1 / Math.max(track.curvatureAt(s), 1e-9);
  if (R < minR) { minR = R; argS = s; }
}
console.log('  最小转弯半径 ' + f(minR, 1) + ' m (在 s=' + f(argS, 0) + ' m 处) | 起跑线处 R=' + f(1 / Math.max(track.curvatureAt(0), 1e-9), 0) + ' m');
check('总长 1200-2000 m', track.total > 1200 && track.total < 2000, f(track.total, 1) + ' m');
check('最小转弯半径 > 20 m (无折角)', minR > 20, 'Rmin=' + f(minR, 1));

console.log('=== 八条章节赛道 (每章一条虚构环道走线) ===');
const LAYOUTS = ['valley', 'strait', 'zhuhai', 'macau', 'ningbo', 'tianjin', 'ordos', 'chengdu'];
let badTotal = '', badR = '', badNaN = '', badChapter = '';
for (const lk of LAYOUTS) {
  const t = buildTrack(lk);
  let mn = Infinity;
  for (let i = 0; i < t.sampleCount; i++) {
    const R = 1 / Math.max(t.curvatureAt(i * (t.total / t.sampleCount)), 1e-9);
    if (R < mn) mn = R;
  }
  if (Number.isNaN(t.total) || Number.isNaN(mn)) badNaN = lk;
  if (!(t.total > 1200 && t.total < 2600)) badTotal = lk + ' ' + f(t.total, 1);
  if (!(mn > 12)) badR = lk + ' ' + f(mn, 1);
  console.log('  ' + lk + ': 总长 ' + f(t.total, 1) + ' m | Rmin ' + f(mn, 1) + ' m | 采样 ' + t.sampleCount);
}
check('八条赛道总长都在 1200-2600 m', badTotal === '', badTotal);
check('八条赛道最小转弯半径都 > 12 m (无折角)', badR === '', badR);
check('八条赛道几何无 NaN', badNaN === '', badNaN);
if (CHAPTERS.length !== 8) badChapter = 'CHAPTERS=' + CHAPTERS.length;
for (const c of CHAPTERS) if (LAYOUTS.indexOf(c.layout) < 0) badChapter = c.key + '->' + c.layout;
check('八个章节各自对应一条已实现赛道', badChapter === '', badChapter);
check('三台车各有独立车身色 (车模按车辆上色)', new Set(Object.keys(VEHICLES).map(k => VEHICLES[k].color)).size === 3, Object.keys(VEHICLES).map(k => VEHICLES[k].color).join(' '));

console.log('=== 车辆标定 (车手已改为纯外观, 不参与数值) ===');
const rong = racerByKey('rong');
const probe = new Kart({ id: 0, racer: rong, vehicle: VEHICLES[DEFAULT_VEHICLE], track, isPlayer: true, gridIndex: 0 });
console.log('  基准 ' + rong.name + ' / ' + VEHICLES[DEFAULT_VEHICLE].name + ': 极速 ' + f(probe.maxSpeed) + ' m/s | 0→90% ' + f(probe.timeTo90) + ' s | 起步加速度 ' + f(probe.accelG) + ' m/s2 | 低速舵率 ' + f(probe.steerBase) + ' rad/s | 极速舵率 ' + f(probe.steerBase * PHYS.steerGripMin) + ' rad/s');
check('基准车手 + 均衡车极速 28-33 m/s', probe.maxSpeed > 28 && probe.maxSpeed < 33, 'vmax=' + f(probe.maxSpeed));
const vRush = new Kart({ id: 0, racer: rong, vehicle: VEHICLES.rush, track });
const vGrip = new Kart({ id: 0, racer: rong, vehicle: VEHICLES.grip, track });
console.log('  赤羽号: 0→90% ' + f(vRush.timeTo90) + ' s | 舵率 ' + f(vRush.steerBase, 3) + ' rad/s | 极速 ' + f(vRush.maxSpeed) + ' m/s');
console.log('  青石号: 0→90% ' + f(vGrip.timeTo90) + ' s | 舵率 ' + f(vGrip.steerBase, 3) + ' rad/s | 极速 ' + f(vGrip.maxSpeed) + ' m/s');
console.log('  纸鸢号: 0→90% ' + f(probe.timeTo90) + ' s | 舵率 ' + f(probe.steerBase, 3) + ' rad/s | 极速 ' + f(probe.maxSpeed) + ' m/s');
check('加速型 0→90% 比抓地型快 25% 以上', vGrip.timeTo90 > vRush.timeTo90 * 1.25, f(vRush.timeTo90) + ' → ' + f(vGrip.timeTo90));
check('抓地型舵率比加速型高 30% 以上', vGrip.steerBase > vRush.steerBase * 1.3, f(vRush.steerBase, 3) + ' → ' + f(vGrip.steerBase, 3));
check('均衡车加速与舵率都夹在另外两台之间', probe.timeTo90 > vRush.timeTo90 && probe.timeTo90 < vGrip.timeTo90 && probe.steerBase > vRush.steerBase && probe.steerBase < vGrip.steerBase, '');
check('极速下转弯半径 ~50 m (需要为弯道减速)', probe.maxSpeed / (probe.steerBase * PHYS.steerGripMin) > 40, '');

// 隔离测: 每帧把车按回中心线 (只保留纵向/蓄力等被测量)
const stub = { track, time: 0, laps: 999, events: [], onFinish() {}, onRespawn() {} };
function pin(kart, lat = 0) {
  const smp = track.sample(kart.s);
  kart.x = smp.x + smp.nx * lat;
  kart.z = smp.z + smp.nz * lat;
  const pr = track.project(kart.x, kart.z);
  kart.s = pr.s; kart.prevS = pr.s;
  kart.lateral = pr.lateral / track.halfWidth;
  kart.onGrass = Math.abs(kart.lateral) > 1.0;
}
function driveIsolated(lat, seconds, steer = 0) {
  const k = new Kart({ id: 0, racer: rong, vehicle: VEHICLES[DEFAULT_VEHICLE], track, isPlayer: true, gridIndex: 0 });
  const w = { ...stub, time: 0 };
  const frames = Math.round(seconds / RACE.dt);
  const trace = [];
  for (let i = 0; i < frames; i++) {
    k.input.throttle = true; k.input.steer = steer;
    step(k, RACE.dt, w); w.time += RACE.dt;
    pin(k, lat);
    trace.push(k.speed);
  }
  return { k, trace };
}

console.log('=== 直线加速 (隔离测) ===');
{
  const { k, trace } = driveIsolated(0, 6);
  let t90 = null;
  for (let i = 0; i < trace.length; i++) if (t90 === null && trace[i] >= k.maxSpeed * 0.9) t90 = (i + 1) * RACE.dt;
  const t50 = trace.findIndex(v => v >= k.maxSpeed * 0.5);
  console.log('  0→50% ' + f(t50 * RACE.dt) + ' s | 0→90% ' + f(t90) + ' s (目标 ' + f(k.timeTo90) + ' s) | 6 s 后 ' + f(trace[trace.length - 1]) + ' m/s');
  check('0→90% 极速在 2.4-3.4 s', t90 !== null && t90 > 2.4 && t90 < 3.4, 't90=' + f(t90));
  check('6 s 后接近极速 (>98%)', trace[trace.length - 1] > k.maxSpeed * 0.98, f(trace[trace.length - 1]) + '/' + f(k.maxSpeed));
}
console.log('=== 刹车 / 倒车 (隔离测) ===');
{
  const k = new Kart({ id: 0, racer: rong, vehicle: VEHICLES[DEFAULT_VEHICLE], track, isPlayer: true });
  const w = { ...stub };
  for (let i = 0; i < 300; i++) { k.input.throttle = true; k.input.steer = 0; k.input.brake = false; step(k, RACE.dt, w); pin(k); }
  const v = k.speed;
  let t0 = null;
  for (let i = 0; i < 300 && t0 === null; i++) { k.input.throttle = false; k.input.brake = true; step(k, RACE.dt, w); pin(k); if (k.speed <= 0.5) t0 = (i + 1) * RACE.dt; }
  for (let i = 0; i < 120; i++) { k.input.throttle = false; k.input.brake = true; step(k, RACE.dt, w); pin(k); }
  console.log('  ' + f(v) + ' m/s → 刹停 ' + f(t0) + ' s | 继续倒车到 ' + f(k.speed) + ' m/s');
  check('全速刹停 < 3 s', t0 !== null && t0 < 3, 't=' + f(t0));
  check('可倒车且不超过 -8 m/s', k.speed < -1 && k.speed > -8, f(k.speed));
}
console.log('=== 非铺装路面减速 (隔离测) ===');
{
  const paved = driveIsolated(0, 4).k.speed;
  const onGrass = driveIsolated(track.halfWidth * 1.4, 2).k;
  console.log('  铺装稳定 ' + f(paved) + ' m/s → 草地(横向 ' + f(track.halfWidth * 1.4, 1) + ' m) 2 s 后 ' + f(onGrass.speed) + ' m/s | onGrass=' + onGrass.onGrass);
  check('驶到草地上明显减速 (>25%)', onGrass.onGrass && onGrass.speed < paved * 0.75, f(paved) + ' → ' + f(onGrass.speed));
}
console.log('=== 掉出赛道自动复位 (FR-12) ===');
{
  const k = new Kart({ id: 0, racer: rong, vehicle: VEHICLES[DEFAULT_VEHICLE], track, isPlayer: true, gridIndex: 0 });
  const w = { ...stub, time: 0 };
  for (let i = 0; i < 240; i++) { perfectLine(w, k); step(k, RACE.dt, w); w.time += RACE.dt; }
  const lapsBefore = k.laps, sBefore = k.s;
  const smp = track.sample(k.s);
  k.heading = Math.atan2(smp.nx, smp.nz);      // 垂直于赛道往外冲
  let t = null;
  for (let i = 0; i < 60 * 12; i++) {
    k.input.throttle = true; k.input.steer = 0;
    step(k, RACE.dt, w); w.time += RACE.dt;
    if (k.respawnCount > 0) { t = w.time; break; }
  }
  const pr = track.project(k.x, k.z);
  console.log('  横向冲出后 ' + f(t) + ' s 复位 | 复位后离中心线 ' + f(pr.dist) + ' m | 横向比 ' + f(k.lateral) + ' | 圈数 ' + lapsBefore + '→' + k.laps);
  check('冲出纸面触发复位且回到赛道内', k.respawnCount > 0 && Math.abs(pr.lateral) < track.halfWidth, 'respawn=' + k.respawnCount + ' lateral=' + f(k.lateral));
  check('复位不重置圈数与已跑距离', k.laps === lapsBefore && Math.abs(k.s - sBefore) < track.total * 0.5, 'laps ' + lapsBefore + '→' + k.laps);
  check('复位有速度惩罚 (降到 35% 以下或 1 m/s)', k.speed <= Math.max(1, 0.36 * 25), 'v=' + f(k.speed));
}
console.log('=== 卡死复位 (FR-12) ===');
{
  const k = new Kart({ id: 0, racer: rong, vehicle: VEHICLES[DEFAULT_VEHICLE], track, isPlayer: true, gridIndex: 0 });
  const w = { ...stub, time: 0 };
  let t = null;
  for (let i = 0; i < 60 * 8; i++) {
    k.speed = 0; k.input.throttle = true; k.input.steer = 0;
    step(k, RACE.dt, w); w.time += RACE.dt;
    if (k.respawnCount > 0) { t = w.time; break; }
  }
  console.log('  完全静止 ' + f(t) + ' s 后触发复位 (阈值 ' + PHYS.stuckTime + ' s)');
  check('卡死 2.5-5 s 内自动复位', t !== null && t > 2.5 && t < 5, 't=' + f(t));
}
console.log('=== 静置物理 (回归: 松油门不会倒车) ===');
{
  const sw = new World({ track, vehicle: DEFAULT_VEHICLE, racer: 'rong', seed: 9 });
  sw.start();
  const sp = sw.player;
  sp.input = { steer: 0, throttle: false, brake: false };
  // 单独驱动玩家物理(不跑全场 AI, 否则会被后车追尾推走), 窗口取 2 s 以避开卡死自动复位阈值
  const ctx = { time: 0, laps: RACE.laps, onFinish() {}, onRespawn() {} };
  const x0 = sp.x, z0 = sp.z;
  let minV = 0;
  for (let i = 0; i < 120; i++) {
    ctx.time += RACE.dt;
    sp.input.steer = 0; sp.input.throttle = false; sp.input.brake = false;
    step(sp, RACE.dt, ctx);
    minV = Math.min(minV, sp.speed);
  }
  const moved = Math.hypot(sp.x - x0, sp.z - z0);
  console.log('  2 s 无输入: 最低速度 ' + f(minV, 4) + ' m/s | 位移 ' + f(moved, 4) + ' m');
  check('静置 2 s 不产生倒车速度也不位移', minV > -0.05 && moved < 0.05, 'min v=' + f(minV, 4) + ' | 位移 ' + f(moved, 4) + ' m');
}
console.log('=== 改版回归: 车手只是外观 / 道具与漂移跳跃已删 ===');
check('车手只剩外观 (不再有 stats 五维数值)', RACERS.every(r => !r.stats), RACERS.map(r => r.key).join(' '));
check('车手正好 8 位 (玩家随机一位 + 七台 AI)', RACERS.length === RACE.racers, 'RACERS=' + RACERS.length);
check('PHYS 不再有道具/漂移/跳跃参数', Object.keys(PHYS).every(k => !/drift|jump|item/i.test(k)), Object.keys(PHYS).join(','));
check('world.js 不再导出道具 API (itemRoll/useItem)', W.itemRoll === undefined && W.useItem === undefined, 'keys=' + Object.keys(W).join(','));
{
  const nw = new World({ track, vehicle: DEFAULT_VEHICLE, racer: 'rong', seed: 11 });
  nw.start();
  check('比赛世界里不再有道具箱 / 投射物', nw.itemBoxes === undefined && nw.projectiles === undefined && nw.player.item === undefined, '');
}
console.log('=== 整场竞速: 8 车手 3 圈 (完美走线玩家) ===');
const t0ms = Date.now();
const run = runRace({ track, vehicle: DEFAULT_VEHICLE, racer: 'rong', seed: 7, seconds: 400 });
const w = run.world;
const rows = w.results().rows;
console.log('  仿真耗时 ' + f((Date.now() - t0ms) / 1000) + ' s | 比赛时长 ' + f(w.time) + ' s | 出界 ' + w.karts.reduce((a, k) => a + k.offTrackEvents, 0) + ' 次 | 复位 ' + w.karts.reduce((a, k) => a + k.respawnCount, 0) + ' 次 | 碰撞 ' + w.events.filter(e => e.type === 'contact').length + ' 次');
for (const r of rows) {
  console.log('   P' + r.pos + ' ' + (r.isPlayer ? '*' : ' ') + String(r.name).padEnd(4, ' ') + ' 完赛=' + (r.finished ? '是' : '否') + ' 总时间=' + f(r.time).padStart(6) + ' 最佳圈=' + f(r.best).padStart(6) + ' 圈=' + r.laps);
}
check('结算表里玩家昵称统一为「玩家」', rows.some(r => r.isPlayer && r.name === '玩家'), rows.filter(r => r.isPlayer).map(r => r.name).join(','));
check('八位车手名字互不相同 (玩家外观每场随机)', new Set(rows.map(r => r.name)).size === 8, rows.map(r => r.name).join(' '));
check('完赛车的圈数都记满 3 圈 (回归: 完赛后刹倒车不会扣圈)', rows.every(r => r.laps === RACE.laps), rows.map(r => r.name + ':' + r.laps).join(' '));
check('结算名次 = 完赛时间升序 (完赛者排在未完赛者前)', (() => { const fs = rows.filter(r => r.finished).map(r => r.time); return fs.every((v, i) => i === 0 || v >= fs[i - 1] - 1e-6); })(), rows.map(r => f(r.time)).join(' '));
const player = w.player;
console.log('  玩家圈速: ' + player.lapTimes.map(x => f(x)).join(' / ') + ' s');
check('玩家完赛 (3 圈)', player.finished, 'time=' + f(player.finishTime));
check('玩家总时间 120-360 s', player.finishTime !== null && player.finishTime > 120 && player.finishTime < 360, 'time=' + f(player.finishTime));
check('记录 3 个单圈且每圈 25-120 s', player.lapTimes.length === 3 && player.lapTimes.every(t => t > 25 && t < 120), player.lapTimes.map(x => f(x)).join(' / '));
check('最佳单圈 <= 平均圈速', player.bestLap !== null && player.bestLap <= player.finishTime / 3 + 0.01, 'best=' + f(player.bestLap));
const fin = w.karts.filter(k => k.finished).length;
check('>=7 名车手完赛 (AI 能跑完全程)', fin >= 7, fin + '/8');
const champTime = Math.min(...w.karts.filter(k => k.finished).map(k => k.finishTime));
const gapToChamp = (player.finishTime - champTime) / champTime;
check('AI 比 0.92 g 参考走线更快 (对手提速已生效)', gapToChamp > 0.03, 'rank=' + player.rank + '/8 AI 快 ' + f(gapToChamp * 100, 1) + '%');
check('AI 内部冠军与末位差距 < 20% (有竞争但不失控)', (() => { const ts = w.karts.filter(k => k.finished && !k.isPlayer).map(k => k.finishTime); return ts.length >= 6 && (Math.max(...ts) - Math.min(...ts)) / Math.min(...ts) < 0.2; })(), (() => { const ts = w.karts.filter(k => k.finished && !k.isPlayer).map(k => k.finishTime); return f(Math.min(...ts)) + '-' + f(Math.max(...ts)); })());
{
  const g0 = new World({ track, vehicle: DEFAULT_VEHICLE, racer: 'rong', seed: 7 });
  const pl = g0.player;
  check('玩家发车排在最后一位 (第 8 格 / 初始名次 8)', pl.gridIndex === RACE.racers - 1 && pl.rank === RACE.racers && g0.karts.every(k => k.isPlayer || k.gridIndex < pl.gridIndex),
    'player gridIndex=' + pl.gridIndex + ' rank=' + pl.rank + ' | 各车 grid=' + g0.karts.map(k => k.gridIndex).join(','));
}
check('玩家跑出过 >95% 极速', run.topSpeed > player.maxSpeed * 0.95, 'top=' + f(run.topSpeed) + ' vmax=' + f(player.maxSpeed));
check('玩家极少掉出赛道 (<4 次)', player.offTrackEvents < 4, 'offTrack=' + player.offTrackEvents);
check('无人被反复复位 (<6 次)', w.karts.every(k => k.respawnCount < 6), JSON.stringify(w.karts.map(k => k.respawnCount)));
console.log('=== 对手实力分布 (每台 AI 独立随机: 加速 1.20-1.40 / 极速 1.05-1.15 / 抓地 1.20-1.35 / 质量 1) ===');
{
  const mk = (seed, vehicle = DEFAULT_VEHICLE) => new World({ track, vehicle, racer: 'rong', seed });
  const w1 = mk(21);
  const ai = w1.karts.filter(k => !k.isPlayer);
  const inR = (v, r) => v >= r[0] - 1e-9 && v <= r[1] + 1e-9;
  console.log('  ' + ai.map(k => 'A' + k.id + ' 加速' + f(k.vehicle.accel) + ' 极速' + f(k.vehicle.spd, 3) + ' 抓地' + f(k.vehicle.grip) + ' vmax ' + f(k.maxSpeed) + ' m/s').join(' | '));
  check('7 台 AI 的加速落在 1.20-1.40', ai.every(k => inR(k.vehicle.accel, AI.aiAccel)), ai.map(k => f(k.vehicle.accel)).join(' '));
  check('7 台 AI 的极速系数落在 1.05-1.15', ai.every(k => inR(k.vehicle.spd, AI.aiSpd)), ai.map(k => f(k.vehicle.spd, 3)).join(' '));
  check('7 台 AI 的抓地系数落在 1.20-1.35', ai.every(k => inR(k.vehicle.grip, AI.aiGrip)), ai.map(k => f(k.vehicle.grip)).join(' '));
  check('7 台 AI 的碰撞质量固定为 1', ai.every(k => k.vehicle.mass === 1), ai.map(k => k.vehicle.mass).join(' '));
  check('AI 极速 = 基础极速 30 × spd', ai.every(k => Math.abs(k.maxSpeed - PHYS.baseMaxSpeed * k.vehicle.spd) < 1e-9), f(ai[0].maxSpeed) + '-' + f(ai[6].maxSpeed) + ' m/s');
  check('AI 加速生效 (T90 = 3.0 / accel)', ai.every(k => Math.abs(k.timeTo90 - PHYS.timeTo90 / k.vehicle.accel) < 1e-9), f(ai[0].timeTo90) + '-' + f(ai[6].timeTo90) + ' s');
  check('同一颗种子抽到同一组 AI 数值 (可复现)', JSON.stringify(mk(21).aiVehicles) === JSON.stringify(w1.aiVehicles), '');
  check('换玩家车辆不影响 AI 数值', JSON.stringify(mk(21, 'rush').aiVehicles) === JSON.stringify(w1.aiVehicles), '');
  const key = w2 => w2.aiVehicles.map(v => f(v.accel) + '/' + f(v.spd, 3)).join(',');
  const varied = new Set([1, 2, 3, 4, 5, 6].map(s => key(mk(s))));
  console.log('  跨 6 个种子按了 ' + varied.size + ' 组不同的数值表');
  check('不同种子抽到不同组合 (每场对手都不一样)', varied.size === 6, varied.size + ' 种');
}
console.log('=== 熟练玩家 (弯道吃到 1.4 g) 对新 AI 弯速 ===');
{
  // AI 弯速按 AI.cornerLat (12.5 ≈ 1.27 g) 估, 且直线本来就快 —— 这条线锁住「对手不能被轻易甩开」。
  const wh = new World({ track, vehicle: 'rush', racer: 'rong', seed: 7 });
  wh.start();
  let g2 = 0;
  while (!wh.karts.every(k => k.finished) && g2++ < 60 * 500) { W.hotLine(wh, wh.player, 14); wh.step(1 / 60); }
  const ch2 = Math.min(...wh.karts.filter(k => k.finished && !k.isPlayer).map(k => k.finishTime));
  console.log('  玩家 ' + f(wh.player.finishTime, 1) + ' s / AI 冠军 ' + f(ch2, 1) + ' s | 名次 ' + wh.player.rank + '/8 | 玩家最佳圈 ' + f(wh.player.bestLap));
  check('1.4 g 的熟练走线也被 AI 压住 (对手够快)', wh.player.finishTime > ch2, 'P' + wh.player.rank + '/8 ' + f(wh.player.finishTime, 1) + 's vs ' + f(ch2, 1) + 's');
  check('AI 提速后仍整场跑完 (无人半途卡死)', wh.karts.filter(k => k.finished).length === 8, wh.karts.filter(k => k.finished).length + '/8');
  check('AI 提速后没有反复冲出去复位 (<6 次)', wh.karts.every(k => k.respawnCount < 6), JSON.stringify(wh.karts.map(k => k.respawnCount)));
}
console.log('=== 转向约定 ===');
check('按键映射: A/← = 左转 (+1), D/→ = 右转 (-1)',
  steerFromKeys(['ArrowLeft', 'KeyA'], ['ArrowRight', 'KeyD'], c => c === 'KeyA') === 1
  && steerFromKeys(['ArrowLeft', 'KeyA'], ['ArrowRight', 'KeyD'], c => c === 'ArrowRight') === -1
  && steerFromKeys(['ArrowLeft', 'KeyA'], ['ArrowRight', 'KeyD'], new Set(['KeyA'])) === 1     // game.js 真实用法: 传按下的键码 Set
  && steerFromKeys(['ArrowLeft', 'KeyA'], ['ArrowRight', 'KeyD'], new Set(['KeyD'])) === -1
  && steerFromKeys(['ArrowLeft', 'KeyA'], ['ArrowRight', 'KeyD'], new Set(['KeyW'])) === 0,
  'KeyA → +1, ArrowRight → -1');
{
  const k = new Kart({ id: 0, racer: rong, vehicle: VEHICLES[DEFAULT_VEHICLE], track, isPlayer: true, gridIndex: 0 });
  const w2 = { ...stub, time: 0 };
  const h0 = k.heading;
  for (let i = 0; i < 60; i++) { k.input.throttle = true; k.input.steer = 1; step(k, RACE.dt, w2); }
  const dh = k.heading - h0;
  const smp = track.sample(k.s);
  const leftward = (smp.nx * (k.x - smp.x) + smp.nz * (k.z - smp.z)) * Math.sign(smp.nx + smp.nz || 1);
  check('物理约定: steer=+1 = 左转 (heading 增大)', dh > 0.02, 'Δh=' + f(dh, 3) + ' rad | 左移 ' + f(leftward, 2) + ' m');
}

console.log('=== 确定性 ===');
{
  const r1 = runRace({ track, seed: 3, seconds: 400 });
  const r2 = runRace({ track, seed: 3, seconds: 400 });
  check('同种子锁步一致', Math.abs((r1.world.player.finishTime ?? -1) - (r2.world.player.finishTime ?? -1)) < 1e-9, 'p1=' + f(r1.world.player.finishTime) + ' p2=' + f(r2.world.player.finishTime));
}

console.log('');
console.log(results.join('\n'));
console.log('');
console.log(fail === 0 ? ('✅ 全部通过: ' + pass + ' 项') : ('❌ 通过 ' + pass + ' 项, 失败 ' + fail + ' 项'));
process.exit(fail === 0 ? 0 : 1);
