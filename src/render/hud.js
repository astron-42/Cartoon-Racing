// 卡通竞速 · HUD 与纸页界面
// 排版参照 Kâğıt Kart: 撕纸横幅(眉标+大红标题) + 右侧步骤条 + 底部大卡选项 + 右下键帽提示 + 左上返回方块

// 撕边纸卡 / 锯齿纸票 / 和纸胶带 / 网点纹 —— 纸质 UI 的基础件
function tornClip(seed, amp) {
  const rnd = makeRng(seed);
  const N = 22, a = amp || 1.15, pts = [];
  for (let i = 0; i <= N; i++) pts.push(((i / N) * 100).toFixed(2) + '% ' + ((rnd() - 0.5) * 2 * a).toFixed(2) + '%');
  for (let i = N; i >= 0; i--) pts.push(((i / N) * 100).toFixed(2) + '% ' + (100 + (rnd() - 0.5) * 2 * a).toFixed(2) + '%');
  return 'polygon(' + pts.join(',') + ')';
}

function jagBottom(teeth, depth) {
  const pts = ['0 0', '100% 0'];
  for (let i = teeth; i >= 0; i--) {
    const x = (i / teeth) * 100;
    pts.push(x.toFixed(2) + '% ' + (i % 2 ? 100 : 100 - (depth || 8)) + '%');
  }
  return 'polygon(' + pts.join(',') + ')';
}

const TORN = [tornClip(11, 1.15), tornClip(23, 1.3), tornClip(37, 1.1), tornClip(53, 1.2), tornClip(67, 1.25)];
const JAG = jagBottom(18, 8);
const DOTS = 'radial-gradient(rgba(58,50,38,.10) 1px, transparent 1.15px)';
const PINS = 'repeating-linear-gradient(90deg, rgba(58,50,38,.05) 0 2px, transparent 2px 7px)';

// 剪纸风图标(细墨线 SVG)
const IK = (d, fill) => '<svg viewBox="0 0 48 48"' + (fill ? ' class="f"' : '') + '>' + d + '</svg>';
const ICONS = {
  trophy: IK('<path d="M15 7h18v8a9 9 0 0 1-18 0z"/><path d="M15 10h-5v2.5a5 5 0 0 0 5 5M33 10h5v2.5a5 5 0 0 1-5 5"/><path d="M24 24v7M16.5 39h15M20 31h8v8h-8z"/><path d="M20 5h8"/>'),
  flag: IK('<path d="M13 6v36"/><rect x="13" y="7" width="24" height="17"/><path d="M13 15.5h12M25 7v8.5M25 15.5h12M13 24h12M37 15.5V24"/>', 1),
  clock: IK('<circle cx="24" cy="26" r="14"/><path d="M24 26V15M24 26l7.5 5"/><path d="M19 5h10M24 5v7M36 13l3-3"/>'),
  sheet: IK('<path d="M7 16h34v25H7z"/><path d="M11 11h26M16 6h16"/><path d="M14 23h20M14 29h14"/>'),
  helm: IK('<path d="M9 30a15 15 0 0 1 30 0v7H9z"/><path d="M24 15v15M9 34h30"/><path d="M17 22h14"/>'),
  book: IK('<path d="M6 12h16v26H6zM26 12h16v26H26z"/><path d="M22 12v26"/><path d="M10 18h8M30 18h8M10 24h8M30 24h8"/>'),
  key: IK('<rect x="6" y="16" width="36" height="16" rx="3"/><path d="M14 24h20"/>'),
  route: IK('<path d="M10 13h15a6 6 0 0 1 0 12H16a6 6 0 0 0 0 12h22"/><circle cx="10" cy="13" r="3"/><circle cx="38" cy="37" r="3"/>'),
  ghost: IK('<path d="M12 34V22a12 12 0 0 1 24 0v12l-4-3-4 3-4-3-4 3-4-3z"/><path d="M19 22h2M27 22h2"/>')
};

