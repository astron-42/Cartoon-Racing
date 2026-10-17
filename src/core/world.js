// 比赛世界: 圈数/名次/出界复位/AI。纯逻辑, 不依赖 DOM 或 three.js —— 测试与渲染共用同一份仿真。
// 2026-10 改版: 删掉道具 / 投射物 / 道具箱; 玩家每场随机一位车手外观, 结算表里玩家那一行名字固定为「玩家」。
import { Kart, step, mulberry } from './kart.js';
import { RACE, AI, PHYS, CHAPTERS, chapterByKey, RACERS, DEFAULT_VEHICLE, racerByKey, vehicleByKey } from './constants.js';

// AI 车手名单: 跳过玩家这一场随机到的角色, 保证 8 台车外观各不相同
export function aiRacerFor(i, playerRacer) {
  const pool = RACERS.filter(r => r.key !== playerRacer);
  return pool[(i * 3 + 1) % pool.length];
}

export function laneFollower(kart, lookDist = AI.lookahead) {
  const t = kart.lookahead(lookDist);
  const dx = t.x - kart.x, dz = t.z - kart.z;
  const desired = Math.atan2(dx, dz);
  let diff = desired - kart.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.max(-1, Math.min(1, diff * AI.steerGain));
}

// 弯道限速: 前视窗口内最严的 v = sqrt(latAccelMax * R)。直道的松弛曲率不再被误判为弯道。
export function cornerSpeedLimit(track, s, lookahead = AI.cornerLookahead, latAccel = PHYS.latAccelMax) {
  let limit = Infinity;
  for (let d = 6; d <= lookahead; d += 6) {
    const R = 1 / Math.max(track.curvatureAt(s + d), 1e-6);
    const v = Math.sqrt(latAccel * R);
    if (v < limit) limit = v;
  }
  return limit;
}

export class World {
  constructor(opts = {}) {
    const { track, vehicle = DEFAULT_VEHICLE, racer, aiSkill = 1, seed = 7, laps = RACE.laps, chapter = 0 } = opts;
    this.track = track;
    this.vehicle = vehicleByKey(vehicle);
    this.chapter = chapterByKey(chapter);
    this.laps = laps;
    this.time = 0;
    this.phase = 'countdown';
    this.countdown = 3.2;
    this.finishOrder = [];
    this.events = [];
    this.karts = [];
    const rng = mulberry(seed);
    // 没指定就按种子随机抽一位车手外观 (同一 seed 结果一致, 测试可复现)
    const playerRacer = racer || RACERS[Math.floor(rng() * RACERS.length) % RACERS.length].key;

    // 对手实力: 每台 AI 的车辆数值在 AI.aiAccel / aiSpd / aiGrip 区间里独立随机,
    // 碰撞质量固定 AI.aiMass。抽样用同一颗种子 (rng) → 同种子锁步一致, 回放/测试可复现。
    const pick = (range) => Math.round((range[0] + (range[1] - range[0]) * rng()) * 1000) / 1000;
    const makeAiVehicle = (i) => ({
      key: 'ai' + i, name: 'AI ' + i,
      accel: pick(AI.aiAccel), spd: pick(AI.aiSpd), grip: pick(AI.aiGrip), mass: AI.aiMass,
    });
    this.playerTop = PHYS.baseMaxSpeed * this.vehicle.spd;
    this.aiCornerLat = AI.cornerLat;   // AI 弯速估计; 工具/测试可覆盖, 用来扫「AI 敢开多快」
    this.aiVehicles = [];

    for (let i = 0; i < RACE.racers; i++) {
      const isPlayer = i === 0;
      const rc = isPlayer ? racerByKey(playerRacer) : aiRacerFor(i, playerRacer);
      // 玩家开所选车辆; 每台 AI 用自己的随机车辆数值 (只影响物理, 外观仍取车手车身色)
      let veh = this.vehicle;
      if (!isPlayer) { veh = makeAiVehicle(i); this.aiVehicles.push(veh); }
      // 发车排位: 玩家固定排在最后一位 (第 8 格 / 最后一排), 七台 AI 占前 7 格 —— 开局就得往前追。
      const gridIndex = isPlayer ? RACE.racers - 1 : i - 1;
      this.karts.push(new Kart({
        id: i, racer: rc, vehicle: veh, track,
        isPlayer, rngSeed: (seed * 977 + i * 131) >>> 0,
        aiSkill,
        gridIndex,
        topSpeed: 0,          // 0 = 用 vehicle.spd 自己算极速
      }));
    }
    this.player = this.karts[0];
    this.rand = rng;
    this.pending = null;
  }

