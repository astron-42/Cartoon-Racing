// 《卡通竞速》冻结数值表 (frozen 2026-07) —— 所有手感参数集中在此，禁止散落到逻辑里。
// 2026-10 改版: 删掉道具 / 漂移 / 跳跃与车手数值体系; 「车辆」是唯一的车性选择。
// 单位: 距离 m, 时间 s, 速度 m/s, 角度 rad。

export const RACE = Object.freeze({
  racers: 8,          // 1 玩家 + 7 AI
  laps: 3,
  dt: 1 / 60,         // 固定步长仿真
});

// ---------- 车辆 = 唯一的车性选择 (三选一) ----------
// accel 乘在 0→90% 加速时间上(越大越快), grip 乘在转向速率与抓地上(越大越灵),
// spd 乘在极速上, mass 只用于碰撞推挤(三台车差别很小, 不影响手感)。
// 三台车互相咬合: 加速快的转向钝, 转向灵的加速慢, 第三台都不偏科。
export const VEHICLES = Object.freeze({
  rush:    Object.freeze({ key:'rush',    name:'赤羽号', role:'加速型', color:'#E4572E', desc:'起步与出弯最快，转向偏钝，弯前要早刹车。', accel:1.20, grip:0.86, spd:1.02, mass:0.98, bars:{ accel:4, grip:2 } }),
  grip:    Object.freeze({ key:'grip',    name:'青石号', role:'抓地型', color:'#3D6EA8', desc:'抓地最稳，弯里最敢给油，代价是加速慢一拍。', accel:0.86, grip:1.20, spd:0.99, mass:1.04, bars:{ accel:2, grip:4 } }),
  balance: Object.freeze({ key:'balance', name:'纸鸢号', role:'均衡型', color:'#6FA96B', desc:'加速与转向都不偏科，最好上手。', accel:1.00, grip:1.00, spd:1.00, mass:1.00, bars:{ accel:3, grip:3 } }),
});
export const DEFAULT_VEHICLE = 'balance';
export function vehicleByKey(key) { return VEHICLES[key] || VEHICLES[DEFAULT_VEHICLE]; }

// ---------- 车手 = 纯外观 (没有数值) ----------
// 玩家每一场随机抽一位, 七台 AI 分掉剩下七位, 保证 8 台车外观各不相同。
export const RACERS = Object.freeze([
  Object.freeze({ key:'rong',     name:'绒绒',   body:'#D1483F', belly:'#FFF7E6' }),
  Object.freeze({ key:'rougui',   name:'肉桂',   body:'#C4763A', belly:'#FBEFD8' }),
  Object.freeze({ key:'bengping', name:'蹦萍',   body:'#6FA96B', belly:'#F0F7E8' }),
  Object.freeze({ key:'meimei',   name:'煤煤',   body:'#3E3A36', belly:'#C9C0B2' }),
  Object.freeze({ key:'meiqiu',   name:'煤球',   body:'#5A534B', belly:'#D8CFBE' }),
  Object.freeze({ key:'zhizhi',   name:'枝枝',   body:'#8FBF6E', belly:'#F3FAE8' }),
  Object.freeze({ key:'huluobo',  name:'胡萝卜', body:'#E08A2E', belly:'#FFF2DC' }),
  Object.freeze({ key:'momo',     name:'墨墨',   body:'#47679E', belly:'#E6EAF4' }),
]);
export function racerByKey(key) { return RACERS.find(r => r.key === key) || RACERS[0]; }

// ---------- 驾驶物理 ----------
export const PHYS = Object.freeze({
  baseMaxSpeed: 30.0,     // 均衡车的极速
  timeTo90: 3.0,          // 0→90% 极速的基准时间 (再除以所选车辆的加速系数)
  latAccelMax: 9.0,       // 参考走线 (perfectLine) 的弯速基准 m/s2: 弯速 = sqrt(latAccelMax * R);
                          // AI 实际用 AI.cornerLat, 这里只当「保守基准」给测试与无头参考
  accelPeak: 1.30,        // 峰值加速度 = 平均加速度 × 该系数
  reverseMax: 0.25,       // 倒车极速 = 极速 × 该比例
  brakeG: 15.0,           // 刹车减速度基准
  coast: 2.0,             // 松油门自然减速
  steerRate: 1.7,         // 静止满舵角速度基准 rad/s
  steerGripMin: 0.28,     // 极速时的转向保持率 (低速线性回升到 1.0)
  grassSlow: 0.50,        // 草地速度保留基准
  offroadRecover: 0.10,   // 草地惩罚的回收量
  offroadSink: 0.012,     // 草地额外阻力
  grassDecelCap: 0.35,    // 草地最大减速比例
  safePointLateralMax: 0.62, // 复位点横向限制 (半宽比例)
  stuckTime: 3.0,         // 无位移判定卡死时长
  lateralMax: 2.2,        // 超出该横向比例视为掉出纸面 → 复位
  globalResetDist: 36.0,
  offTrackTime: 5.0,      // 连续待在草地上的最长时间, 超过则复位回赛道
});