const HUD_CSS = [
  /* ---------- 比赛 HUD: 四角撕纸卡 ---------- */
  '#hud{position:absolute;left:0;top:0;width:100%;min-width:760px;height:100%;pointer-events:none;z-index:10;font-family:inherit;}',
  '#hud .card{position:absolute;background:var(--paper);color:var(--ink);padding:10px 16px 12px;',
  '  background-image:' + DOTS + ';background-size:6px 6px;filter:drop-shadow(2px 3px 0 rgba(58,50,38,.24));}',
  '#lap{top:16px;right:16px;text-align:right;min-width:168px;clip-path:' + TORN[1] + ';}',
  '#lap .lbl{font-size:11px;letter-spacing:4px;color:var(--ink-soft);font-weight:700;}',
  '#lap .big{font-size:27px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1.15;}',
  '#lap .sub{font-size:11px;color:var(--ink-soft);margin-top:2px;font-variant-numeric:tabular-nums;letter-spacing:1px;}',
  '#rank{bottom:16px;right:16px;text-align:right;padding:6px 16px 10px;clip-path:' + TORN[2] + ';}',
  '#rank .big{font-size:52px;font-weight:800;line-height:.95;letter-spacing:-2px;}',
  '#rank .tot{font-size:19px;font-weight:800;color:var(--ink-soft);margin-left:3px;}',
  '#rank .sub{font-size:10px;color:var(--ink-soft);letter-spacing:3px;margin-top:2px;}',
  '#mapbox{bottom:16px;left:16px;padding:7px;clip-path:' + TORN[3] + ';}',
  '#mapbox canvas{display:block;width:186px;height:172px;}',
  '#mapbox .mapcap{margin-top:5px;text-align:center;font-size:10.5px;font-weight:800;letter-spacing:1.2px;color:var(--ink-soft);white-space:nowrap;}',
  '#center{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;}',
  '#count{font-size:190px;font-weight:800;color:#f8f2e4;-webkit-text-stroke:6px var(--ink);',
  '  text-shadow:9px 10px 0 rgba(58,50,38,.28);opacity:0;transition:opacity .12s;transform:rotate(-2deg);}',
  '#count.on{opacity:1;}',
  '#flash{font-size:38px;font-weight:800;color:#f8f2e4;-webkit-text-stroke:4px var(--ink);',
  '  text-shadow:5px 6px 0 rgba(58,50,38,.28);opacity:0;transition:opacity .35s;transform:rotate(-1.5deg);}',
  '#flash.on{opacity:1;}',
  '#toast{position:absolute;left:50%;top:20%;transform:translateX(-50%) rotate(-1.6deg);font-size:16px;font-weight:800;',
  '  background:var(--paper);color:var(--ink);padding:9px 20px 12px;opacity:0;transition:opacity .3s;letter-spacing:1px;',
  '  background-image:' + DOTS + ';background-size:6px 6px;clip-path:' + jagBottom(16, 10) + ';filter:drop-shadow(2px 3px 0 rgba(58,50,38,.25));}',
  '#toast.on{opacity:1;}',
  /* ---------- 覆盖层 ---------- */
  '.screen{position:absolute;left:0;top:0;width:100%;min-width:760px;height:100%;z-index:20;}',
  '.screen.veil{background:radial-gradient(120% 90% at 50% 30%, rgba(24,20,14,.20), rgba(18,16,12,.50));',
  '  display:flex;align-items:center;justify-content:center;}',
  '.stack{display:flex;flex-direction:column;align-items:center;gap:16px;max-height:94vh;}',
  /* 撕纸横幅 */
  '.banner{position:absolute;left:74px;top:22px;padding:9px 30px 15px 24px;background:var(--paper);transform:rotate(-1.2deg);',
  '  background-image:' + PINS + ',' + DOTS + ';background-size:auto,6px 6px;clip-path:' + TORN[0] + ';',
  '  filter:drop-shadow(3px 5px 0 rgba(30,26,20,.30));}',
  '.banner.flow{position:relative;z-index:3;transform:rotate(-1deg);text-align:center;padding:10px 44px 16px;}',
  '.banner .eyebrow{font-size:11px;letter-spacing:4px;color:#8a6a44;font-weight:800;}',
  '.banner h2{margin:1px 0 0;font-size:42px;letter-spacing:5px;color:var(--accent);',
  '  text-shadow:2px 2px 0 rgba(58,50,38,.16);}',
  '.banner.sm h2{font-size:32px;letter-spacing:4px;}',
  /* 左上返回方块 */
  '.backbtn{position:absolute;left:20px;top:24px;pointer-events:auto;cursor:pointer;width:46px;height:46px;',
  '  background:var(--ink);color:#f8f2e4;border-radius:10px;display:flex;align-items:center;justify-content:center;',
  '  font-size:27px;line-height:1;box-shadow:0 3px 0 rgba(20,16,12,.42);transition:transform .08s,background .12s;}',
  '.backbtn:hover{background:var(--accent);transform:translateY(-1px);}',
  /* 右上纸片小按钮 */
  '.chips{position:absolute;right:22px;top:24px;display:flex;gap:10px;}',
  '.chip{pointer-events:auto;cursor:pointer;background:var(--paper);padding:10px 17px 13px;font-size:13px;font-weight:800;',
  '  letter-spacing:1px;display:flex;align-items:center;gap:7px;clip-path:' + JAG + ';',
  '  filter:drop-shadow(2px 3px 0 rgba(30,26,20,.24));transition:transform .08s;}',
  '.chip:hover{transform:translateY(-1px);background:#fffdf6;}',
  '.chip svg{width:17px;height:17px;stroke:var(--ink);fill:none;stroke-width:3.4;stroke-linecap:round;stroke-linejoin:round;}',
  /* 右侧步骤条 */
  '.steps{position:absolute;right:0;top:104px;display:flex;flex-direction:column;gap:9px;align-items:flex-end;}',
  '.step{pointer-events:auto;cursor:pointer;display:flex;align-items:center;gap:11px;background:var(--paper);',
  '  padding:10px 20px 12px 11px;min-width:142px;font-size:15px;font-weight:800;letter-spacing:2px;opacity:.62;',
  '  clip-path:' + JAG + ';filter:drop-shadow(2px 3px 0 rgba(30,26,20,.22));transition:opacity .12s,transform .08s;}',
  '.step i{font-style:normal;width:24px;height:24px;border-radius:4px;background:rgba(58,50,38,.16);',
  '  display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;}',
  '.step.on{opacity:1;box-shadow:inset 5px 0 0 var(--accent);}',
  '.step.on i{background:var(--accent);color:#fff6ec;}',
  '.step:hover{opacity:1;transform:translateX(-3px);}',
  '.step.done i{background:rgba(58,50,38,.75);color:#f8f2e4;}',
  /* 底部大卡 */
  '.cards{position:absolute;left:50%;transform:translateX(-50%);bottom:66px;display:flex;gap:20px;align-items:stretch;}',
  /* 章节选择: 左侧详情卡 + 右侧 8 张章节卡 (4x2, 一屏看全) */
  '.chapview{position:absolute;left:0;right:0;bottom:62px;display:flex;justify-content:center;align-items:flex-end;gap:16px;}',
  '.chapgrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;width:min(60%,660px);}',
  '.chapgrid .opt{width:auto;padding:10px 12px 11px;}',
  '.chapgrid .opt .ico{height:52px;}',
  '.chapgrid .opt .ico svg{width:50px;height:50px;stroke-width:2.6;}',
  '.chapgrid .opt .ttl{font-size:16px;letter-spacing:1px;margin-top:2px;}',
  '.chapgrid .opt .dsc{display:none;}',
  '.chapgrid .opt .tags{margin-top:6px;}',
  '.opt{pointer-events:auto;cursor:pointer;position:relative;width:268px;background:var(--paper);padding:18px 20px 16px;',
  '  background-image:' + DOTS + ';background-size:6px 6px;clip-path:' + TORN[4] + ';',
  '  filter:drop-shadow(3px 5px 0 rgba(30,26,20,.28));transition:transform .09s;}',
  '.opt:hover{transform:translateY(-4px);}',
  '.opt.on{filter:drop-shadow(3px 8px 0 rgba(30,26,20,.34));}',
  '.opt .rb{display:none;position:absolute;right:16px;top:-4px;width:26px;height:46px;background:var(--accent);',
  '  clip-path:polygon(0 0,100% 0,100% 100%,50% 76%,0 100%);}',
  '.opt.on .rb{display:block;}',
  '.opt .ico{height:64px;display:flex;align-items:center;justify-content:center;}',
  '.opt .ico svg{width:60px;height:60px;stroke:var(--ink);fill:none;stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round;}',
  '.opt .ico svg.f path{fill:var(--ink);}',
  '.opt .ttl{font-size:21px;font-weight:800;letter-spacing:2px;margin-top:6px;}',
  '.opt .dsc{font-size:12px;color:var(--ink-soft);line-height:1.6;margin-top:8px;min-height:52px;}',
  '.opt .tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;}',
  '.opt .tags span{font-size:10px;font-weight:800;letter-spacing:1px;border:1.5px solid rgba(58,50,38,.5);',
  '  border-radius:3px;padding:2px 7px 3px;}',
  '.opt.off{opacity:.5;}',
  '.opt.off .dsc{color:#9c8b74;}',
  '.opt .dsc b{color:var(--ink);}',
  /* 章节详情卡(含小地图) */
  '.detail{pointer-events:none;width:300px;background:var(--paper);padding:16px 18px 14px;background-image:' + DOTS + ';',
  '  background-size:6px 6px;clip-path:' + TORN[4] + ';filter:drop-shadow(3px 5px 0 rgba(30,26,20,.28));}',
  '.detail .eyebrow{font-size:10px;letter-spacing:4px;color:#8a6a44;font-weight:800;}',
  '.detail .dttl{font-size:26px;font-weight:800;letter-spacing:3px;color:var(--accent);margin-top:2px;}',
  '.detail .dsc{font-size:12px;color:var(--ink-soft);line-height:1.6;margin-top:6px;}',
  '.detail canvas{display:block;margin-top:8px;width:264px;height:118px;}',
  /* 车手卡 */
  '.dpicks{position:absolute;left:50%;transform:translateX(-50%);bottom:64px;display:grid;',
  '  grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;width:min(92%,1000px);}',
  '.dpick{pointer-events:auto;cursor:pointer;position:relative;background:var(--paper);padding:10px 13px 11px;',
  '  background-image:' + DOTS + ';background-size:6px 6px;clip-path:' + jagBottom(20, 7) + ';',
  '  filter:drop-shadow(2px 3px 0 rgba(30,26,20,.24));transition:transform .08s;}',
  '.dpick:hover{transform:translateY(-3px);}',
  '.dpick.on{background:#fff6e1;box-shadow:inset 0 0 0 3px var(--accent);}',
  '.dpick .nm{font-weight:800;font-size:16px;letter-spacing:1px;display:flex;justify-content:space-between;align-items:center;}',
  '.dpick .sw{width:15px;height:15px;border:2px solid var(--ink);border-radius:50%;}',
  '.dpick .st{font-size:10px;color:var(--ink-soft);margin-top:6px;line-height:1.65;}',
  '.bars{display:inline-flex;gap:2px;vertical-align:middle;}',
  '.bars i{display:inline-block;width:7px;height:9px;border:1px solid var(--ink-soft);background:#fff;}',
  '.bars i.f{background:var(--ink);}',
  /* 右下键帽提示 */
  '.hints{position:absolute;right:22px;bottom:20px;display:flex;gap:16px;align-items:center;',
  '  font-size:13px;font-weight:800;color:#4a4030;text-shadow:0 1px 0 rgba(255,253,246,.75);}',
  '.kb{display:inline-block;background:var(--ink);color:#f8f2e4;border-radius:6px;padding:3px 10px 5px;',
  '  font-size:12px;font-weight:800;box-shadow:0 2px 0 rgba(20,16,12,.45);margin-right:7px;letter-spacing:.5px;}',
  '.kb.gh{background:var(--paper);color:var(--ink);box-shadow:inset 0 0 0 2px var(--ink);}',
  /* 封面底部纸签 */
  '.tagbar{position:absolute;left:50%;transform:translateX(-50%) rotate(-1deg);bottom:30px;pointer-events:auto;',
  '  cursor:pointer;display:flex;align-items:center;gap:20px;background:var(--paper);padding:13px 22px 17px;',
  '  background-image:' + DOTS + ';background-size:6px 6px;clip-path:' + TORN[2] + ';',
  '  filter:drop-shadow(3px 5px 0 rgba(30,26,20,.32));transition:transform .09s;}',
  '.tagbar:hover{transform:translateX(-50%) rotate(-1deg) translateY(-3px);}',
  '.tagbar span.t{font-size:16px;font-weight:800;letter-spacing:2px;}',
  /* 纸页(结算 / 暂停 / 纪录 / 说明) */
  '.sheet{background:var(--paper);color:var(--ink);max-width:1000px;width:min(92%,1000px);max-height:80vh;overflow:auto;',
  '  padding:26px 34px 22px;position:relative;background-image:' + DOTS + ';background-size:7px 7px;',
  '  clip-path:' + TORN[3] + ';filter:drop-shadow(6px 8px 0 rgba(20,16,12,.30));}',
  '.sheet h2{margin:0 0 12px;font-size:30px;letter-spacing:4px;padding-bottom:8px;border-bottom:2px dashed rgba(58,50,38,.35);}',
  '.sheet .tag{color:var(--ink-soft);font-size:13px;line-height:1.7;margin-bottom:14px;}',
  '.sheet .note{font-size:12px;color:var(--ink-soft);margin-top:12px;line-height:1.7;}',
  '.keys{display:grid;grid-template-columns:repeat(2,1fr);gap:7px 24px;font-size:13.5px;}',
  '.keys .kb{min-width:86px;text-align:center;}',
  '.btns{display:flex;gap:11px;margin-top:20px;flex-wrap:wrap;}',
  '.btn{pointer-events:auto;cursor:pointer;display:inline-flex;align-items:center;background:var(--ink);color:#f8f2e4;',
  '  padding:12px 26px 15px;font-size:15px;font-weight:800;letter-spacing:2px;clip-path:' + JAG + ';',
  '  filter:drop-shadow(2px 3px 0 rgba(30,26,20,.28));transition:background .12s,transform .08s;}',
  '.btn:hover{background:var(--accent);transform:translateY(-1px);}',
  '.btn.ghost{background:#fffdf6;color:var(--ink);box-shadow:inset 0 0 0 2px var(--ink);}',
  '.btn.ghost:hover{background:#ffeccf;}',
  '.tbl{width:100%;border-collapse:collapse;font-size:14.5px;font-variant-numeric:tabular-nums;}',
  '.tbl th,.tbl td{border-bottom:1.5px dashed rgba(58,50,38,.28);padding:7px 9px;text-align:left;}',
  '.tbl th{font-size:11px;letter-spacing:2px;color:var(--ink-soft);}',
  '.tbl tr.me{background:#fff3d8;font-weight:800;}',
  '.stamp{display:inline-block;border:2.5px solid var(--accent);color:var(--accent);border-radius:4px;padding:1px 9px 3px;',
  '  transform:rotate(-6deg);font-weight:800;letter-spacing:2px;font-size:12px;}'
].join('');

