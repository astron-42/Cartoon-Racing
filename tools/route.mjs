// 走线设计器 (轮廓法): 手绘顶点多边形 + 每顶点内切圆弧 -> 精确闭合的赛道中心线
// 用法: node tools/route.mjs metrics [tag]   |   node tools/route.mjs html [tag]
import { buildPolyline, closeLoop, smoothClosed, Track, TRACK_STEP, buildTrack } from '../src/core/track.js';
import { corners, ascii } from './design.mjs';
import fs from 'node:fs';
const D2R = Math.PI/180, WIDTH = 15.0, MINSTR = 10;

// 顶点 (x 右, z 下); 相邻顶点之间是直道, 顶点处放半径 R 的圆弧 (弧角 = 外角)
// 设计手法: 长主直道 + 成对的 ~90 度折角 (做出 U 型回头) + 深内凹 (做出 S/回廊) + 半径大小悬殊
// R 省略时由 autoR 按转角与边长自动配半径
export const SHAPES = {
  // 第三章 蓝屿环道: 东西向长豆形; 北岸长直道 + 东端钩弯 + 南岸一处深海湾 (深入内陆的长凹)
  ch3: {
    target: 1620, label: '蓝屿环道 · 海岸长豆形',
    V: [[0,0],[520,-15],[700,20],[790,150],[750,300],[620,390],[490,430],[440,240],[300,180],[240,350],[100,415],[-60,340],[-150,190],[-90,50],[-40,15]],
    R: [45,55,45,50,50,45,40,36,34,38,45,50,55,50,45],
  },
  // 第五章 麦浪平原环道: 哑铃形; 中间窄走廊连接两个不等大的环 (西大东小)
  ch5: {
    target: 2050, label: '麦浪平原环道 · 哑铃形',
    V: [[-80,120],[130,120],[300,70],[450,95],[545,185],[480,300],[310,345],[170,340],[130,190],[-80,190],[-300,330],[-480,380],[-590,210],[-480,50],[-280,45]],
    R: [70,60,45,40,50,55,45,35,30,70,60,50,45,55,70],
  },
  // 第六章 暖金丘环道: 蛇形三腿; 三条不等长平行路 + 两个发夹回折 + 西/南长边收口
  ch6: {
    target: 1950, label: '暖金丘环道 · 蛇形三腿',
    V: [[0,-40],[610,-5],[690,110],[240,150],[250,255],[640,300],[660,410],[-80,420],[-120,-30]],
    R: [50,45,40,38,42,40,38,55,60],
  },
  // 第七章 长风草原环道: 按用户 m04313 手绘红线 (shots/user_ch7.png) 转出的走线; 半径自动配
  ch7: {
    target: 2450, label: '长风草原环道 · 用户手绘走线',
    smooth: 1,
    V: [[157,155],[39,156],[31,144],[41,129],[118,86],[134,88],[137,118],[149,118],[177,95],[198,92],[216,105],[261,81],[298,87],[318,102],[323,134],[308,148],[274,138],[217,151],[218,164],[240,164],[258,174],[258,186],[249,190],[229,187],[211,199],[189,197],[169,181],[161,163]],
  },
};

