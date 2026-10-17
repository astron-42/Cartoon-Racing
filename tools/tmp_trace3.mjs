import { decodePNG, redMask } from './pngread.mjs';
const img = decodePNG('shots/user_ch7.png'), m = redMask(img);
const W = img.W, H = img.H;
for (let y=0;y<H;y++) for (let x=0;x<W;x++) if (y<62) m[y][x]=0;
const pts = [];
for (let y=0;y<H;y++) for (let x=0;x<W;x++) if (m[y][x]) pts.push([x,y]);
const used = new Uint8Array(pts.length);
const dist=(a,b)=>Math.hypot(a[0]-b[0], a[1]-b[1]);
const chains=[]; const DIL=3.2, STEP_MAX=9;
while (true){
  let s=-1, best=1e9;
  for (let i=0;i<pts.length;i++) if (!used[i]) { const c=Math.abs(pts[i][0]-183)+Math.abs(pts[i][1]-141); if (c<best){best=c;s=i;} }
  if (s<0) break;
  const chain=[]; let cur=s;
  while (true){
    used[cur]=1; chain.push(pts[cur]);
    for (let i=0;i<pts.length;i++) if (!used[i] && dist(pts[i],pts[cur])<DIL) used[i]=1;
    let ni=-1, nd=1e9;
    for (let i=0;i<pts.length;i++) if (!used[i]) { const d=dist(pts[i],pts[cur]); if (d<nd){nd=d;ni=i;} }
    if (ni<0 || nd>STEP_MAX) break;
    cur=ni;
  }
  chains.push(chain);
}
chains.sort((a,b)=>b.length-a.length);
const main = chains.filter(c=>c.length>=8)[0];
console.log('main chain len='+main.length+' first='+main[0]+' last='+main[main.length-1]);
function dp(P, tol){
  if (P.length<3) return P;
  const a=P[0], b=P[P.length-1];
  let idx=-1, dmax=-1;
  for (let i=1;i<P.length-1;i++){
    const p=P[i];
    const L=Math.hypot(b[0]-a[0], b[1]-a[1]) || 1e-9;
    const d=Math.abs((b[0]-a[0])*(a[1]-p[1]) - (a[0]-p[0])*(b[1]-a[1]))/L;
    if (d>dmax){dmax=d; idx=i;}
  }
  if (dmax>tol){ const L=dp(P.slice(0,idx+1),tol), R=dp(P.slice(idx),tol); return L.slice(0,-1).concat(R); }
  return [a,b];
}
const simp = dp(main, 4.0);
console.log('simplified n='+simp.length);
console.log(JSON.stringify(simp));