function fmtTime(t) {
  if (t === null || t === undefined || !isFinite(t)) return '--:--.--';
  const m = Math.floor(t / 60);
  const s = Math.floor(t - m * 60);
  const cs = Math.floor((t - m * 60 - s) * 100);
  return m + ':' + String(s).padStart(2, '0') + '.' + String(cs).padStart(2, '0');
}

function statBars(v, max) {
  let out = '';
  for (let i = 0; i < (max || 5); i++) out += '<i class="' + (i < v ? 'f' : '') + '"></i>';
  return out;
}

// 把图标染成指定颜色: 车辆卡用自己车身的颜色 (CSS 里的 stroke 会被行内样式覆盖)
function tint(svg, color) { return svg.replace('<svg ', '<svg style="stroke:' + color + '" '); }

// 章节卡图标 / 详情卡小地图 / 局内小地图 共用同一套点: 都是 buildTrack 后的中心线采样,
// 保证「卡片上画的形状」与「比赛里跑的形状」完全一致, 不会出现某章画成别章的路线。
const ROUTE_PTS = {}, ROUTE_LEN = {};
function routePoints(layout) {
  const key = layout || 'valley';
  if (ROUTE_PTS[key]) return ROUTE_PTS[key];
  let pts = [];
  try {
    const t = buildTrack(key);
    const N = 72;
    for (let i = 0; i < N; i++) pts.push(t.sample(t.total * i / N));
  } catch (e) { pts = []; }
  if (!pts.length && typeof layoutPoints === 'function') pts = layoutPoints(key);
  ROUTE_PTS[key] = pts;
  return pts;
}
function routeLen(layout) {
  const key = layout || 'valley';
  if (ROUTE_LEN[key] == null) {
    let v = 0;
    try { v = buildTrack(key).total; } catch (e) { v = 0; }
    if (!v) {
      const p = routePoints(key);
      for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; v += Math.hypot(b.x - a.x, b.z - a.z); }
    }
    ROUTE_LEN[key] = v;
  }
  return ROUTE_LEN[key];
}

