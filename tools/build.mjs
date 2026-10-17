// 打包: 把 vendor/three + src/core + src/render 合成单个 HTML (双击即玩, file:// 无障碍)。
// 产物: dist/paper-racing.html (+ dist/_bundle.js 供 node --check 体检)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { Script } from 'node:vm';

const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');

const CORE = [
  'src/core/constants.js',
  'src/core/track.js',
  'src/core/kart.js',
  'src/core/world.js',
];
const RENDER = [
  'src/render/paper.js',
  'src/render/karts.js',
  'src/render/scene.js',
  'src/render/hud.js',
  'src/render/game.js',
];

// ES module → 同一作用域内的普通声明 (import 全部删掉, export 前缀去掉)
function stripModule(src) {
  return src
    .replace(/^\s*import\s+[\s\S]*?from\s*['"][^'"]+['"];?[ \t]*$/gm, '')
    .replace(/^\s*import\s*['"][^'"]+['"];?[ \t]*$/gm, '')
    .replace(/^export\s+(const|let|var|function|class|async)\b/gm, '$1')
    .replace(/^export\s*\{[^}]*\};?[ \t]*$/gm, '')
    .replace(/^export\s+default\s+/gm, '');
}

// three.js: 去掉尾部 export{...}, 整包塞进 IIFE, 只把命名空间交出来。
// 这样它被压缩后的内部短名 (cr / et / y ...) 不会和游戏代码撞名。
const threeSrc = read('vendor/three.module.min.js');
const exp = threeSrc.match(/export\s*\{([^}]*)\}\s*;?\s*$/);
if (!exp) throw new Error('未找到 three.js 的 export 语句, 打包中止');
const threeCode = threeSrc.slice(0, exp.index).replace(/^export\s+(const|let|var|function|class)\b/gm, '$1');
if (/^\s*export\b/m.test(threeCode)) throw new Error('three 源码里还有残留的 export');
const pairs = exp[1].split(',').map(s => s.trim()).filter(Boolean).map(s => {
  const m = s.match(/^(\S+)\s+as\s+(\S+)$/);
  return m ? m[2] + ':' + m[1] : s + ':' + s;
});
const threeBlock = [
  'const THREE = (function () {',
  threeCode,
  'return {' + pairs.join(',') + '};',
  '})();',
  'window.THREE = THREE;'
].join('\n');
console.log('three.js: ' + pairs.length + ' 个导出 (IIFE 隔离)');

const core = CORE.map(p => '// ===== ' + p + ' =====\n' + stripModule(read(p))).join('\n');
const render = RENDER.map(p => '// ===== ' + p + ' =====\n' + stripModule(read(p))).join('\n');
const shell = read('src/shell.html');
const bundle = [threeBlock, core, render].join('\n');

// 自检: 合并后同一作用域里若有重名声明 (const/let/class), 这里会立刻抛错
try { new Script(bundle); } catch (e) { throw new Error('打包产物语法错误 (多为跨文件重名): ' + e.message); }

if (!shell.includes('/*__BUNDLE__*/')) throw new Error('shell.html 缺少 /*__BUNDLE__*/ 占位');
const html = shell.replace('/*__BUNDLE__*/', () => bundle);
mkdirSync(new URL('dist/', root), { recursive: true });
writeFileSync(new URL('dist/_bundle.js', root), bundle, 'utf8');
writeFileSync(new URL('dist/paper-racing.html', root), html, 'utf8');
console.log('产物: dist/paper-racing.html  ' + (html.length / 1024).toFixed(0) + ' KB');
