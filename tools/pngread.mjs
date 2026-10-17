import fs from 'node:fs';
import zlib from 'node:zlib';
export function decodePNG(path){
  const b = fs.readFileSync(path);
  let off = 8, W=0,H=0,ct=0,bd=0; const idat=[];
  while (off < b.length){
    const len = b.readUInt32BE(off), type = b.slice(off+4,off+8).toString('latin1');
    const data = b.slice(off+8, off+8+len);
    if (type==='IHDR'){ W=data.readUInt32BE(0); H=data.readUInt32BE(4); bd=data[8]; ct=data[9]; }
    else if (type==='IDAT') idat.push(data);
    else if (type==='IEND') break;
    off += 12+len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const ch = ct===6?4:ct===2?3:ct===0?1:4;
  const stride = W*ch, out = Buffer.alloc(H*stride);
  let p = 0;
  for (let y=0;y<H;y++){
    const f = raw[p++]; const line = raw.slice(p, p+stride); p += stride;
    const cur = out.slice(y*stride, (y+1)*stride), prev = y? out.slice((y-1)*stride, y*stride) : Buffer.alloc(stride);
    for (let x=0;x<stride;x++){
      const A = x>=ch? cur[x-ch]:0, B = prev[x], C = x>=ch? prev[x-ch]:0, v = line[x];
      let val;
      if (f===0) val=v; else if (f===1) val=v+A; else if (f===2) val=v+B; else if (f===3) val=v+((A+B)>>1);
      else { const pa=Math.abs(B-C), pb=Math.abs(A-C), pc=Math.abs(A+B-2*C); const pr = (pa<=pb&&pa<=pc)?A:(pb<=pc?B:C); val=v+pr; }
      cur[x]=val&255;
    }
  }
  return { W, H, ch, data: out };
}
export function redMask(img){
  const { W,H,ch,data } = img, m = [];
  for (let y=0;y<H;y++){ const row=new Uint8Array(W);
    for (let x=0;x<W;x++){ const i=(y*W+x)*ch, R=data[i],G=data[i+1],B=data[i+2];
      row[x] = (R>140 && R-G>60 && R-B>60) ? 1 : 0; }
    m.push(row); }
  return m;
}
export function asciiMask(m, W, H){
  const sh=m.length, sw=m[0].length; const lines=[];
  for (let r=0;r<H;r++){ let s='';
    for (let c=0;c<W;c++){ const y0=Math.floor(r*sh/H), y1=Math.max(y0+1,Math.floor((r+1)*sh/H)), x0=Math.floor(c*sw/W), x1=Math.max(x0+1,Math.floor((c+1)*sw/W));
      let hit=0; for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++) if (m[y][x]) hit++;
      s += hit? (hit>6?'#':'+') : '.'; }
    lines.push(s); }
  return lines.join('\n');
}