// 逆时针化 + 外角 (转角, 正=左)
function normalize(V0){
  let V = V0.map(p => p.slice());
  const n = V.length;
  const area = (() => { let s=0; for(let i=0;i<n;i++){const a=V[i],b=V[(i+1)%n]; s+=a[0]*b[1]-b[0]*a[1];} return s/2; })();
  const flip = area < 0;
  if (flip) V.reverse();
  const th = [];
  for (let i=0;i<n;i++){ const p=V[(i-1+n)%n], c=V[i], q=V[(i+1)%n];
    const a=[c[0]-p[0],c[1]-p[1]], b=[q[0]-c[0],q[1]-c[1]];
    th.push(Math.atan2(a[0]*b[1]-a[1]*b[0], a[0]*b[0]+a[1]*b[1])); }
  return { V, th, n, flip };
}
// 顶点与邻点加权混合: 消掉手绘抖动, 同时把尖刺稍微放开一点
function relax(V, passes=1, w=0.2){
  let A = V.map(p=>p.slice()); const n = V.length;
  for (let k=0;k<passes;k++){
    A = A.map((p,i)=>{ const q=A[(i-1+n)%n], r=A[(i+1)%n];
      return [p[0]*(1-2*w)+w*(q[0]+r[0]), p[1]*(1-2*w)+w*(q[1]+r[1])]; });
  }
  return A;
}
// 按转角自动配半径, 再迭代收缩直到每条直道还剩 MINSTR 米
export function autoR(V, th){
  const n = V.length;
  const R = th.map(a => { const d = Math.abs(a)*180/Math.PI;
    return d>=110 ? 26 : d>=80 ? 34 : d>=50 ? 46 : 56; });
  const edge = i => Math.hypot(V[(i+1)%n][0]-V[i][0], V[(i+1)%n][1]-V[i][1]);
  for (let it=0; it<300; it++){
    let worst = 0;
    for (let i=0;i<n;i++){
      const j=(i+1)%n;
      const need = R[i]*Math.tan(Math.abs(th[i])/2) + R[j]*Math.tan(Math.abs(th[j])/2);
      const room = edge(i) - MINSTR;
      if (need > room){
        const f = Math.max(0.01, room/need);
        R[i] *= Math.sqrt(f); R[j] *= Math.sqrt(f);
        worst = Math.max(worst, need-room);
      }
    }
    if (worst < 0.01) break;
  }
  return R.map(r=>Math.max(8, r));
}
// 手绘顶点转成「米」: 多边形周长缩放到目标里程 (相似变换, 闭合性不变)
function scaleToPerimeter(V, target){
  let p = 0; for (let i=0;i<V.length;i++){ const a=V[i], b=V[(i+1)%V.length]; p += Math.hypot(b[0]-a[0], b[1]-a[1]); }
  const s = target/p; return V.map(q=>[q[0]*s, q[1]*s]);
}
function fromOutline(V0, R0){
  const { V, th, n, flip } = normalize(V0);
  const R = R0 ? (flip ? R0.slice().reverse() : R0.slice()) : autoR(V, th);
  const segs = [];
  for (let i=0;i<n;i++){ const p=V[i], q=V[(i+1)%n];
    const edge = Math.hypot(q[0]-p[0], q[1]-p[1]);
    const st = edge - R[i]*Math.tan(Math.abs(th[i])/2) - R[(i+1)%n]*Math.tan(Math.abs(th[(i+1)%n])/2);
    if (!(st > 8)) throw new Error('edge '+i+' 直道只剩 '+st.toFixed(1)+' m (边 '+edge.toFixed(0)+' m)');
    segs.push(['s', st]);
    const j = (i + 1) % n;
    if (Math.abs(th[j])>1e-9) segs.push(['a', R[j], th[j]*180/Math.PI]);
  }
  return { segs, R, V };
}

export function build(tag) {
  const S = SHAPES[tag];
  const sp = process.env.SMOOTH ? +process.env.SMOOTH : (S.smooth||0);   // 临时: 用 SMOOTH 环境变量试平滑遍数
  let V0 = sp ? relax(S.V, sp, 0.2) : S.V;
  if (!S.R) V0 = scaleToPerimeter(V0, S.target);   // autoR 的半径按米算, 所以先归一到目标里程
  const { segs, R, V } = fromOutline(V0, S.R);
  const tot = segs.reduce((s,g)=> s + (g[0]==='s'?g[1]:Math.abs(g[2])*D2R*g[1]), 0);
  const k = S.target/tot;
  const segs2 = segs.map(g=> g[0]==='s'?['s',g[1]*k]:['a',g[1]*k,g[2]]);
  const raw = buildPolyline(segs2, TRACK_STEP);
  const ang0 = Math.atan2(V[1][1]-V[0][1], V[1][0]-V[0][0]);      // 手绘多边形第一条边的方向
  const ca = Math.cos(ang0), sa = Math.sin(ang0);
  const pts = smoothClosed(closeLoop(raw), 1, 0.12).map(p=>[p.x*ca - p.z*sa, p.x*sa + p.z*ca]);
  const t = new Track(pts, WIDTH, {dense:true});
  return { t, segs: segs2, seam: Math.hypot(raw[raw.length-1].x-raw[0].x, raw[raw.length-1].z-raw[0].z), k, R, V };
}