// 章节卡图标 = 这条赛道自己的路线图
function routeIcon(layout) {
  const pts = routePoints(layout);
  if (!pts.length) return ICONS.route;
  let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
  for (const p of pts) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
  }
  const k = 34 / Math.max(maxX - minX || 1, maxZ - minZ || 1);
  const ox = 7 + (34 - (maxX - minX) * k) / 2, oz = 7 + (34 - (maxZ - minZ) * k) / 2;
  const xy = p => (ox + (p.x - minX) * k).toFixed(1) + ',' + (oz + (p.z - minZ) * k).toFixed(1);
  const s = xy(pts[0]).split(',');
  return IK('<polygon points="' + pts.map(xy).join(' ') + '"/>' +
    '<circle cx="' + s[0] + '" cy="' + s[1] + '" r="2.6" style="fill:var(--accent);stroke:none"/>')
    .replace('<svg ', '<svg style="stroke-width:2.2" ');
}

const STEP_NAMES = ['章节', '车辆'];
const STEP_TITLES = ['选赛道章节', '选车辆'];

class Hud {
  constructor(root, opts) {
    this.opts = opts || {};
    this.track = this.opts.track;
    this.handler = this.opts.onAction || function () {};
    this.sel = this.opts.sel || {};
    this.progress = this.opts.progress || {};
    const style = document.createElement('style');
    style.textContent = HUD_CSS;
    document.head.appendChild(style);

    const el = document.createElement('div');
    el.id = 'hud';
    el.innerHTML = [
      '<div class="card" id="lap"><div class="lbl" id="lapLbl">第 1/3 圈</div>',
      '  <div class="big" id="timeVal">0:00.00</div><div class="sub" id="bestVal">最佳 --:--.--</div></div>',
      '<div class="card" id="rank"><div class="big"><span id="rankVal">1</span><span class="tot" id="rankTot">/8</span></div>',
      '  <div class="sub">名次</div></div>',
      '<div class="card" id="mapbox"><canvas id="map" width="372" height="344"></canvas>',
      '  <div class="mapcap" id="mapCap"></div></div>',
      '<div id="center"><div id="count"></div><div id="flash"></div></div>',
      '<div id="toast"></div>'
    ].join('');
    root.appendChild(el);
    this.el = el;
    this.screens = document.createElement('div');
    root.appendChild(this.screens);
    this.ctx = el.querySelector('#map').getContext('2d');
    this.mapPts = this.buildMap();
    el.addEventListener('click', e => {
      const t = e.target.closest('[data-act]');
      if (!t) return;
      this.handler(t.getAttribute('data-act'), t.getAttribute('data-val'));
    });
    this.screens.addEventListener('click', e => {
      const t = e.target.closest('[data-act]');
      if (!t) return;
      if (t.classList.contains('off')) return;
      this.handler(t.getAttribute('data-act'), t.getAttribute('data-val'));
    });
    this.flashT = 0;
  }

