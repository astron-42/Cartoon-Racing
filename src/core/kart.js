// 车辆物理: 街机手感, 无物理引擎。所有状态可序列化, 便于无头验证与回放。
// 2026-10 改版: 删掉道具 / 漂移 / 跳跃与车手数值 —— 车性只由所选车辆(spd/accel/grip/mass)决定。
import { PHYS, AI } from './constants.js';

export class Kart {
  constructor({ id, racer, vehicle, track, isPlayer = false, rngSeed = 1, aiSkill = 1, gridIndex = 0, topSpeed = 0 }) {
    this.id = id;
    this.racer = racer;          // 纯外观 (随机抽到的车手)
    this.vehicle = vehicle;
    this.isPlayer = isPlayer;
    this.track = track;
    this.aiSkill = aiSkill;
    this.rng = mulberry(rngSeed);
    this.phase = this.rng() * Math.PI * 2;

    // 极速优先用 World 指定值 (topSpeed>0), 否则按车辆 spd 换算 —— AI 各自带随机车辆数值
    this.maxSpeed = topSpeed > 0 ? topSpeed : PHYS.baseMaxSpeed * vehicle.spd;
    // 指数逼近极速: v(t) = vmax (1 - e^(-rate t)), rate = ln10 / T90 → 0→90% 用时 = T90 / 车辆加速系数
    this.timeTo90 = PHYS.timeTo90 / vehicle.accel;
    this.timeToMax = this.timeTo90;                       // 兼容旧字段名
    this.accelG = this.maxSpeed * (Math.LN10 / this.timeTo90);
    this.steerBase = PHYS.steerRate * vehicle.grip;
    this.gripBase = Math.min(0.92, PHYS.steerGripMin + 0.10 * (vehicle.grip - 1));
    this.offroadKeep = PHYS.grassSlow + PHYS.offroadRecover;
    this.mass = vehicle.mass || 1;                        // 只用于碰撞推挤
    this.recoveryMass = AI.recoveryMass;
    this.lineOffset = ((gridIndex % 2) ? 1 : -1) * (0.25 + 0.06 * (gridIndex % 4));

    this.reset(gridIndex);
  }

  reset(gridIndex = this.gridIndex || 0) {
    this.gridIndex = gridIndex;
    const row = Math.floor(gridIndex / 2), col = (gridIndex % 2) ? 1 : -1;
    const s0 = this.track.total - 12 - row * 3.4;
    const lat = col * 0.30;
    const p = this.track.safePoint(s0, lat);
    this.x = p.x; this.z = p.z; this.heading = p.heading;
    this.y = 0; this.speed = 0;
    this.s = this.track.project(this.x, this.z).s;
    this.prevS = this.s;
    this.lateral = lat;
    this.laps = 0; this.lapStartT = 0; this.crossedLine = false;
    this.lapTimes = []; this.bestLap = null; this.finishTime = null;
    this.rank = gridIndex + 1;
    this.totalDistance = 0;
    this.onGrass = false;
    this.stuckT = 0; this.respawnCount = 0; this.offTrackEvents = 0; this.offTrackT = 0;
    this.input = { steer: 0, throttle: false, brake: false };
    this.visual = { roll: 0, pitch: 0, spinT: 0 };
  }

  get finished() { return this.finishTime !== null; }

  // 供渲染层与 AI 使用的前视点
  lookahead(dist) {
    const p = this.track.sample(this.s + dist);
    const lat = (this.lineOffset + (this.isPlayer ? 0 : AI.lineBob * Math.sin(this.phase + this.s * 0.02))) * this.track.halfWidth * 0.8;
    return { x: p.x + p.nx * lat, z: p.z + p.nz * lat, tx: p.tx, tz: p.tz };
  }
}

