
const fs = require('fs');
const p = 'D:/DSH-projects/paper-racing/src/render/scene.js';
let s = fs.readFileSync(p, 'utf8');
const reps = [
  ["// 纸艺竞速 · 3D 立体书场景: 浮空纸页 + 挖剪纸带赛道 + 剪纸装饰", "// 卡通竞速 · 3D 纸雕场景: 浮空纸页 + 挖剪纸带赛道 + 剪纸装饰"],
  ["ctx.fillText('纸 艺 竞 速 · 起 点', 256, 48);", "ctx.fillText('卡 通 竞 速 · 起 点', 256, 48);"],
  ["const bank = (kart.driftCharging ? -0.13 : 0) + (kart.input && kart.input.steer ? -kart.input.steer * 0.07 * Math.min(1, Math.abs(kart.speed) / 14) : 0);",
   "const bank = kart.input && kart.input.steer ? -kart.input.steer * 0.07 * Math.min(1, Math.abs(kart.speed) / 14) : 0;"],
  ["const up = 3.5 + vf * 0.5 + (player.airTime > 0 ? 0.6 : 0);", "const up = 3.5 + vf * 0.5;"]
];
let fail = [];
for (const [a, b] of reps) { const n = s.split(a).length - 1; if (n !== 1) fail.push('rep count=' + n + ' :: ' + a.slice(0, 50)); }
if (fail.length) { console.log('FAILED reps:\n' + fail.join('\n')); }
else {
  for (const [a, b] of reps) s = s.split(a).join(b);
  let lines = s.split('\n');
  const check = (n, frag) => { if (!lines[n - 1].includes(frag)) fail.push('line ' + n + ' does not contain ' + frag + ' :: ' + lines[n - 1].slice(0, 70)); };
  check(68, 'this.visibleProjectiles = [];');
  check(82, 'this.buildProjectilePool();');
  check(83, 'this.buildItemBoxes();');
  check(762, 'buildItemBoxes() {');
  check(821, '  }');
  check(822, '');
  check(887, 'this.syncItemBoxes(world);');
  check(888, 'this.syncProjectiles(world);');
  if (fail.length) { console.log('FAILED lines:\n' + fail.join('\n')); }
  else {
    for (const [a, b] of [[887, 888], [762, 822], [82, 83], [68, 68]]) lines.splice(a - 1, b - a + 1);
    fs.writeFileSync(p, lines.join('\n'));
    console.log('scene.js patched OK, now ' + lines.length + ' lines');
  }
}
