// 卡通竞速 · 程序化纸材质 (无外部贴图, 单文件即可运行)
// 全部纹理用 Canvas 现画: 纸张纤维噪点 / 印刷车道线 / 天空渐变 / 纸偶纸牌立绘

function canvas2d(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { c, g: c.getContext('2d') };
}

function tex(c, repX = 1, repY = 1, aniso = 8) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repX, repY);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  return t;
}

// 纸张底纹: 底色 + 纤维噪点 + 轻微色斑
function paperCanvas(size, base, speck = '#00000010', seed = 1, fibers = 90) {
  const { c, g } = canvas2d(size, size);
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  const rnd = makeRng(seed);
  for (let i = 0; i < fibers * 6; i++) {
    const x = rnd() * size, y = rnd() * size, l = 2 + rnd() * 10, a = rnd() * Math.PI;
    g.strokeStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.045)';
    g.lineWidth = 0.6 + rnd() * 0.8;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  for (let i = 0; i < 26; i++) {
    g.fillStyle = speck;
    g.globalAlpha = 0.25 + rnd() * 0.5;
    g.beginPath();
    g.arc(rnd() * size, rnd() * size, 1 + rnd() * 26, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  return c;
}

function paperTexture(base, seed, repeat = 24, size = 256) {
  return tex(paperCanvas(size, base, '#00000012', seed), repeat, repeat);
}

// 赛道纸带: u 沿行进方向(每 4 m 一张), v 横跨纸带(0=左缘, 1=右缘)
function roadTexture(chapter, seed = 7) {
  const W = 256, H = 128;
  const { c, g } = canvas2d(W, H);
  g.drawImage(paperCanvas(256, chapter.paper || '#f7f1e3', '#00000010', seed, 60), 0, 0, W, H);
  // 暖色纸浆: 统一罩一层很淡的暖黄, 让赛道不发灰
  g.fillStyle = 'rgba(214,150,72,0.12)';
  g.fillRect(0, 0, W, H);
  // 纸带切口阴影 (两侧压深)
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0.0, 'rgba(0,0,0,0.16)');
  grad.addColorStop(0.12, 'rgba(0,0,0,0)');
  grad.addColorStop(0.88, 'rgba(0,0,0,0)');
  grad.addColorStop(1.0, 'rgba(0,0,0,0.16)');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  // 印刷边线
  g.strokeStyle = chapter.accent || '#c8553d';
  g.globalAlpha = 0.45; g.lineWidth = 2.5;
  for (const v of [0.075, 0.925]) { g.beginPath(); g.moveTo(0, v * H); g.lineTo(W, v * H); g.stroke(); }
  // 中央虚线 (每 4 m 一个循环: 2.4 m 线 + 1.6 m 空)
  g.globalAlpha = 0.30; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, H * 0.5); g.lineTo(W * 0.6, H * 0.5); g.stroke();
  // 轮迹压痕
  g.globalAlpha = 0.10; g.lineWidth = 14;
  for (const v of [0.32, 0.68]) { g.beginPath(); g.moveTo(0, v * H); g.lineTo(W, v * H); g.stroke(); }
  // 印刷等高线 (细淡蓝灰, 书页地图的味道)
  g.globalAlpha = 0.14; g.lineWidth = 1.2; g.strokeStyle = '#5b7fa6';
  for (const v of [0.18, 0.24, 0.76, 0.82]) {
    g.beginPath();
    for (let x = 0; x <= W; x += 8) g.lineTo(x, v * H + Math.sin((x / W) * 6.28) * 2.4);
    g.stroke();
  }
  g.globalAlpha = 1;
  return tex(c, 1, 1, 8);
}

// 草地/页面的横向渐变纸
function fieldTexture(chapter) {
  const { c, g } = canvas2d(128, 128);
  g.drawImage(paperCanvas(128, chapter.ground || '#cfe3b4', '#00000012', 21, 40), 0, 0, 128, 128);
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, 'rgba(255,255,255,0.10)');
  grad.addColorStop(1, 'rgba(0,0,0,0.10)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return tex(c, 40, 6, 8);
}

