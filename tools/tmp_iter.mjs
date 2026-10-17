
import { buildPolyline, closeLoop, smoothClosed, Track, TRACK_STEP, buildTrack } from '../src/core/track.js';
import { corners, ascii } from './design.mjs';
const D2R = Math.PI/180, WIDTH = 15.0;

// 手绘轮廓 (x 右, z 下); fromOutline: 顶点放圆弧(半径 R[i]) + 直道精确闭合
// 设计意图: 长直道 + 尖刺发夹 (尖刺 = 三个近邻顶点, 中间半径 2.5 倍) + 内凹 S + 折得起的回廊
export const V = {
  ch3: [[0,0],[260,-20],[430,0],[510,140],[430,270],[250,215],[150,255],[40,190],[-40,255],[-95,130],[-40,20]],
  ch5: [[0,0],[300,0],[520,60],[560,220],[430,260],[330,215],[240,255],[150,205],[60,250],[-60,200],[-70,60]],
  ch6: [[0,0],[200,0],[330,60],[250,150],[360,190],[290,300],[150,270],[60,330],[-70,280],[-90,120],[-30,20]],
  ch7: [[0,0],[420,-30],[620,-20],[700,150],[560,230],[380,215],[300,150],[330,60],[230,20],[60,90],[-60,60]],
};
export const RR = {
  ch3: [55,70,45,40,60,34,30,40,28,45,50],
  ch5: [120,90,70,80,60,50,45,55,50,70,90],
  ch6: [40,36,32,30,34,30,28,34,30,36,40],
  ch7: [80,70,60,50,45,40,38,42,45,60,70],
};

function fromOutline(V0, R) {
  let Vv = V0.map(p => p.slice());
  const n = Vv.length, th = [];
  const area = (() => { let s=0; for(let i=0;i<n;i++){const a=Vv[i],b=Vv[(i+1)%n]; s+=a[0]*b[1]-b[0]*a[1];} return s/2; })();
  if (area < 0) Vv.reverse();
  for (let i=0;i<n;i++){ const p=Vv[(i-1+n)%n], c=Vv[i], q=Vv[(i+1)%n];
    const a=[c[0]-p[0],c[1]-p[1]], b=[q[0]-c[0],q[1]-c[1]];
    th.push(Math.atan2(a[0]*b[1]-a[1]*b[0], a[0]*b[0]+a[1]*b[1])); }
  const segs = [];
  for (let i=0;i<n;i++){ const p=Vv[i], q=Vv[(i+1)%n];
    const edge = Math.hypot(q[0]-p[0], q[1]-p[1]);
    const st = edge - R[i]*Math.tan(Math.abs(th[i])/2) - R[(i+1)%n]*Math.tan(Math.abs(th[(i+1)%n])/2);
    if (!(st > 14)) throw new Error('edge '+i+' straight '+st.toFixed(1)+' m');
    segs.push(['s', st]);
    const j = (i + 1) % n;                       // 顶点 i+1 的圆弧跟在边 i 之后
    if (Math.abs(th[j])>1e-9) segs.push(['a', R[j], th[j]*180/Math.PI]);
  }
  return segs;
}

function build(tag, target) {
  const segs = fromOutline(V[tag], RR[tag]);
  const tot = segs.reduce((s,g)=> s + (g[0]==='s'?g[1]:Math.abs(g[2])*D2R*g[1]), 0);
  const k = target/tot;
  const segs2 = segs.map(g=> g[0]==='s'?['s',g[1]*k]:['a',g[1]*k,g[2]]);
  const t = new Track(smoothClosed(closeLoop(buildPolyline(segs2, TRACK_STEP)),1,0.12).map(p=>[p.x,p.z]), WIDTH, {dense:true});
  const raw = buildPolyline(segs2, TRACK_STEP);
  return { t, check: Math.hypot(raw[raw.length-1].x-raw[0].x, raw[raw.length-1].z-raw[0].z), turns: segs.filter(g=>g[0]==='a').map(g=>g[2]) };
}
function selfCross(t){ const P=t.pts,n=P.length,seg=i=>[P[i],P[(i+1)%n]];
  const s=(p,q,r)=>Math.sign((q.x-p.x)*(r.z-p.z)-(q.z-p.z)*(r.x-p.x));
  const it=(a,b,c,d)=>s(a,b,c)*s(a,b,d)<0&&s(c,d,a)*s(c,d,b)<0; let h=0;
  for(let i=0;i<n;i++)for(let j=i+2;j<n;j++){ if(i===0&&j===n-1)continue; if(it(...seg(i),...seg(j)))h++; } return h; }
function radial(t){ const P=t.pts; let cx=0,cz=0; P.forEach(p=>{cx+=p.x;cz+=p.z;}); cx/=P.length; cz/=P.length;
  const rs=P.map(p=>Math.hypot(p.x-cx,p.z-cz)); const mean=rs.reduce((a,b)=>a+b,0)/rs.length;
  return (Math.max(...rs)/mean).toFixed(2)+'/'+(Math.min(...rs)/mean).toFixed(2); }

const TARGETS = { ch3: 1620, ch5: 2050, ch6: 1950, ch7: 2450 };
const show = process.argv[2] || 'all';
const list = show === 'all' ? Object.keys(V) : [show];
for (const tag of list) {
  try {
    const { t, check, turns } = build(tag, TARGETS[tag]);
    const cc = corners(t, 0.0025, 8);
    const pos=cc.cs.filter(x=>x.sweep>0).reduce((a,x)=>a+x.sweep,0), neg=cc.cs.filter(x=>x.sweep<0).reduce((a,x)=>a-x.sweep,0);
    const str = cc.straights.map(s=>s.len);
    console.log(tag+' len='+t.total.toFixed(0)+' Rmin='+t.minRadius.toFixed(1)+' 弯='+cc.cs.length+' U='+cc.cs.filter(x=>Math.abs(x.sweep)>=150).length+
      ' 直道'+Math.min(...str).toFixed(0)+'-'+Math.max(...str).toFixed(0)+' 短='+str.filter(v=>v<25).length+
      ' 单向='+(100*Math.max(pos,neg)/(pos+neg)).toFixed(0)+'% 自交='+selfCross(t)+' 闭合='+check.toFixed(1)+'m 径向='+radial(t));
    console.log('  角: '+cc.cs.map(c=>(c.sweep>0?'L':'R')+Math.abs(c.sweep).toFixed(0)).join(' '));
    console.log(ascii(t, 76, 30));
  } catch (e) { console.log(tag + ' ERROR ' + e.message); }
}
for (const key of ['valley','chengdu']) {
  const t = buildTrack(key, WIDTH);
  console.log('ref '+key+' len='+t.total.toFixed(0)+' 径向='+radial(t));
  console.log(ascii(t, 76, 30));
}
