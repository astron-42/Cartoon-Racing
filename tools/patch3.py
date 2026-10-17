
import io
p = r"D:/DSH-projects/paper-racing/tests/headless.test.mjs"
s = io.open(p, encoding="utf-8").read()

imp_old = "import { PHYS, RACE, VEHICLES, ITEMS, racerByKey, DEFAULT_RACER, DEFAULT_VEHICLE, steerFromKeys } from '../src/core/constants.js';"
assert s.count(imp_old) == 1
s = s.replace(imp_old, "import { PHYS, RACE, VEHICLES, CHAPTERS, ITEMS, racerByKey, DEFAULT_RACER, DEFAULT_VEHICLE, steerFromKeys } from '../src/core/constants.js';")

anchor = "console.log('=== 车手 / 车辆标定 ===');"
assert s.count(anchor) == 1
block = """console.log('=== 八条章节赛道 (每章一条真实赛车场走线) ===');
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

"""
s = s.replace(anchor, block + anchor)
io.open(p, "w", encoding="utf-8").write(s)
print("patched tests")
