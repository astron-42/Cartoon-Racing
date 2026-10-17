
import { WALKS, toSegs } from './route.mjs';
const D2R = Math.PI/180;
function sim(segs){let x=0,z=0,h=0;const dirs=[];for(const s of segs){if(s[0]==='s'){dirs.push([Math.cos(h),Math.sin(h)]);x+=s[1]*Math.cos(h);z+=s[1]*Math.sin(h);}else{const th=s[2]*D2R;x+=s[1]*(Math.sin(h+th)-Math.sin(h));z+=-s[1]*(Math.cos(h+th)-Math.cos(h));h+=th;}}return {x,z,h,dirs};}
for(const tag of Object.keys(WALKS)){
  const W=WALKS[tag];
  let raw=toSegs(W,1);
  let L=0;for(const s of raw)L+= s[0]==='s'?s[1]:Math.abs(s[2])*D2R*s[1];
  const k=W.target/L;
  let segs=toSegs(W,k);
  const r0=sim(segs);
  console.log(tag,'k='+k.toFixed(3),'init err='+Math.hypot(r0.x,r0.z).toFixed(2),'heading='+r0.h.toFixed(3));
  for(let it=0;it<3;it++){
    const r=sim(segs);
    const w=r.dirs;
    let a=0,b=0,c=0;
    for(const d of w){a+=d[0]*d[0];b+=d[0]*d[1];c+=d[1]*d[1];}
    const det=a*c-b*b;
    const e1=-r.x,e2=-r.z;
    const lam1=(c*e1-b*e2)/det, lam2=(-b*e1+a*e2)/det;
    let j=0;
    segs=segs.map(s=>{if(s[0]!=='s')return s;const d=w[j++];return [s[0],Math.max(12,s[1]+d[0]*lam1+d[1]*lam2)];});
    const rn=sim(segs);
    console.log('  it'+it,'det='+det.toFixed(1),'lam=('+lam1.toFixed(1)+','+lam2.toFixed(1)+')','err->'+Math.hypot(rn.x,rn.z).toFixed(3));
  }
  console.log('  Ls='+segs.filter(s=>s[0]==='s').map(s=>Math.round(s[1])).join(','));
}
