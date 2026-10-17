
import { layoutPoints } from '../src/core/track.js';
for (const key of ['valley','chengdu','zhuhai']) {
  const P = layoutPoints(key);
  const n = P.length;
  // 等距抽 18 个顶点
  const M = 18, V = [];
  for (let i=0;i<M;i++) V.push(P[Math.round(i*n/M)%n]);
  let cx=0,cz=0; V.forEach(p=>{cx+=p.x;cz+=p.z;}); cx/=M; cz/=M;
  let mx=0, mean=0;
  const pol = V.map(p=>{ const dx=p.x-cx, dz=p.z-cz; const r=Math.hypot(dx,dz); mean+=r; if(r>mx)mx=r;
    return [((Math.atan2(dz,dx)*180/Math.PI)+360)%360, r]; });
  mean/=M;
  // 按角度排序后打印
  pol.sort((a,b)=>a[0]-b[0]);
  console.log(key, 'M='+M, 'rmean='+mean.toFixed(0), 'rmax='+mx.toFixed(0), 'total='+ (n) );
  console.log('  ' + pol.map(([a,r])=>a.toFixed(0)+':'+r.toFixed(0)).join(' '));
  // 归一化半径序列 (按角度顺序)
  console.log('  归一 ' + pol.map(([a,r])=>(r/mean).toFixed(2)).join(' '));
}
