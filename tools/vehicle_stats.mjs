import { VEHICLES, PHYS } from '../src/core/constants.js';
const KMH = 3.6;
const rows = [];
for (const key of ['rush','balance','grip']) {
  const v = VEHICLES[key];
  const vmax = PHYS.baseMaxSpeed * v.spd;
  const T90 = PHYS.timeTo90 / v.accel;
  const tau = T90 / Math.LN10;
  const accelG = vmax * Math.LN10 / T90;
  // 按 kart.js step() 的积分式: dv = accelG * (1 - v/vmax) * dt
  let sp = 0, t = 0; const dt = 1/600;
  const marks = [50/KMH, 100/KMH, vmax*0.9, vmax*0.99];
  const hit = marks.map(() => null);
  while (t < 40) {
    sp += accelG * Math.max(0, 1 - sp/vmax) * dt; t += dt;
    for (let i = 0; i < marks.length; i++) if (hit[i] === null && sp >= marks[i]) hit[i] = t;
  }
  const steer = PHYS.steerRate * v.grip;
  const keep = Math.min(0.92, PHYS.steerGripMin + 0.10 * (v.grip - 1));
  const wTop = steer * keep, wLow = steer;
  rows.push({
    key, name: v.name, role: v.role,
    accel: v.accel, spd: v.spd, grip: v.grip, mass: v.mass,
    vmax: +vmax.toFixed(2), kmh: +(vmax*KMH).toFixed(1),
    T90: +T90.toFixed(3),
    t50: +hit[0].toFixed(2), t100: +hit[1].toFixed(2),
    a0: +accelG.toFixed(1),
    steerLow: +wLow.toFixed(3), steerTop: +wTop.toFixed(3),
    Rlow: +(10/wLow).toFixed(1), Rtop: +(vmax/wTop).toFixed(1),
    latG: +(vmax*wTop/9.80665).toFixed(2)
  });
}
console.log(JSON.stringify(rows, null, 1));