// ---------- AI ----------
export const AI = Object.freeze({
  // 对手实力: 七台 AI 的车辆数值各自独立随机 (种子驱动, 同种子结果一致 → 测试可复现)。
  // AI 极速 = 基础极速 × spd, 与玩家选了哪台车无关; 每台 AI 的强弱由三组区间决定。
  aiAccel: [1.20, 1.40],  // 加速系数区间
  aiSpd: [1.05, 1.15],    // 极速系数区间
  aiGrip: [1.20, 1.35],   // 抓地系数区间
  aiMass: 1,              // 碰撞质量 (固定)
  cornerLat: 12.5,        // AI 过弯估速用的侧向加速度 m/s2: 弯速 = sqrt(cornerLat × R)。12.5 ≈ 1.27 g
                          // (贴着卡丁车转向模型能兑现的上限, 再高 AI 就转向不足冲出去/频繁复位);
                          // 实测比 1.4 g 的参考走线还快 2.6-6.2%, 见 tools/ai_pace.mjs。
  topKeep: 0.99,          // 直道上 AI 的目标速度 = 自身极速 × 该系数 (留一点余量, 不吃满)
  bobFreq: 0.45,          // 摆动频率 Hz
  speedBob: 12.0,         // 速度摆动幅度 (相对基准, per-mille)
  lineBob: 0.28,          // 走线摆动幅度 (半宽比例)
  lookahead: 12.0,        // 前视距离 m
  cornerLookahead: 42.0,  // 弯道预判距离 (m): 在此区间内取最严限速
  steerGain: 1.35,        // 转向增益
  recoveryMass: 2.0,      // 撞击恢复时间基准
});

// ---------- 赛制: 只有单场比赛 (进游戏直接选章节) ----------

// ---------- 章节 (每章一份独立赛道几何, layout 指向 LAYOUTS 的 key) ----------
// CHAPTERS 是数组, 用这两个函数按 key 取 (历史上多处把它当字典用, 会静默拿到 undefined)
export function chapterKeys() { return CHAPTERS.map(c => c.key); }
export function chapterByKey(key) { return CHAPTERS.find(c => c.key === key) || CHAPTERS[0]; }

export const CHAPTERS = Object.freeze([
  Object.freeze({ key:'ch1', index:1, name:'暖谷环道', line:'春日暖阳，长直道接紧凑中段。', style:'长直道 · 发夹弯', sky:'#9ED6F2', ground:'#C2E089', paper:'#FCF4E0', accent:'#E4572E', flowers:true, layout:'valley', trackName:'暖谷环道' }),
  Object.freeze({ key:'ch2', index:2, name:'落霞湾环道', line:'暖霞落海，螺旋弯接着高速 S 弯。', style:'螺旋弯 · 高速S弯', sky:'#F2A868', ground:'#C6AC74', paper:'#FAEFD8', accent:'#D2542F', flowers:true, layout:'strait', trackName:'落霞湾环道', night:true }),
  Object.freeze({ key:'ch3', index:3, name:'蓝屿环道', line:'海风穿岛，长直道贴着海岸绕回来。', style:'长直道 · 海岸豆形', sky:'#8FD3EE', ground:'#B2DE7E', paper:'#FCF4E2', accent:'#EF7B45', flowers:true, layout:'zhuhai', trackName:'蓝屿环道' }),
  Object.freeze({ key:'ch4', index:4, name:'霓虹街环道', line:'霓虹亮起，直角弯与超长直道。', style:'街道赛 · 超长直道', sky:'#3B3F6E', ground:'#5A4A72', paper:'#F6EDDC', accent:'#FF6B4A', flowers:false, layout:'macau', trackName:'霓虹街环道', night:true }),
  Object.freeze({ key:'ch5', index:5, name:'麦浪平原环道', line:'麦浪晴空，两个回环夹着一条窄走廊。', style:'双回环 · 窄走廊', sky:'#9FD2EE', ground:'#CFDC7C', paper:'#FBF3DC', accent:'#DE5A34', flowers:true, layout:'ningbo', trackName:'麦浪平原环道' }),
  Object.freeze({ key:'ch6', index:6, name:'暖金丘环道', line:'秋日暖金，三条平行路来回折返。', style:'蛇形三腿 · 双发夹', sky:'#EBC98C', ground:'#CDB568', paper:'#FAF0D6', accent:'#C4552F', flowers:false, layout:'tianjin', trackName:'暖金丘环道' }),
  Object.freeze({ key:'ch7', index:7, name:'长风草原环道', line:'草坡暖阳，长直道之后接一个大回环。', style:'长直道 · 大回环', sky:'#A9D8EE', ground:'#C6E08A', paper:'#FCF5E2', accent:'#E0663A', flowers:true, layout:'ordos', trackName:'长风草原环道' }),
  Object.freeze({ key:'ch8', index:8, name:'晨雾峡环道', line:'晨光薄雾，连续S弯收在发夹。', style:'连续S弯 · 发夹', sky:'#C3DCEB', ground:'#B7D78F', paper:'#FBF3DE', accent:'#D9603C', flowers:true, layout:'chengdu', trackName:'晨雾峡环道' }),
]);

export function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return function rng() { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

// 按键 → 转向值 (>0 = 左转, heading 增大; 与 AI 和物理同一约定)
// 单独抽出来是为了让测试能锁住"左右不反"这条约定 (曾经反向过)
// has 可以是「按下的键码 Set」, 也可以是单键谓词 (c => bool)。
// 警告: 不要传 dn(list) 那种检查一组按键的函数 —— 它会把单个键码 KeyA 当字符数组遍历, 永远返回 false。
export function steerFromKeys(leftKeys, rightKeys, has) {
  const hit = (typeof has === 'function') ? has : function (c) { return has.has(c); };
  return (leftKeys.some(hit) ? 1 : 0) - (rightKeys.some(hit) ? 1 : 0);
}