function selfCross(t){ const P=t.pts,n=P.length,seg=i=>[P[i],P[(i+1)%n]];
  const s=(p,q,r)=>Math.sign((q.x-p.x)*(r.z-p.z)-(q.z-p.z)*(r.x-p.x));
  const it=(a,b,c,d)=>s(a,b,c)*s(a,b,d)<0&&s(c,d,a)*s(c,d,b)<0; let h=0;
  for(let i=0;i<n;i++)for(let j=i+2;j<n;j++){ if(i===0&&j===n-1)continue; if(it(...seg(i),...seg(j)))h++; } return h; }
function radial(t){ const P=t.pts; let cx=0,cz=0; P.forEach(p=>{cx+=p.x;cz+=p.z;}); cx/=P.length; cz/=P.length;
  const rs=P.map(p=>Math.hypot(p.x-cx,p.z-cz)); const mean=rs.reduce((a,b)=>a+b,0)/rs.length;
  return { max: Math.max(...rs)/mean, min: Math.min(...rs)/mean }; }
export function report(tag, showAscii=true) {
  const { t, seam, k, R } = build(tag);
  const cc = corners(t, 0.0025, 8);
  const pos=cc.cs.filter(x=>x.sweep>0).reduce((a,x)=>a+x.sweep,0), neg=cc.cs.filter(x=>x.sweep<0).reduce((a,x)=>a-x.sweep,0);
  const str = cc.straights.map(s=>s.len), rr = radial(t);
  const line = tag+' len='+t.total.toFixed(0)+' Rmin='+t.minRadius.toFixed(1)+' k='+k.toFixed(3)+' R='+R.map(r=>r.toFixed(0)).join('/')+
    ' 弯='+cc.cs.length+' U='+cc.cs.filter(x=>Math.abs(x.sweep)>=150).length+
    ' 直道'+Math.min(...str).toFixed(0)+'-'+Math.max(...str).toFixed(0)+' 短='+str.filter(v=>v<25).length+
    ' 单向='+(100*Math.max(pos,neg)/(pos+neg)).toFixed(0)+'% 自交='+selfCross(t)+' 闭合='+seam.toFixed(1)+'m 径向='+rr.max.toFixed(2)+'/'+rr.min.toFixed(2);
  console.log(line);
  console.log('  角: '+cc.cs.map(c=>(c.sweep>0?'L':'R')+Math.abs(c.sweep).toFixed(0)).join(' '));
  if (showAscii) console.log(ascii(t, 92, 34));
  return { t, cc, line };
}

// ---- SVG 图纸 ----
function ribbon(t){ const hw=t.halfWidth, P=t.pts, T=t.tan;
  const side=k=>P.map((p,i)=>[p.x+(-T[i].tz)*hw*k, p.z+T[i].tx*hw*k]);
  return side(-1).concat(side(1).reverse()); }