export function step(kart, dt, ctx) {
  const world = ctx;
  const track = kart.track;
  const i = kart.input;

  if (kart.visual.spinT > 0) kart.visual.spinT = Math.max(0, kart.visual.spinT - dt);

  // ---- 转向 ----
  const vFrac = Math.min(1, Math.abs(kart.speed) / kart.maxSpeed);
  let grip = Math.max(0.18, kart.gripBase + (1 - kart.gripBase) * (1 - vFrac));
  if (kart.onGrass) grip *= 0.7;
  const dir = kart.speed < -0.1 ? -1 : 1;
  kart.heading += i.steer * kart.steerBase * grip * dt * dir;
  kart.visual.roll += (i.steer * 0.10 - kart.visual.roll) * Math.min(1, dt * 8);

  // ---- 纵向 ----
  const targetMax = kart.maxSpeed * (kart.onGrass ? kart.offroadKeep : 1);
  if (i.throttle && !kart.finished) {
    // 线性衰减的加速曲线: 0→90% 极速耗时约 timeToMax*0.85, 与车辆加速系数挂钩
    const remain = 1 - kart.speed / Math.max(targetMax, 1e-3);
    if (remain > 0) kart.speed += kart.accelG * Math.max(0, remain) * dt;
    if (kart.onGrass) kart.speed -= PHYS.offroadSink * kart.speed * dt;
    kart.speed = Math.min(kart.speed, targetMax);
  } else if (i.brake && !kart.finished) {   // 已完赛的车只滑行: 倒车会越线扣圈
    kart.speed -= PHYS.brakeG * dt;
    if (kart.speed < 0) kart.speed = Math.max(kart.speed, -kart.maxSpeed * PHYS.reverseMax * 0.4);
  } else {
    // 松油门 = 向 0 衰减, 绝不变号。原来是无条件 `kart.speed -= PHYS.coast*dt`,
    // 静止时 0 被减成负数并逐帧累加(2.0 m/s²) ⇒ 车会自己倒着加速。
    const drag = PHYS.coast * dt * (kart.onGrass ? 2.2 : 1);
    if (kart.speed > 0) kart.speed = Math.max(0, kart.speed - drag);
    else if (kart.speed < 0) kart.speed = Math.min(0, kart.speed + drag * 0.6);
  }
  if (kart.speed > kart.maxSpeed * 1.35) kart.speed = kart.maxSpeed * 1.35;

  // ---- 位移 ----
  const fx = Math.sin(kart.heading), fz = Math.cos(kart.heading);
  kart.x += fx * kart.speed * dt;
  kart.z += fz * kart.speed * dt;
  kart.totalDistance += Math.abs(kart.speed) * dt;

  // ---- 赛道投影 / 圈数 / 掉出 ----
  const pr = track.project(kart.x, kart.z);
  const latRatio = pr.lateral / track.halfWidth;
  kart.lateral = latRatio;
  kart.onGrass = Math.abs(latRatio) > 1.0;
  const dS = pr.s - kart.prevS;
  // 起跑格在终点线之前: 发车后第一次越线只作为第 1 圈的计时基准, 之后每次越线记一圈 (PRD R4)
  if (dS < -track.total * 0.5) {
    if (!kart.crossedLine) {
      kart.crossedLine = true;
      kart.lapStartT = world.time;
    } else {
      kart.laps++;
      const lapT = world.time - kart.lapStartT;
      kart.lapTimes.push(lapT);
      if (kart.bestLap === null || lapT < kart.bestLap) kart.bestLap = lapT;
      kart.lapStartT = world.time;
      if (kart.laps >= world.laps && !kart.finished) {
        kart.finishTime = world.time;
        world.onFinish(kart);
      }
    }
  } else if (dS > track.total * 0.5) {
    if (!kart.finished) kart.laps = Math.max(0, kart.laps - 1);   // 倒车越线: 撤回一圈 (已完赛的成绩不再变动)
    kart.crossedLine = true;
  }
  kart.s = pr.s; kart.prevS = pr.s;

  // ---- 卡死 / 掉出复位 (PRD FR-12) ----
  const moving = Math.abs(kart.speed) > 1.5;
  if (!moving && (i.throttle || i.brake)) kart.stuckT += dt; else kart.stuckT = Math.max(0, kart.stuckT - dt * 2);
  kart.offTrackT = kart.onGrass ? kart.offTrackT + dt : 0;
  const farAway = pr.dist > PHYS.globalResetDist;
  const tooLateral = Math.abs(pr.lateral) > track.halfWidth * PHYS.lateralMax;
  if (farAway || tooLateral) kart.offTrackEvents++;
  if (kart.stuckT > PHYS.stuckTime || kart.offTrackT > PHYS.offTrackTime || farAway || tooLateral) {
    const safe = track.safePoint(pr.s, Math.max(-1, Math.min(1, kart.lateral)));
    kart.x = safe.x; kart.z = safe.z; kart.heading = safe.heading;
    const keep = Math.max(1, Math.abs(kart.speed) * 0.35);
    kart.speed = keep;
    kart.stuckT = 0; kart.offTrackT = 0; kart.respawnCount++;
    kart.prevS = track.project(kart.x, kart.z).s; kart.s = kart.prevS;
    world.onRespawn(kart);
  }
  return null;
}

export function mulberry(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
