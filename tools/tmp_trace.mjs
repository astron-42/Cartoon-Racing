import { decodePNG, redMask, asciiMask } from './pngread.mjs';
const img = decodePNG('shots/user_ch7.png');
console.log('W='+img.W+' H='+img.H+' ch='+img.ch);
const m = redMask(img);
let n=0, x0=1e9,x1=-1,y0=1e9,y1=-1;
for (let y=0;y<img.H;y++) for (let x=0;x<img.W;x++) if (m[y][x]) { n++; if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
console.log('red px='+n+' bbox x '+x0+'-'+x1+' y '+y0+'-'+y1);
console.log(asciiMask(m, 100, 52));
