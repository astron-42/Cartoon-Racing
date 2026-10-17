
import { solveWalk, WALKS } from './route.mjs';
const sol = solveWalk(WALKS.ch3);
const segs = sol.segs, D2R = Math.PI/180, step = 2;
let ax=0,az=0,ah=0;      // 精确
let bx=0,bz=0,bh=0;      // buildPolyline 逐步
segs.forEach((g,idx)=>{
  if (g[0]==='s'){
    const dx=g[1]*Math.cos(ah), dz=g[1]*Math.sin(ah); ax+=dx; az+=dz;
    const n=Math.max(1,Math.round(g[1]/step));
    for(let i=0;i<n;i++){ bx+=Math.cos(bh)*step; bz+=Math.sin(bh)*step; }
  } else {
    const th=g[2]*D2R; ax+=g[1]*(Math.sin(ah+th)-Math.sin(ah)); az+=g[1]*(Math.cos(ah)-Math.cos(ah+th)); ah+=th;
    const n=Math.max(2,Math.round(g[1]*Math.abs(th)/step)), dh=th/n;
    for(let i=0;i<n;i++){ bh+=dh; bx+=Math.cos(bh)*step; bz+=Math.sin(bh)*step; }
  }
  const d=Math.hypot(ax-bx,az-bz);
  if (d>0.5) console.log(idx, JSON.stringify(g), 'cum-diff='+d.toFixed(2), 'exact('+ax.toFixed(1)+','+az.toFixed(1)+')', 'poly('+bx.toFixed(1)+','+bz.toFixed(1)+')');
});
console.log('final exact', ax.toFixed(2), az.toFixed(2), 'poly', bx.toFixed(2), bz.toFixed(2));
