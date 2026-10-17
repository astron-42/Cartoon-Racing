import { build } from './route.mjs';
const { t } = build('ch3');
console.log('total', t.total, 'halfWidth', t.halfWidth, 'pts', t.pts.length);
console.log('p0', JSON.stringify(t.pts[0]), 'tan0', JSON.stringify(t.tan[0]));
console.log('keys', Object.keys(t).slice(0, 40).join(','));