function fit(R, W, H, pad){
  const xs=R.map(p=>p[0]), zs=R.map(p=>p[1]);
  const x0=Math.min(...xs),x1=Math.max(...xs),z0=Math.min(...zs),z1=Math.max(...zs);
  const s=Math.min((W-2*pad)/(x1-x0),(H-2*pad)/(z1-z0));
  const ox=(W-(x1-x0)*s)/2-x0*s, oz=(H-(z1-z0)*s)/2-z0*s;
  return { X:(x,z)=>[x*s+ox,z*s+oz], s };
}
function sub(tag){
  const { t } = build(tag);
  const cc = corners(t, 0.0025, 8);
  const str = cc.straights.map(s=>s.len);
  return t.total.toFixed(0)+' m · '+cc.cs.length+' 个弯 · 最急弯 R'+t.minRadius.toFixed(0)+
    ' · 最长直道 '+Math.max(...str).toFixed(0)+' m · 最短直道 '+Math.min(...str).toFixed(0)+' m';
}
function panel(tag, box){
  const S = SHAPES[tag];
  const { t } = build(tag);
  const R = ribbon(t), P = t.pts, W=box.w, H=box.h;
  const { X, s } = fit(R, W, H, 40);
  const ring = R.map(p=>X(p[0],p[1]));
  const path = 'M'+ring.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join('L')+'Z';
  const p0 = X(P[0].x,P[0].z), tan0 = [t.tan[0].tx, t.tan[0].tz], L0=Math.hypot(tan0[0],tan0[1]);
  const nl = [(-tan0[1]/L0)*t.halfWidth*1.25*s, (tan0[0]/L0)*t.halfWidth*1.25*s];
  const dots = [0,0.25,0.5,0.75].map((f,i)=>{ const kk=Math.floor(f*P.length)%P.length, q=X(P[kk].x,P[kk].z);
    return '<circle cx="'+q[0].toFixed(1)+'" cy="'+q[1].toFixed(1)+'" r="'+(i===0?7:5)+'" fill="'+(i===0?'#c1443a':'#8b8ba0')+'"/>'; }).join('');
  return '<div class="panel"><div class="cap">'+tagName(tag)+' · '+S.label+'</div><div class="meta">'+sub(tag)+'</div><svg viewBox="0 0 '+W+' '+H+'">'+
    '<path d="'+path+'" fill="#efe7d6" stroke="#c9b48c" stroke-width="1.5"/>'+
    '<line x1="'+(p0[0]-nl[0]).toFixed(1)+'" y1="'+(p0[1]-nl[1]).toFixed(1)+'" x2="'+(p0[0]+nl[0]).toFixed(1)+'" y2="'+(p0[1]+nl[1]).toFixed(1)+'" stroke="#3f3a33" stroke-width="3"/>'+
    dots+'</svg></div>';
}
const TAGS = { ch3:'第三章', ch5:'第五章', ch6:'第六章', ch7:'第七章' };
const tagName = t => TAGS[t];
function refPanel(key, name){ const t = buildTrack(key, WIDTH);
  const R = ribbon(t), W=700, H=470;
  const { X } = fit(R, W, H, 40);
  const ring = R.map(p=>X(p[0],p[1]));
  return '<div class="panel ref"><div class="cap">参考 '+name+'</div><svg viewBox="0 0 '+W+' '+H+'"><path d="M'+ring.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join('L')+'Z" fill="#efe7d6" stroke="#c9b48c" stroke-width="1.5"/></svg></div>';
}
if (process.argv[2] === 'metrics') {
  const list = process.argv[3] ? [process.argv[3]] : Object.keys(SHAPES);
  for (const tag of list) { try { report(tag); } catch(e) { console.log(tag+' ERROR '+e.message); } }
  for (const key of ['valley','chengdu']) { const t=buildTrack(key,WIDTH); const rr=radial(t);
    console.log('ref '+key+' len='+t.total.toFixed(0)+' 径向='+rr.max.toFixed(2)+'/'+rr.min.toFixed(2)); console.log(ascii(t,92,34)); }
} else if (process.argv[2] === 'html') {
  const only = process.argv[3];
  const list = only ? [only] : ['ch3','ch5','ch6','ch7'];
  const html = '<html><head><meta charset="utf-8"><style>body{background:#faf7f0;font-family:"Microsoft YaHei",sans-serif;margin:0;padding:24px}'+
    'h1{color:#3f3a33;font-size:24px;margin:0 0 4px}.sub{color:#8a8378;font-size:13px;margin-bottom:16px}'+
    '.grid{display:flex;flex-wrap:wrap;gap:18px}.panel{background:#fffdf8;border:1px solid #ded3bb;border-radius:10px;padding:8px}'+
    '.panel.ref{opacity:.92}.cap{font-size:14px;font-weight:700;color:#3f3a33;padding:4px 6px 0}.meta{font-size:11.5px;color:#8a8378;padding:2px 6px 4px}'+
    'svg{display:block;width:700px;height:470px}</style></head><body><h1>卡通竞速 · 第三/五/六/七章 走线设计稿 (待审核)</h1>'+
    '<div class="sub">红点 = 起跑线, 浅蓝点 = 1/4 圈, 深灰点 = 半圈; 浅色带 = 路面 (宽 15 m)</div><div class="grid">'+
    list.map(t=>panel(t,{w:700,h:470})).join('')+
    (only?'' : refPanel('valley','第一章 暖谷环道')+refPanel('chengdu','第八章 晨雾峡环道'))+
    '</div></body></html>';
  fs.writeFileSync(only? 'shots/route_'+only+'.html' : 'shots/routes.html', html, 'utf8');
  console.log('wrote html');
}