// 天空: 竖直渐变纸幕
function skyTexture(top, bottom) {
  const { c, g } = canvas2d(8, 256);
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, top);
  grad.addColorStop(0.62, bottom);
  grad.addColorStop(1, bottom);
  g.fillStyle = grad;
  g.fillRect(0, 0, 8, 256);
  return tex(c, 1, 1, 1);
}

// 车手纸牌立绘: 透明底 + 墨线描边的剪纸动物
function driverCardTexture(racer) {
  const W = 128, H = 160;
  const { c, g } = canvas2d(W, H);
  const body = racer.body || '#e8b4a0';
  const belly = racer.belly || '#fdf3e6';
  const ink = '#3a3226';
  const key = String(racer.key || racer.name || 'x');
  const hash = Array.from(key).reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const earStyle = hash % 3;
  g.lineWidth = 3.4; g.strokeStyle = ink; g.lineJoin = 'round';

  // 耳朵
  g.fillStyle = body;
  const ear = (cx, cy, w, h, rot) => {
    g.save(); g.translate(cx, cy); g.rotate(rot);
    g.beginPath(); g.ellipse(0, 0, w, h, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.beginPath(); g.ellipse(0, 0, w * 0.45, h * 0.5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = body;
    g.restore();
  };
  if (earStyle === 0) { ear(38, 34, 13, 24, -0.35); ear(90, 34, 13, 24, 0.35); }
  else if (earStyle === 1) { ear(40, 40, 17, 17, 0); ear(88, 40, 17, 17, 0); }
  else { ear(42, 32, 12, 28, -0.15); ear(86, 32, 12, 28, 0.15); }

  // 头
  g.fillStyle = body;
  g.beginPath(); g.ellipse(64, 86, 40, 37, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  // 口鼻
  g.fillStyle = belly;
  g.beginPath(); g.ellipse(64, 104, 24, 17, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.lineWidth = 2.6;
  // 眼
  g.fillStyle = ink;
  for (const ex of [48, 80]) {
    g.beginPath(); g.ellipse(ex, 78, 5.4, 6.6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(ex - 1.6, 75.6, 1.7, 0, Math.PI * 2); g.fill();
    g.fillStyle = ink;
  }
  // 鼻 + 嘴
  g.beginPath(); g.moveTo(64, 96); g.lineTo(58, 90); g.lineTo(70, 90); g.closePath();
  g.fillStyle = '#8a5a4a'; g.fill();
  g.strokeStyle = ink; g.lineWidth = 2.2;
  g.beginPath(); g.moveTo(64, 98); g.lineTo(64, 104); g.stroke();
  g.beginPath(); g.arc(58, 104, 6.4, -0.1, Math.PI * 0.85); g.stroke();
  g.beginPath(); g.arc(70, 104, 6.4, Math.PI * 0.15, Math.PI * 1.1); g.stroke();
  // 腮红
  g.fillStyle = 'rgba(200,85,61,0.22)';
  for (const cx of [34, 94]) { g.beginPath(); g.ellipse(cx, 96, 9, 6, 0, 0, Math.PI * 2); g.fill(); }

  const t = tex(c, 1, 1, 4);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// 十字交叉的立牌几何 (两片平面) —— 剪纸花草用, 从任何角度看都不消失
function crossPlane(w = 1, h = 1) {
  const a = new THREE.PlaneGeometry(w, h); a.translate(0, h / 2, 0);
  const b = new THREE.PlaneGeometry(w, h); b.rotateY(Math.PI / 2); b.translate(0, h / 2, 0);
  const geo = new THREE.BufferGeometry();
  const pa = a.attributes.position.array, pb = b.attributes.position.array;
  const ua = a.attributes.uv.array, ub = b.attributes.uv.array;
  const na = a.attributes.normal.array, nb = b.attributes.normal.array;
  const pos = new Float32Array(pa.length + pb.length); pos.set(pa); pos.set(pb, pa.length);
  const uv = new Float32Array(ua.length + ub.length); uv.set(ua); uv.set(ub, ua.length);
  const nor = new Float32Array(na.length + nb.length); nor.set(na); nor.set(nb, na.length);
  const ia = a.index.array, ib = b.index.array;
  const idx = new Uint16Array(ia.length + ib.length); idx.set(ia);
  for (let i = 0; i < ib.length; i++) idx[ia.length + i] = ib[i] + pa.length / 3;
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  return geo;
}

// 剪纸雏菊: 白花瓣 + 黄芯 + 墨线描边 (第一章的招牌植物)
function daisyTexture(seed = 3) {
  const Z = 128;
  const { c, g } = canvas2d(Z, Z);
  const rnd = makeRng(seed);
  const cx = Z / 2, cy = Z * 0.36, r = Z * 0.30;
  g.strokeStyle = '#5f8b4c'; g.lineWidth = 4; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx, cy + r * 0.6); g.quadraticCurveTo(cx - 7, cy + r * 1.9, cx + 3, Z * 0.98); g.stroke();
  g.fillStyle = '#6f9c5c'; g.strokeStyle = '#4e7340'; g.lineWidth = 1.4;
  g.beginPath(); g.ellipse(cx - 15, cy + r * 1.5, 15, 7, -0.5, 0, Math.PI * 2); g.fill(); g.stroke();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.22;
    const px = cx + Math.cos(a) * r * 0.70, py = cy + Math.sin(a) * r * 0.70;
    g.save(); g.translate(px, py); g.rotate(a);
    g.fillStyle = '#fdfaf0'; g.strokeStyle = '#c9bd9e'; g.lineWidth = 1.5;
    g.beginPath(); g.ellipse(0, 0, r * 0.48, r * 0.21, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.restore();
  }
  g.fillStyle = '#f0c04a'; g.strokeStyle = '#c98f2e'; g.lineWidth = 2;
  g.beginPath(); g.arc(cx, cy, r * 0.40, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = 'rgba(120,80,20,0.18)';
  for (let i = 0; i < 10; i++) { g.beginPath(); g.arc(cx + (rnd() - 0.5) * r * 0.5, cy + (rnd() - 0.5) * r * 0.5, 1.3, 0, 6.3); g.fill(); }
  return tex(c, 1, 1, 4);
}

// 剪纸圆树: 圆形树冠 + 小树干 + 墨线
function treeTexture(seed = 5) {
  const Z = 128;
  const { c, g } = canvas2d(Z, Z);
  const rnd = makeRng(seed);
  g.fillStyle = '#8a5f3c'; g.strokeStyle = '#5d4028'; g.lineWidth = 2;
  g.beginPath(); g.rect(Z * 0.46, Z * 0.62, Z * 0.09, Z * 0.36); g.fill(); g.stroke();
  const cx = Z * 0.5, cy = Z * 0.40, r = Z * 0.30;
  g.fillStyle = '#7fa86a'; g.strokeStyle = '#4e7340'; g.lineWidth = 2.4;
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#93bd7a';
  g.beginPath(); g.arc(cx - r * 0.30, cy - r * 0.28, r * 0.62, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.30)';
  g.beginPath(); g.ellipse(cx - r * 0.34, cy - r * 0.42, r * 0.34, r * 0.20, -0.6, 0, Math.PI * 2); g.fill();
  return tex(c, 1, 1, 4);
}

// 剪纸小屋: 平立牌式样, 赛道外围的纸房子 (参照 Kağıt Kart)
function houseTexture(variant = 0, seed = 9) {
  const Z = 128;
  const { c, g } = canvas2d(Z, Z);
  const rnd = makeRng(seed + variant * 17);
  const roofCols = ['#c8553d', '#b7482f', '#4a6f9c', '#c98f2e'];
  const roof = roofCols[variant % roofCols.length];
  const wall = variant % 3 === 0 ? '#f7f1e3' : (variant % 3 === 1 ? '#fdf6e6' : '#f0ead9');
  const bx = Z * 0.17, bw = Z * 0.66, by = Z * 0.46, bh = Z * 0.48;
  g.strokeStyle = '#3a3226'; g.lineWidth = 2.6; g.lineJoin = 'round';
  g.fillStyle = wall;
  g.beginPath(); g.rect(bx, by, bw, bh); g.fill(); g.stroke();
  g.fillStyle = roof;
  g.beginPath(); g.moveTo(bx - Z * 0.07, by); g.lineTo(Z * 0.5, Z * 0.06); g.lineTo(bx + bw + Z * 0.07, by); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#8a7f6b';
  g.beginPath(); g.rect(bx + bw * 0.60, Z * 0.10, Z * 0.10, Z * 0.17); g.fill(); g.stroke();
  g.fillStyle = '#8a5f3c';
  g.beginPath(); g.rect(bx + bw * 0.41, by + bh * 0.40, bw * 0.19, bh * 0.60); g.fill(); g.stroke();
  g.fillStyle = '#bcd6e8';
  for (const wx of [bx + bw * 0.09, bx + bw * 0.70]) {
    g.beginPath(); g.rect(wx, by + bh * 0.18, bw * 0.20, bh * 0.27); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(wx + bw * 0.10, by + bh * 0.18); g.lineTo(wx + bw * 0.10, by + bh * 0.45); g.stroke();
    g.beginPath(); g.moveTo(wx, by + bh * 0.315); g.lineTo(wx + bw * 0.20, by + bh * 0.315); g.stroke();
  }
  g.fillStyle = 'rgba(58,50,38,0.13)';
  for (let i = 0; i < 16; i++) g.fillRect(rnd() * Z, Z * 0.93 + rnd() * 4, 3 + rnd() * 7, 1.4);
  return tex(c, 1, 1, 4);
}

// 木桌: 温暖的木纹桌面 (菜单里立体书就摆在这上面)
function woodTexture(seed = 77) {
  const Z = 256;
  const { c, g } = canvas2d(Z, Z);
  const rnd = makeRng(seed);
  g.fillStyle = '#b98c5a'; g.fillRect(0, 0, Z, Z);
  for (let p = 0; p < 4; p++) {
    const y = p * (Z / 4);
    g.fillStyle = 'rgba(70,44,22,0.16)'; g.fillRect(0, y, Z, 3);
    g.fillStyle = 'rgba(255,232,200,0.10)'; g.fillRect(0, y + 3, Z, 2);
  }
  for (let i = 0; i < 300; i++) {
    const y = rnd() * Z, x = rnd() * Z, len = 18 + rnd() * 100;
    g.strokeStyle = rnd() < 0.5 ? 'rgba(94,62,34,0.20)' : 'rgba(255,226,190,0.13)';
    g.lineWidth = 0.6 + rnd() * 2.2;
    g.beginPath(); g.moveTo(x, y);
    g.bezierCurveTo(x + len * 0.35, y + (rnd() - 0.5) * 7, x + len * 0.7, y + (rnd() - 0.5) * 7, x + len, y + (rnd() - 0.5) * 4);
    g.stroke();
  }
  g.fillStyle = 'rgba(60,36,16,0.10)';
  for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(rnd() * Z, rnd() * Z, 3 + rnd() * 7, 2 + rnd() * 4, rnd() * 3, 0, 6.3); g.fill(); }
  return tex(c, 1, 1, 8);
}

function paperMat(color, opts = {}) {
  return new THREE.MeshLambertMaterial(Object.assign({ color, flatShading: true }, opts));
}

function edgeLines(mesh, color = 0x3a3226, opacity = 0.55) {
  const e = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry, 22),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity })
  );
  e.position.copy(mesh.position);
  e.rotation.copy(mesh.rotation);
  e.scale.copy(mesh.scale);
  return e;
}