  // 换章换赛道: 小地图按新几何重画
  setTrack(track) { this.track = track; this.mapPts = this.buildMap(); }

  // 小地图卡片上的章节名: 让人一眼看出这张图属于哪一章
  setMapLabel(text) {
    const c = this.el.querySelector('#mapCap');
    if (c) c.textContent = text || '';
  }

  // 小地图: 把赛道缩放到画布
  buildMap() {
    const pts = [];
    const N = 90;
    let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    for (let i = 0; i <= N; i++) {
      const p = this.track.sample(this.track.total * i / N);
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
      pts.push(p);
    }
    const pad = 30;
    const W = 372, H = 344;
    const sx = (W - pad * 2) / (maxX - minX), sz = (H - pad * 2) / (maxZ - minZ);
    const k = Math.min(sx, sz);
    const ox = pad + ((W - pad * 2) - (maxX - minX) * k) / 2;
    const oz = pad + ((H - pad * 2) - (maxZ - minZ) * k) / 2;
    let sig = 0;
    for (const p of pts) sig += Math.abs(p.x) + Math.abs(p.z);
    return { pts: pts, k: k, ox: ox, oz: oz, minX: minX, minZ: minZ, total: this.track.total, sig: Math.round(sig * 10) };
  }

  project(x, z) {
    const m = this.mapPts;
    return { x: m.ox + (x - m.minX) * m.k, y: m.oz + (z - m.minZ) * m.k };
  }

