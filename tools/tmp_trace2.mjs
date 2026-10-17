import { decodePNG, redMask, asciiMask } from './pngread.mjs';
const img = decodePNG('shots/user_ch7.png'), m = redMask(img);
const W = img.W, H = img.H;
// 去掉红色文字 (左上角标题行 y<60)
for (let y=0;y<H;y++) for (let x=0;x<W;x++) if (y<62) m[y][x]=0;
const pts = [];
for (let y=0;y<H;y++) for (let x=0;x<W;x++) if (m[y][x]) pts.push([x,y]);
console.log('stroke px=' + pts.length);
// 最近邻串行追踪
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
console.log('chains='+chains.length+' lens='+chains.slice(0,6).map(c=>c.length).join(','));
const main = chains[0];
// 显示主链顺序 (每隔 N 点打一个序号)
const vis = Array.from({length:H}, ()=> new Array(W).fill('.'));
for (const [x,y] of pts) vis[y][x]='-';
for (let i=0;i<main.length;i++){ const [x,y]=main[i]; vis[y][x] = (i%10===0) ? String((i/10)%10) : 'o'; }
console.log(vis.map(r=>r.join('')).join('\n'));
