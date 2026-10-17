
const fs = require('fs');
const p = 'D:/DSH-projects/paper-racing/src/render/game.js';
let s = fs.readFileSync(p, 'utf8');
const reps = [];
const add = (find, rep, count) => reps.push({ find, rep, count: count === undefined ? 1 : count });

add("// 纸艺竞速 · 主循环 / 状态机 / 输入 / 声音 / 存档", "// 卡通竞速 · 主循环 / 状态机 / 输入 / 声音 / 存档");
add("  drift: ['Space'],\n  itemF: ['KeyX', 'KeyE'],\n  itemB: ['KeyJ'],\n", "");
add("  update(speed, grass, boost, active) {", "  update(speed, grass, active) {");
add("    const f = 58 + Math.abs(speed) * 6.4 + (boost ? 26 : 0);", "    const f = 58 + Math.abs(speed) * 6.4;");
add("this.engine.update(0, false, false, false);", "this.engine.update(0, false, false);", 2);
add("this.engine.update(this.player.speed, this.player.onGrass, this.player.boost > 0, stepping);", "this.engine.update(this.player.speed, this.player.onGrass, stepping);");
add("      vehicle: VEHICLES[this.progress.vehicle] ? this.progress.vehicle : DEFAULT_VEHICLE,\n      racer: this.progress.racer || 'rong',\n      chapter: this.progress.chapter || 'ch1'",
    "      vehicle: VEHICLES[this.progress.vehicle] ? this.progress.vehicle : DEFAULT_VEHICLE,\n      chapter: this.progress.chapter || 'ch1'");
add("    this.uiStep = 1;          // 发车准备向导的当前步骤 (1 章节 / 2 车辆 / 3 车手)", "    this.uiStep = 1;          // 发车准备向导的当前步骤 (1 章节 / 2 车辆)");
add("    return { vehicle: this.sel.vehicle, chapter: this.sel.chapter, racer: this.sel.racer, step: this.uiStep };",
    "    return { vehicle: this.sel.vehicle, chapter: this.sel.chapter, step: this.uiStep };");
add("    if (typeof step === 'number') this.uiStep = Math.min(3, Math.max(1, step));", "    if (typeof step === 'number') this.uiStep = Math.min(2, Math.max(1, step));");
add("    } else if (this.uiStep === 2) {\n      const vk = Object.keys(VEHICLES);\n      let i = vk.indexOf(this.sel.vehicle); i = (i + dir + vk.length) % vk.length;\n      this.sel.vehicle = vk[i];\n    } else {\n      let i = RACERS.findIndex(r => r.key === this.sel.racer);\n      i = (i + dir + RACERS.length) % RACERS.length;\n      this.sel.racer = RACERS[i].key;\n    }",
    "    } else {\n      const vk = Object.keys(VEHICLES);\n      let i = vk.indexOf(this.sel.vehicle); i = (i + dir + vk.length) % vk.length;\n      this.sel.vehicle = vk[i];\n    }");
add("    if (this.uiStep < 3) this.openSelect(this.uiStep + 1);", "    if (this.uiStep < 2) this.openSelect(this.uiStep + 1);");
add("    this.progress.vehicle = this.sel.vehicle;\n    this.progress.racer = this.sel.racer;\n    this.progress.chapter = this.sel.chapter;",
    "    this.progress.vehicle = this.sel.vehicle;\n    this.progress.chapter = this.sel.chapter;");
add("      // 调试: 自动走一遍发车准备向导 (章节 -> 车辆 -> 车手 -> 发车), 结果写进诊断行", "      // 调试: 自动走一遍发车准备向导 (章节 -> 车辆 -> 发车), 结果写进诊断行");
add("'flow OK state=' + self.state + ' chapter=' + self.sel.chapter + ' racer=' + self.sel.racer + ' vehicle=' + self.sel.vehicle;",
    "'flow OK state=' + self.state + ' chapter=' + self.sel.chapter + ' vehicle=' + self.sel.vehicle;");
