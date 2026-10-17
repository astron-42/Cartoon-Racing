import { readFileSync, writeFileSync } from 'node:fs';
const b = readFileSync('dist/_bundle.js', 'utf8');
const A = '// ===== src/core/track.js =====';
const B = '// ===== src/core/kart.js =====';
const i = b.indexOf(A), j = b.indexOf(B);
if (i < 0 || j < 0) { console.log('marker missing', i, j); process.exit(1); }
writeFileSync('tools/_old_track.js', b.slice(i + A.length, j), 'utf8');
console.log('extracted', (j - i), 'chars');