  get raceStarted() { return this.phase !== 'countdown'; }

  start() { this.phase = 'racing'; }

  step(dt) {
    if (this.phase === 'countdown') {
      this.countdown -= dt;
      if (this.countdown <= 0) { this.phase = 'racing'; this.time = 0; }
      return;
    }
    if (this.phase !== 'racing') return;
    this.time += dt;
    for (const k of this.karts) {
      if (k.isPlayer) { if (k.finished) { k.input.throttle = false; k.input.brake = false; } }
      else this.driveAi(k, dt);
      step(k, dt, this);   // ctx 即 World: 提供 track/time/laps/onFinish/onRespawn
    }
    this.collide();
    this.rank();
    if (this.player.finished && !this.pending) this.pending = this.results();
  }

  // AI: 前视走线 + 弯道预判减速 + 出界自动回正。强度由 aiSkill 与 AI 参数决定。
  driveAi(k, dt) {
    if (k.finished) { k.input.throttle = false; k.input.brake = false; k.input.steer *= 0.9; return; }   // 完赛后只滑行, 别倒车压线把圈数扣掉
    const look = AI.lookahead * (0.95 + 0.12 * Math.sin(k.phase));   // 每台车的前视略不同, 走线不整齐划一
    const desired = laneFollower(k, look);
    const bob = Math.sin(this.time * AI.bobFreq * Math.PI * 2 + k.phase) * (AI.speedBob / 1000);
    const skill = k.aiSkill * (1 + bob);
    // 弯道预判: 前视窗口内最严限速 (弯道有多急 → 该开多快)
    const vLim = cornerSpeedLimit(this.track, k.s, AI.cornerLookahead, this.aiCornerLat);
    const target = Math.min(k.maxSpeed * skill * AI.topKeep, vLim) * (k.onGrass ? 0.8 : 1);
    let steer = desired;
    if (k.onGrass) {
      // 出界后朝赛道中心线回正, 避免在草地上绕圈
      const center = this.track.sample(k.s);
      const dx = center.x - k.x, dz = center.z - k.z;
      let want = Math.atan2(dx, dz) - k.heading;
      while (want > Math.PI) want -= Math.PI * 2;
      while (want < -Math.PI) want += Math.PI * 2;
      steer = Math.max(-1, Math.min(1, want * AI.steerGain));
    }
    k.input.steer = Math.max(-1, Math.min(1, steer));
    const delta = target - k.speed;
    if (delta > 0.4) { k.input.throttle = true; k.input.brake = false; }
    else if (delta < -2.5) { k.input.throttle = false; k.input.brake = k.speed > k.maxSpeed * 0.55; }
    else { k.input.throttle = false; k.input.brake = false; }
  }

  collide() {
    for (let a = 0; a < this.karts.length; a++) {
      for (let b = a + 1; b < this.karts.length; b++) {
        const A = this.karts[a], B = this.karts[b];
        const dx = B.x - A.x, dz = B.z - A.z;
        const d2 = dx * dx + dz * dz;
        const minD = 2.4;
        if (d2 > minD * minD || d2 < 1e-6) continue;
        const d = Math.sqrt(d2);
        const nx = dx / d, nz = dz / d;
        const overlap = (minD - d) * 0.5;
        const wA = 1 / (A.mass || 1), wB = 1 / (B.mass || 1);
        const tot = wA + wB;
        A.x -= nx * overlap * (wA / tot) * 2; A.z -= nz * overlap * (wA / tot) * 2;
        B.x += nx * overlap * (wB / tot) * 2; B.z += nz * overlap * (wB / tot) * 2;
        const closing = (A.speed * (nx * Math.sin(A.heading) + nz * Math.cos(A.heading)))
                      - (B.speed * (nx * Math.sin(B.heading) + nz * Math.cos(B.heading)));
        if (closing > 6) {
          const impact = Math.min(0.35, 0.05 + closing / 120);
          A.speed *= 1 - impact * (wB / tot);
          B.speed *= 1 - impact * (wA / tot);
          const spin = closing > 16 ? 0.35 : 0;
          A.visual.spinT = Math.max(A.visual.spinT, spin);
          B.visual.spinT = Math.max(B.visual.spinT, spin);
          this.events.push({ t: this.time, type: 'contact', a: A.id, b: B.id, closing: +closing.toFixed(1) });
        }
      }
    }
  }