add("      this.sel.vehicle = /grip/.test(hash) ? 'grip' : (/rush/.test(hash) ? 'rush' : DEFAULT_VEHICLE);\n      this.sel.racer = 'rong';\n",
    "      this.sel.vehicle = /grip/.test(hash) ? 'grip' : (/rush/.test(hash) ? 'rush' : DEFAULT_VEHICLE);\n");
add("      if (e.repeat) { if (e.code === 'Space') e.preventDefault(); return; }", "      if (e.repeat) return;");
add("if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(e.code) >= 0) e.preventDefault();",
    "if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) >= 0) e.preventDefault();", 2);
add("      } else if (KEYMAP.itemF.indexOf(e.code) >= 0) {\n        if (self.player) self.player.input.item = 1;\n      } else if (KEYMAP.itemB.indexOf(e.code) >= 0) {\n        if (self.player) self.player.input.item = 2;\n      }\n", "");
add("    if (a === 'vehicle') { if (VEHICLES[v]) { this.sel.vehicle = v; this.saveProgress(); this.openSelect(3); } return; }\n    if (a === 'racer') { this.sel.racer = v; this.saveProgress(); this.openSelect(3); return; }",
    "    if (a === 'vehicle') { if (VEHICLES[v]) { this.sel.vehicle = v; this.saveProgress(); this.openSelect(2); } return; }");
add("    if (a === 'select') { this.teardown(); this.openSelect(3); return; }", "    if (a === 'select') { this.teardown(); this.openSelect(2); return; }");
add("    this.teardown();\n    this.world = new World({\n      track: this.track,\n      vehicle: this.sel.vehicle,\n      racer: this.sel.racer,",
    "    this.teardown();\n    // 玩家每一场随机抽一位车手外观 (只有外观, 没有数值)\n    this.sel.racer = RACERS[Math.floor(Math.random() * RACERS.length) % RACERS.length].key;\n    this.world = new World({\n      track: this.track,\n      vehicle: this.sel.vehicle,\n      racer: this.sel.racer,");
add("      racerName: (racerByKey(this.sel.racer) || {}).name || '',\n      vehicleLabel: veh.name,", "      vehicleLabel: veh.name,");
add("      this.world.step(RACE.dt);\n      this.player.input.item = 0;\n      this.tickRace();", "      this.world.step(RACE.dt);\n      this.tickRace();");
add("      perfectLine(this.world, p);\n      if (p.item && Math.random() < 0.02) this.world.useItem(p, false);\n      return;", "      perfectLine(this.world, p);\n      return;");
add("    p.input.brake = !locked && dn(KEYMAP.brake);\n    p.input.drift = !locked && dn(KEYMAP.drift);", "    p.input.brake = !locked && dn(KEYMAP.brake);");
add("        this.world.step(RACE.dt);\n        this.player.input.item = 0;\n        this.accum -= RACE.dt;", "        this.world.step(RACE.dt);\n        this.accum -= RACE.dt;");
add("    if (this.player) {\n      const it = this.player.item;\n      if (this.prevItem && !it) { this.hud.toast('道具 · ' + this.prevItem.label); this.engine.blip(700, 0.12, 'square', 0.05); }\n      this.prevItem = it;\n    }\n", "");
add("        name: k.racer.name + (k.isPlayer ? '（你）' : ''),", "        name: k.isPlayer ? '玩家' : k.racer.name,");
add("        ' lat=' + p.lateral.toFixed(2) + ' resp=' + p.respawnCount + ' item=' + (p.item ? p.item.label : '-') +\n", "        ' lat=' + p.lateral.toFixed(2) + ' resp=' + p.respawnCount +\n");

const fails = [];
for (const r of reps) {
  const n = s.split(r.find).length - 1;
  if (n !== r.count) fails.push('count=' + n + ' expected=' + r.count + ' :: ' + r.find.slice(0, 70));
}
if (fails.length) { console.log('FAILED:\n' + fails.join('\n')); }
else {
  for (const r of reps) s = s.split(r.find).join(r.rep);
  fs.writeFileSync(p, s);
  console.log('game.js patched OK');
}