  drawMap(world, player) {
    const g = this.ctx;
    const W = 372, H = 344;
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,253,246,.72)';
    g.fillRect(0, 0, W, H);
    const m = this.mapPts;
    const path = () => {
      g.beginPath();
      m.pts.forEach((p, i) => { const q = this.project(p.x, p.z); if (i === 0) g.moveTo(q.x, q.y); else g.lineTo(q.x, q.y); });
      g.closePath();
    };
    path();
    g.lineWidth = 30; g.strokeStyle = 'rgba(201,187,160,.55)'; g.stroke();
    path();
    g.lineWidth = 11; g.strokeStyle = '#f7f1e3'; g.stroke();
    path();
    g.lineWidth = 1.8; g.strokeStyle = '#3a3226'; g.stroke();
    // 起点线(红)
    const sp = this.track.sample(0);
    const q0 = this.project(sp.x, sp.z);
    const q1 = this.project(sp.x + sp.nx * this.track.halfWidth, sp.z + sp.nz * this.track.halfWidth);
    g.beginPath(); g.moveTo(q0.x, q0.y); g.lineTo(q1.x, q1.y);
    g.lineWidth = 3.5; g.strokeStyle = '#c8553d'; g.stroke();
    // 车手点
    const karts = (world && world.karts) || [];
    for (const k of karts) {
      const q = this.project(k.x, k.z);
      g.beginPath();
      g.arc(q.x, q.y, k.isPlayer ? 9 : 6, 0, Math.PI * 2);
      g.fillStyle = k.isPlayer ? '#c8553d' : (k.racer && k.racer.body) || '#3a3226';
      g.fill();
      g.lineWidth = k.isPlayer ? 3.5 : 2;
      g.strokeStyle = '#3a3226';
      g.stroke();
    }
  }

  update(world, player) {
    if (!world || !player) return;
    this.el.querySelector('#lapLbl').textContent = '第 ' + Math.min(world.laps, player.laps + 1) + '/' + world.laps + ' 圈';
    this.el.querySelector('#timeVal').textContent = fmtTime(world.time);
    this.el.querySelector('#bestVal').textContent = '最佳 ' + fmtTime(player.bestLap);
    this.el.querySelector('#rankVal').textContent = String(player.rank);
    this.el.querySelector('#rankTot').textContent = '/' + world.karts.length;
    this.drawMap(world, player);
  }

  countdown(text) {
    const c = this.el.querySelector('#count');
    if (!text) { c.classList.remove('on'); return; }
    c.textContent = text;
    c.classList.add('on');
  }

  flash(text, ms) {
    const f = this.el.querySelector('#flash');
    f.textContent = text;
    f.classList.add('on');
    clearTimeout(this.flashT);
    this.flashT = setTimeout(() => f.classList.remove('on'), ms || 1600);
  }

  toast(text, ms) {
    const f = this.el.querySelector('#toast');
    f.textContent = text;
    f.classList.add('on');
    clearTimeout(this.toastT);
    this.toastT = setTimeout(() => f.classList.remove('on'), ms || 1800);
  }

  setRaceHudVisible(v) {
    for (const id of ['#lap', '#rank', '#mapbox']) {
      this.el.querySelector(id).style.display = v ? '' : 'none';
    }
  }

  // ---------- 排版组件 ----------
  topHtml(crumb, title, withBack, chips) {
    let h = '';
    if (withBack) h += '<div class="backbtn" data-act="prevstep">‹</div>';
    h += '<div class="banner' + (title.length > 6 ? ' sm' : '') + '"><div class="eyebrow">' + crumb + '</div><h2>' + title + '</h2></div>';
    h += '<div class="chips">' + (chips || []).map(c =>
      '<div class="chip" data-act="' + c.act + '">' + (c.icon ? ICONS[c.icon] : '') + c.label + '</div>').join('') + '</div>';
    return h;
  }

  stepsHtml(step) {
    return '<div class="steps">' + STEP_NAMES.map((n, i) => {
      const k = i + 1;
      const cls = k === step ? 'on' : (k < step ? 'done' : '');
      return '<div class="step ' + cls + '" data-act="step" data-val="' + k + '"><i>' + k + '</i>' + n + '</div>';
    }).join('') + '</div>';
  }

  hintsHtml(list) {
    return '<div class="hints">' + list.map(x =>
      '<span><span class="kb' + (x[2] ? ' gh' : '') + '">' + x[0] + '</span>' + x[1] + '</span>').join('') + '</div>';
  }

  cardHtml(o) {
    return '<div class="opt ' + (o.on ? 'on ' : '') + (o.off ? 'off ' : '') + '" data-act="' + o.act + '" data-val="' + o.val + '">' +
      '<div class="rb"></div>' +
      '<div class="ico">' + (o.svg || ICONS[o.icon] || '') + '</div>' +
      '<div class="ttl">' + o.title + '</div>' +
      '<div class="dsc">' + o.desc + '</div>' +
      '<div class="tags">' + (o.tags || []).map(t => '<span>' + t + '</span>').join('') + '</div>' +
      '</div>';
  }

  // 章节详情卡: 眉标 + 章节名 + 赛道名 + 手绘小地图
  detailHtml(data) {
    const ch = chapterByKey(data.chapter);
    const len = routeLen(ch.layout || 'valley');
    const km = len > 0 ? (Math.round(len / 10) / 100).toFixed(2) + ' km' : '';
    return '<div class="detail">' +
      '<div class="eyebrow">第 ' + (ch.index || 1) + ' 章</div>' +
      '<div class="dttl">' + ch.name + '</div>' +
      '<div class="dsc">' + (ch.line || '') + '<br>' + (ch.trackName || '') + (km ? ' · 约 ' + km : '') + '</div>' +
      '<canvas id="chapmap" width="528" height="236"></canvas>' +
      '</div>';
  }

  chapterMap() {
    const c = this.screens.querySelector('#chapmap');
    if (!c) return;
    const ch = chapterByKey((this.lastSel || {}).chapter || 'ch1');
    const pts = routePoints(ch.layout || 'valley');
    if (!pts.length) return;
    const g = c.getContext('2d');
    const W = c.width, H = c.height, pad = 18;
    let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    for (const p of pts) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
    }
    const k = Math.min((W - pad * 2) / (maxX - minX || 1), (H - pad * 2) / (maxZ - minZ || 1));
    const ox = pad + ((W - pad * 2) - (maxX - minX) * k) / 2;
    const oz = pad + ((H - pad * 2) - (maxZ - minZ) * k) / 2;
    const q = p => ({ x: ox + (p.x - minX) * k, y: oz + (p.z - minZ) * k });
    const path = () => {
      g.beginPath();
      pts.forEach((p, i) => { const a = q(p); if (i === 0) g.moveTo(a.x, a.y); else g.lineTo(a.x, a.y); });
      g.closePath();
    };
    g.clearRect(0, 0, W, H);
    path(); g.lineWidth = 26; g.strokeStyle = 'rgba(201,187,160,.5)'; g.stroke();
    path(); g.lineWidth = 9; g.strokeStyle = '#f7f1e3'; g.stroke();
    path(); g.lineWidth = 2.4; g.strokeStyle = '#3a3226'; g.stroke();
    const s = q(pts[0]);
    g.beginPath(); g.arc(s.x, s.y, 7, 0, Math.PI * 2); g.fillStyle = '#c8553d'; g.fill();
    g.lineWidth = 2.4; g.strokeStyle = '#3a3226'; g.stroke();
  }

  screen(name, data) {
    data = data || {};
    this.lastSel = data;
    if (!name) { this.screens.innerHTML = ''; return; }
    const chips = [
      { act: 'records', icon: 'clock', label: '本地纪录' },
      { act: 'help', icon: 'key', label: '操作说明' }
    ];
    let html = '';
    if (name === 'select') {
      const step = Math.min(2, Math.max(1, data.step || 1));
      let body = '';
      if (step === 1) {
        body = '<div class="chapview"><div class="chapgrid">' + CHAPTERS.map(c => {
          return this.cardHtml({
            act: 'chapter', val: c.key, on: c.key === data.chapter,
            svg: routeIcon(c.layout),   // 八章各自一张路线图, 不再共用同一个图标
            title: c.name,
            desc: c.line || '',
            tags: [c.trackName || '', '三圈决胜']
          });
        }).join('') + '</div>' + this.detailHtml(data) + '</div>';
      } else {
        body = '<div class="cards">' + Object.keys(VEHICLES).map(k => {
          const v = VEHICLES[k];
          return this.cardHtml({
            act: 'vehicle', val: k, on: k === data.vehicle,
            svg: tint(ICONS.helm, v.color),   // 图标就是这台车的车身色
            icon: 'helm',
            title: v.name,
            desc: v.desc,
            tags: [v.role, '加速 <span class="bars">' + statBars(v.bars.accel) + '</span>', '抓地 <span class="bars">' + statBars(v.bars.grip) + '</span>']
          });
        }).join('') + '</div>';
      }
      const hints = [['← →', '切换'], ['Enter', step === 2 ? '出发' : '下一步'], ['Esc', '上一步']];
      html = '<div class="screen">' + this.topHtml('卡通竞速 · 步骤 ' + step + '/2 · ' + STEP_NAMES[step - 1], STEP_TITLES[step - 1], true, chips) +
        this.stepsHtml(step) + body + this.hintsHtml(hints) + '</div>';
    } else if (name === 'intro') {
      html = '<div class="screen veil">' +
        '<div style="background:var(--paper);color:var(--ink);padding:24px 52px 26px;text-align:center;position:relative;' +
        'background-image:' + DOTS + ';background-size:7px 7px;clip-path:' + TORN[0] + ';filter:drop-shadow(8px 10px 0 rgba(20,14,8,.32))">' +
        '<div style="font-size:11px;letter-spacing:6px;color:#8a6a44;font-weight:800">第 ' + (data.index || 1) + ' 章 · ' + (data.trackName || '') + '</div>' +
        '<div style="font-size:58px;font-weight:800;letter-spacing:9px;margin:6px 0 8px;color:var(--accent);text-shadow:3px 4px 0 rgba(58,50,38,.18)">' + (data.name || '') + '</div>' +
        '<div style="font-size:14px;color:var(--ink-soft);letter-spacing:1px">' + (data.desc || '') + '</div>' +
        '<div style="margin-top:16px;font-size:13px;letter-spacing:2px;font-weight:800">' + (data.vehicleLabel || '') + ' · 3 圈</div>' +
        '</div></div>';
    } else if (name === 'help') {
      html = '<div class="screen veil"><div class="stack">' +
        '<div class="banner flow"><div class="eyebrow">卡通竞速 · 键盘操作</div><h2>操作说明</h2></div>' +
        '<div class="sheet"><h2>按键与规则</h2>' +
        '<div class="keys">' + this.keysHtml() + '</div>' +
        '<div class="note">名次按已完成圈数降序、再按沿赛道行进距离降序排列；完赛后名次锁定。<br>' +
        '驶出纸带即为草地，明显减速；冲出纸页边缘、翻车或卡死会自动复位到最近安全点，圈数与计时不重置，但会罚一点速度。</div>' +
        '<div class="btns"><div class="btn" data-act="back">返回</div></div></div></div>' +
        this.hintsHtml([['Enter', '返回'], ['Esc', '返回']]) + '</div>';
    } else if (name === 'pause') {
      html = '<div class="screen veil"><div class="stack">' +
        '<div class="banner flow"><div class="eyebrow">比赛暂停 · 计时停止</div><h2>暂停</h2></div>' +
        '<div class="sheet"><h2>按键与设置</h2>' +
        '<div class="keys">' + this.keysHtml() + '</div>' +
        '<div class="btns"><div class="btn" data-act="resume">继续比赛</div>' +
        '<div class="btn ghost" data-act="again">重开本场</div>' +
        '<div class="btn ghost" data-act="mute">声音：' + (data.muted ? '关' : '开') + '</div>' +
        '<div class="btn ghost" data-act="chapters">返回选章节</div></div></div></div>' +
        this.hintsHtml([['Enter', '继续'], ['Esc', '继续']]) + '</div>';
    } else if (name === 'records') {
      const wkeys = Object.keys(VEHICLES);
      const cleared = this.progress.cleared || {};
      html = '<div class="screen veil"><div class="stack">' +
        '<div class="banner flow"><div class="eyebrow">存在这台浏览器里 · 数字为最佳单圈</div><h2>本地纪录</h2></div>' +
        '<div class="sheet"><table class="tbl"><tr><th>章节</th>' + wkeys.map(k => '<th>' + VEHICLES[k].name + '</th>').join('') + '</tr>' +
        CHAPTERS.map(c => '<tr><td>' + c.name + (cleared[c.key] ? ' <span style="color:#7b6b54">已通关</span>' : '') + '</td>' +
          wkeys.map(k => {
            const v = this.progress['best_' + k + '_' + c.key];
            return '<td>' + (typeof v === 'number' ? fmtTime(v) : '—') + '</td>';
          }).join('') + '</tr>').join('') +
        '</table>' +
        '<div class="note">三台车的纪录分开记录；同一条赛道换车再跑，圈速会更不一样。</div>' +
        '<div class="btns"><div class="btn" data-act="back">返回</div></div></div></div>' +
        this.hintsHtml([['Enter', '返回'], ['Esc', '返回']]) + '</div>';
    } else if (name === 'results') {
      const rows = data.rows || [];
      html = '<div class="screen veil"><div class="stack">' +
        '<div class="banner flow"><div class="eyebrow">' + (data.chapterName || '') + ' · ' + (data.vehicleLabel || '') + ' · ' + (data.laps || 3) + ' 圈' +
        (data.newRecord ? ' <span class="stamp">刷新记录</span>' : '') + '</div><h2>' +
        (data.rank === 1 ? '冠军！' : '比赛结算') + '</h2></div>' +
        '<div class="sheet">' +
        '<table class="tbl"><tr><th>名次</th><th>车手</th><th>总时间</th><th>最佳单圈</th><th>圈数</th></tr>' +
        rows.map(r => '<tr class="' + (r.me ? 'me' : '') + '"><td>' + r.rank + '</td><td>' + r.name + '</td><td>' +
          (r.finished ? fmtTime(r.time) : '未完赛') + '</td><td>' + fmtTime(r.bestLap) + '</td><td>' + r.laps + '</td></tr>').join('') +
        '</table>' +
        '<div class="btns"><div class="btn" data-act="again">重开本场</div>' +
        (data.hasNext ? '<div class="btn" data-act="next">下一章</div>' : '') +
        '<div class="btn ghost" data-act="select">换辆车</div>' +
        '<div class="btn ghost" data-act="chapters">返回选章节</div></div></div></div>' +
        this.hintsHtml([['Enter', '重开本场'], ['Esc', '返回选章节']]) + '</div>';
    }
    this.screens.innerHTML = html;
    if (name === 'select' && (data.step || 1) === 1) this.chapterMap();
  }

  keysHtml() {
    return [
      '<div><span class="kb">← → / A D</span>转向</div>',
      '<div><span class="kb">↑ / W</span>加速</div>',
      '<div><span class="kb">↓ / S</span>刹车 · 倒车</div>',
      '<div><span class="kb">Esc / P</span>暂停</div>',
      '<div><span class="kb">R</span>重新开始本场</div>',
      '<div><span class="kb">M</span>静音开关</div>',
      '<div><span class="kb">Enter</span>确认 · <span class="kb">Esc</span>返回</div>'
    ].join('');
  }
}

