import fs from 'node:fs';
import zlib from 'node:zlib';

const file = process.argv[2];
const outFile = process.argv[3];
const b = fs.readFileSync(file);
const MAGIC = 0xFD2FB528;
const frames = [];
let off = 0;
while (off + 4 <= b.length) {
  if (b.readUInt32LE(off) !== MAGIC) { off++; continue; }
  const start = off;
  off += 4;
  const fhd = b[off++];
  const fcsFlag = fhd >> 6;
  const single = (fhd >> 5) & 1;
  const checksum = (fhd >> 2) & 1;
  const dictFlag = fhd & 3;
  let fcsSize = fcsFlag === 0 ? (single ? 1 : 0) : (fcsFlag === 1 ? 2 : (fcsFlag === 2 ? 4 : 8));
  off += fcsSize;
  if (!single) off += 1;             // window descriptor
  if (dictFlag === 1) off += 1; else if (dictFlag === 2) off += 2; else if (dictFlag === 3) off += 4;
  let last = 0;
  while (!last) {
    const h = b[off] | (b[off + 1] << 8) | (b[off + 2] << 16);
    off += 3;
    last = h & 1;
    const type = (h >> 1) & 3;
    const size = h >>> 3;
    if (type === 0) off += size;
    else if (type === 1) off += 1;
    else if (type === 2) off += size;
    else throw new Error('reserved block at ' + off);
  }
  if (checksum) off += 4;
  frames.push(b.subarray(start, off));
}
let text = '';
let ok = 0, bad = 0;
for (const f of frames) {
  try { text += zlib.zstdDecompressSync(f).toString('utf8'); ok++; }
  catch { bad++; }
}
fs.writeFileSync(outFile, text);
console.log('frames=' + frames.length + ' ok=' + ok + ' bad=' + bad + ' bytes=' + text.length);
