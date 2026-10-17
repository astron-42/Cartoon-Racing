import { writeFile, stat } from 'node:fs/promises';
const base = 'https://unpkg.com/three@0.169.0/';
const jobs = [
  ['build/three.module.min.js', 'vendor/three.module.min.js'],
  ['examples/jsm/loaders/GLTFLoader.js', 'vendor/GLTFLoader.js'],
  ['examples/models/gltf/ferrari.glb', 'vendor/ferrari.glb'],
];
for (const [src, dst] of jobs) {
  try {
    const r = await fetch(base + src);
    if (!r.ok) { console.log('HTTP ' + r.status + ' ' + src); continue; }
    const buf = Buffer.from(await r.arrayBuffer());
    await writeFile(dst, buf);
    const s = await stat(dst);
    console.log('OK ' + dst + ' bytes=' + s.size + ' first=' + JSON.stringify(buf.toString('utf8', 0, 14)));
  } catch (e) { console.log('FAIL ' + src + ' :: ' + (e && e.message)); }
}