  rank() {
    const prog = k => k.laps * this.track.total + k.s;
    const sorted = this.karts.slice().sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return prog(b) - prog(a);
    });
    sorted.forEach((k, i) => { k.rank = i + 1; });
    this.order = sorted;
  }

  onFinish(kart) {
    this.finishOrder.push(kart.id);
    this.events.push({ t: this.time, type: 'finish', who: kart.id, rank: this.finishOrder.length });
  }

  onRespawn(kart) {
    this.events.push({ t: this.time, type: 'respawn', who: kart.id });
  }

  results() {
    const sorted = this.karts.slice().sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return a.rank - b.rank;
    });
    return {
      chapter: this.chapter,
      vehicle: this.vehicle.key,
      laps: this.laps,
      rows: sorted.map((k, i) => ({
        pos: i + 1, id: k.id, isPlayer: k.isPlayer,
        name: k.isPlayer ? '玩家' : k.racer.name,   // 玩家的车手是随机的, 表里统一叫「玩家」
        finished: k.finished, time: k.finishTime, best: k.bestLap, laps: k.laps,
      })),
      player: { pos: sorted.findIndex(k => k.isPlayer) + 1, time: this.player.finishTime, best: this.player.bestLap },
    };
  }
}

// 完美走线策略: 无头验证与参考圈速用。与 AI 同源 (前视走线 + 弯道预判减速), 但不带抖动。
export function perfectLine(world, k) {
  if (k.finished) { k.input.throttle = false; k.input.brake = false; return; }
  const desired = laneFollower(k, AI.lookahead);
  k.input.steer = Math.max(-1, Math.min(1, desired));
  const vLim = cornerSpeedLimit(world.track, k.s);
  const target = Math.min(k.maxSpeed * 0.99, vLim) * (k.onGrass ? 0.8 : 1);
  const delta = target - k.speed;
  k.input.throttle = delta > 0.3;
  k.input.brake = delta < -2.5 && k.speed > k.maxSpeed * 0.5;
}

// 熟练玩家的参考走线: 同一条前视线, 但过弯侧向加速度用 latAccel (默认 1.2 g, 高于 AI 估速用的 PHYS.latAccelMax)。
// AI 的弯速按 0.92 g 估, 人类可以更晚刹车 —— 这条曲线用来验证「AI 直线更快, 玩家弯道更快」的设计前提。
export function hotLine(world, k, latAccel = 12) {
  if (k.finished) { k.input.throttle = false; k.input.brake = false; return; }
  k.input.steer = Math.max(-1, Math.min(1, laneFollower(k, AI.lookahead)));
  let limit = Infinity;
  for (let d = 6; d <= AI.cornerLookahead; d += 6) {
    const R = 1 / Math.max(world.track.curvatureAt(k.s + d), 1e-6);
    const v = Math.sqrt(latAccel * R);
    if (v < limit) limit = v;
  }
  const target = Math.min(k.maxSpeed * AI.topKeep, limit) * (k.onGrass ? 0.8 : 1);
  const delta = target - k.speed;
  k.input.throttle = delta > 0.4;
  k.input.brake = delta < -2.5 && k.speed > k.maxSpeed * 0.55;
}

// 无头运行: 玩家用"完美走线"策略驾驶 (仅用于物理可达性验证)
export function runRace(opts = {}) {
  const { track, seconds = 240, dt = RACE.dt, playerPolicy = 'line' } = opts;
  const world = new World({ ...opts, track });
  world.start();
  const frames = Math.ceil(seconds / dt);
  let topSpeed = 0, maxLateral = 0;
  const player = world.player;
  const trace = [];
  let lastLap = 0;
  for (let f = 0; f < frames; f++) {
    if (playerPolicy === 'line' && !player.finished) perfectLine(world, player);
    world.step(dt);
    if (world.karts.every(k => k.finished)) break;
    topSpeed = Math.max(topSpeed, player.speed);
    maxLateral = Math.max(maxLateral, Math.abs(player.lateral));
    if (player.laps !== lastLap) { lastLap = player.laps; trace.push({ t: +world.time.toFixed(2), lap: player.laps, lapTime: +(player.lapTimes[player.lapTimes.length - 1] || 0).toFixed(2) }); }
  }
  return { world, topSpeed, maxLateral, trace };
}
