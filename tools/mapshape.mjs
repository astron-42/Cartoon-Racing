import { CHAPTERS } from '../src/core/constants.js';
import { buildTrack, layoutPoints } from '../src/core/track.js';

function ascii(pts, W = 46, H = 20, label) {
  let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
  for (const p of pts) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
  const k = Math.min((W - 1) / Math.max(1e-6, maxX - minX), (H - 1) / Math.max(1e-6, maxZ - minZ));
  const ox = ((W - 1) - (maxX - minX) * k) / 2, oz = ((H - 1) - (maxZ - minZ) * k) / 2;
  const grid = Array.from({ length: H }, () => new Array(W).fill(' '));
  for (const p of pts) {
    const c = Math.round(ox + (p.x - minX) * k), r = Math.round(oz + (p.z - minZ) * k);
    if (grid[r] && grid[r][c] !== undefined) grid[r][c] = '#';
  }
  console.log('  [' + label + ']');
  for (const row of grid) console.log('   ' + row.join(''));
}
for (const ch of CHAPTERS) {
  const track = buildTrack(ch.layout);
  const mapPts = [];
  for (let i = 0; i <= 90; i++) mapPts.push(track.sample(track.total * i / 90));
  console.log('=== ' + ch.key + ' ' + ch.name + ' layout=' + ch.layout + ' total=' + Math.round(track.total) + ' ===');
  ascii(mapPts, 46, 20, 'HUD minimap (sampled track)');
  ascii(layoutPoints(ch.layout), 46, 20, 'card icon (layoutPoints)');
}
