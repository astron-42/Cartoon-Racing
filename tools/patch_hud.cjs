
const fs = require('fs');
const p = 'D:/DSH-projects/paper-racing/src/render/hud.js';
let s = fs.readFileSync(p, 'utf8');
const reps = [];
const add = (find, rep, count) => reps.push({ find, rep, count: count === undefined ? 1 : count });

add("// 纸艺竞速 · HUD 与纸页界面", "// 卡通竞速 · HUD 与纸页界面");
add("  '#item{top:16px;left:16px;min-width:104px;clip-path:' + TORN[0] + ';}',\n  '#item .lbl{font-size:10px;letter-spacing:3px;color:var(--ink-soft);font-weight:700;}',\n  '#item .val{font-size:21px;font-weight:800;margin-top:3px;letter-spacing:1px;}',\n", "");
add("const STEP_NAMES = ['章节', '车辆', '车手'];\nconst STEP_TITLES = ['选赛道章节', '选车辆', '选车手'];",
    "const STEP_NAMES = ['章节', '车辆'];\nconst STEP_TITLES = ['选赛道章节', '选车辆'];");
add("      '<div class=\"card\" id=\"item\"><div class=\"lbl\">道具</div><div class=\"val\" id=\"itemVal\">—</div></div>',\n", "");
add("    this.el.querySelector('#itemVal').textContent = player.item ? (player.item.label || player.item.name || '道具') : '—';\n", "");
add("    for (const id of ['#item', '#lap', '#rank', '#mapbox']) {", "    for (const id of ['#lap', '#rank', '#mapbox']) {");
add("      const step = Math.min(3, Math.max(1, data.step || 1));", "      const step = Math.min(2, Math.max(1, data.step || 1));");

const vehBlock = "        body = '<div class=\"cards\">' + Object.keys(VEHICLES).map(k => {\n          const v = VEHICLES[k];\n          return this.cardHtml({\n            act: 'vehicle', val: k, on: k === data.vehicle,\n            svg: tint(ICONS.helm, v.color),   // 图标就是这台车的车身色\n            icon: 'helm',\n            title: v.name,\n            desc: v.desc,\n            tags: [v.role, '加速 <span class=\"bars\">' + statBars(v.bars.accel) + '</span>', '抓地 <span class=\"bars\">' + statBars(v.bars.grip) + '</span>']\n          });\n        }).join('') + '</div>';\n      } else {\n        body = '<div class=\"dpicks\">' + RACERS.map(r => {\n          const s = r.stats;\n          return '<div class=\"dpick ' + (r.key === data.racer ? 'on' : '') + '\" data-act=\"racer\" data-val=\"' + r.key + '\">' +\n            '<div class=\"nm\">' + r.name + '<span class=\"sw\" style=\"background:' + r.body + '\"></span></div>' +\n            '<div class=\"st\">' +\n            '速 <span class=\"bars\">' + statBars(s.speed) + '</span><br>' +\n            '加 <span class=\"bars\">' + statBars(s.accel) + '</span><br>' +\n            '操 <span class=\"bars\">' + statBars(s.handling) + '</span><br>' +\n            '重 <span class=\"bars\">' + statBars(s.weight) + '</span><br>' +\n            '野 <span class=\"bars\">' + statBars(s.offroad) + '</span>' +\n            '</div></div>';\n        }).join('') + '</div>';\n      }";
const vehOnly = "        body = '<div class=\"cards\">' + Object.keys(VEHICLES).map(k => {\n          const v = VEHICLES[k];\n          return this.cardHtml({\n            act: 'vehicle', val: k, on: k === data.vehicle,\n            svg: tint(ICONS.helm, v.color),   // 图标就是这台车的车身色\n            icon: 'helm',\n            title: v.name,\n            desc: v.desc,\n            tags: [v.role, '加速 <span class=\"bars\">' + statBars(v.bars.accel) + '</span>', '抓地 <span class=\"bars\">' + statBars(v.bars.grip) + '</span>']\n          });\n        }).join('') + '</div>';\n      }";
add(vehBlock, vehOnly);
add("      } else if (step === 2) {", "      } else {");

add("      const hints = [['← →', '切换'], ['Enter', step === 3 ? '出发' : '下一步'], ['Esc', '上一步']];\n      html = '<div class=\"screen\">' + this.topHtml('纸艺竞速 · 步骤 ' + step + '/3 · ' + STEP_NAMES[step - 1], STEP_TITLES[step - 1], true, chips) +",
    "      const hints = [['← →', '切换'], ['Enter', step === 2 ? '出发' : '下一步'], ['Esc', '上一步']];\n      html = '<div class=\"screen\">' + this.topHtml('卡通竞速 · 步骤 ' + step + '/2 · ' + STEP_NAMES[step - 1], STEP_TITLES[step - 1], true, chips) +");
add("'<div style=\"margin-top:16px;font-size:13px;letter-spacing:2px;font-weight:800\">' + (data.racerName || '') + ' · ' + (data.vehicleLabel || '') + ' · 3 圈</div>' +",
    "'<div style=\"margin-top:16px;font-size:13px;letter-spacing:2px;font-weight:800\">' + (data.vehicleLabel || '') + ' · 3 圈</div>' +");
add("纸艺竞速 · 键盘操作", "卡通竞速 · 键盘操作");
add("      '<div><span class=\"kb\">空格</span>按住并转向=漂移蓄力，短按=跳跃</div>',\n      '<div><span class=\"kb\">X / E</span>向前使用道具</div>',\n      '<div><span class=\"kb\">J</span>向后使用道具</div>',\n", "");
add("'<div class=\"btn ghost\" data-act=\"select\">换个车手</div>'", "'<div class=\"btn ghost\" data-act=\"select\">换辆车</div>'");

const fails = [];
for (const r of reps) {
  const n = s.split(r.find).length - 1;
  if (n !== r.count) fails.push('count=' + n + ' expected=' + r.count + ' :: ' + r.find.slice(0, 60).replace(/\n/g, '\\n'));
}
if (fails.length) console.log('FAILED:\n' + fails.join('\n'));
else { for (const r of reps) s = s.split(r.find).join(r.rep); fs.writeFileSync(p, s); console.log('hud.js patched OK'); }
