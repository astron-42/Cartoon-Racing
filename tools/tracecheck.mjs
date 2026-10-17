
// 校验: 打印用户红线多边形的转角/边长表, 并把多边形叠回原图 (蓝线) 供目视比对
import fs from 'node:fs';
import zlib from 'node:zlib';
import { decodePNG } from './pngread.mjs';

export const V0 = [[157,155],[39,156],[31,144],[41,129],[118,86],[134,88],[137,118],[149,118],[177,95],[198,92],[216,105],[261,81],[298,87],[318,102],[323,134],[308,148],[274,138],[217,151],[218,164],[240,164],[258,176],[258,184],[249,190],[229,187],[211,199],[189,197],[169,181],[161,163]];

const perim = V => { let s=0; for(let i=0;i<V.length;i++){const a=V[i],b=V[(i+1)%V.length]; s+=Math.hypot(b[0]-a[0],b[1]-a[1]);} return s; };
const TARGET=2450, K=TARGET/perim(V0);
console.log('perimeter px', perim(V0).toFixed(1), ' k m/px', K.toFixed(2));
const n=V0.length;
for(let i=0;i<n;i++){ const p=V0[(i-1+n)%n],c=V0[i],q=V0[(i+1)%n];
  const a=[c[0]-p[0],c[1]-p[1]], b=[q[0]-c[0],q[1]-c[1]];
  const th=Math.atan2(a[0]*b[1]-a[1]*b[0], a[0]*b[0]+a[1]*b[1]);
  console.log(' i'+i+' ('+c[0]+','+c[1]+') turn='+(th*180/Math.PI).toFixed(1)+'  prev='+(Math.hypot(a[0],a[1])*K).toFixed(0)+'m next='+(Math.hypot(b[0],b[1])*K).toFixed(0)+'m');
}

// --- 画叠图 ---
function crc32(buf){ let c, t=[]; for(let i2=0;i2<256;i2++){ c=i2; for(let k2=0;k2<8;k2++) c = c&1 ? 0xEDB88320^(c>>>1) : c>>>1; t[i2]=c>>>0; }
  let crc=0xFFFFFFFF; for(const b of buf) crc = t[(crc^b)&255]^(crc>>>8); return (crc^0xFFFFFFFF)>>>0; }
function chunk(type, data){ const len=Buffer.alloc(4); len.writeUInt32BE(data.length); const td=Buffer.concat([Buffer.from(type,'ascii'),data]);
  const crc=Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len,td,crc]); }
function writePNG(path, W, H, rgba){ const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(W,0); ihdr.writeUInt32BE(H,4); ihdr[8]=8; ihdr[9]=6; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
  const raw=Buffer.alloc((W*4+1)*H);
  for(let y=0;y<H;y++){ raw[y*(W*4+1)]=0; rgba.copy(raw, y*(W*4+1)+1, y*W*4, (y+1)*W*4); }
  fs.writeFileSync(path, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR',ihdr), chunk('IDAT',zlib.deflateSync(raw)), chunk('IEND',Buffer.alloc(0))]));
}
const img = decodePNG('shots/user_ch7.png');
const { w, h, data } = img;
const px = Buffer.from(data);
const put=(x,y,r,g,b)=>{ if(x<0||y<0||x>=w||y>=h) return; const o=(y*w+x)*4; px[o]=r;px[o+1]=g;px[o+2]=b;px[o+3]=255; };
const line=(x0,y0,x1,y1,c)=>{ const N=Math.max(2,Math.ceil(Math.hypot(x1-x0,y1-y0)*2));
  for(let i=0;i<=N;i++){ const x=x0+(x1-x0)*i/N, y=y0+(y1-y0)*i/N; for(let dx=-1;dx<=1;dx++) for(let dy=-1;dy<=1;dy++) put(Math.round(x)+dx,Math.round(y)+dy,c[0],c[1],c[2]); } };
for(let i=0;i<n;i++){ const a=V0[i], b=V0[(i+1)%n]; line(a[0],a[1],b[0],b[1],[30,60,220]); }
V0.forEach(p=>{ for(let dx=-2;dx<=2;dx++) for(let dy=-2;dy<=2;dy++) put(p[0]+dx,p[1]+dy,0,150,0); });
writePNG('shots/user_ch7_overlay.png', w, h, px);
console.log('img', w+'x'+h, 'overlay -> shots/user_ch7_overlay.png');
