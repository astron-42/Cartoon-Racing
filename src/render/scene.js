// 卡通竞速 · 3D 纸雕场景: 浮空纸页 + 挖剪纸带赛道 + 剪纸装饰

const FIELD_Y = -0.34;          // 草地纸面高度
const TRACK_Y = 0.0;            // 赛道纸带高度
const PAGE_SKIRT = 0.9;         // 纸页厚度
const U_METERS = 4.0;           // 纸带贴图沿行进方向的重复长度

function shade(hex, amt) {
  const c = new THREE.Color(hex || '#cccccc');
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + amt)));
  return '#' + c.getHexString();
}

// 沿赛道扫出一条闭合纸带 (顶面 + 两侧切口)
function bandGeometry(track, opts) {
  const hw = opts.hw;
  const y = opts.y || 0;
  const th = opts.thickness || 0;
  const stride = opts.stride || 1;
  const segs = Math.max(24, Math.round(track.total / stride));
  const pos = [], uv = [], idx = [];
  const push = (x, yy, z, u, v) => { pos.push(x, yy, z); uv.push(u, v); return pos.length / 3 - 1; };
  let base = 0;
  for (let i = 0; i <= segs; i++) {
    const s = track.total * (i % segs) / segs;
    const p = track.sample(s);
    const u = s / U_METERS;
    const lx = p.x + p.nx * hw, lz = p.z + p.nz * hw;
    const rx = p.x - p.nx * hw, rz = p.z - p.nz * hw;
    const y0 = y + p.y;                       // 纸带贴着中心线的高程起伏
    push(lx, y0, lz, u, 1);
    push(rx, y0, rz, u, 0);
    if (th > 0) {
      push(lx, y0 - th, lz, u, 0.97);
      push(rx, y0 - th, rz, u, 0.03);
    }
  }
  const stride4 = th > 0 ? 4 : 2;
  for (let i = 0; i < segs; i++) {
    const a = base + i * stride4, b = a + 1, c = a + stride4, d = c + 1;
    idx.push(a, c, b, b, c, d);
    if (th > 0) {
      const lb = a + 2, rb = b + 2, lc = c + 2, rd = d + 2;
      idx.push(a, lb, c, c, lb, lc);      // 左侧切口
      idx.push(b, d, rb, rb, d, rd);      // 右侧切口
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

class PaperScene {
  constructor(opts) {
    this.track = opts.track;
    this.renderer = opts.renderer;
    this.quality = opts.quality || 'high';
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(56, 16 / 9, 0.4, 3000);
    this.camPos = new THREE.Vector3(0, 8, -20);
    this.camLook = new THREE.Vector3(0, 0, 0);
    this.kartMeshes = new Map();
    this.clock = 0;
    this.chapter = null;
    this.shared = {
      bodyGeo: carBodyGeometry(),
      cabinGeo: new THREE.BoxGeometry(1.0, 0.36, 0.74),
      wheelGeo: wheelGeometry(),
      cardGeo: new THREE.PlaneGeometry(0.98, 1.24)
    };
    this.buildLights();
    this.buildSky();
    this.buildTrack();
    this.buildField();
    this.setChapter(opts.chapter);
    this.buildDesk();
  }

  // 菜单/封面状态下的镜头与动画 (无 world 时每帧调用)
  updateMenu(dt, closeup) {
    this.clock += dt;
    if (this.decor) {
      for (const child of this.decor.children) {
        if (child.userData && child.userData.spin) child.userData.spin.rotation.z += dt * 1.1;
      }
    }
    const t = this.clock;
    const cam = this.camera;
    if (this.trackGroup) this.trackGroup.visible = false;   // 菜单里立体书摆在木桌上, 赛道不抢镜
    if (this.decor) this.decor.visible = false;
    if (this.scenery) this.scenery.visible = true;   // 远山/纸云当舞台背景 (不再全部隐藏)
    if (this.desk) this.desk.visible = true;
    // closeup: 封面/标题页把镜头推近到立体书上 (参照 Kağıt Kart 标题页)
    const target = closeup ? 1 : 0;
    this.camNear = (this.camNear || 0) + (target - (this.camNear || 0)) * (1 - Math.pow(0.004, Math.max(0.0001, dt)));
    const n = this.camNear;
    cam.position.set(Math.sin(t * 0.17) * (3.0 - n * 0.9), 11.4 - n * 2.6 + Math.sin(t * 0.31) * 0.5, 25.2 - n * 9.2);
    cam.lookAt(0, 6.35 - n * 0.25, 0);
    const fov = 42;
    if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = fov; cam.updateProjectionMatrix(); }
  }

  buildLights() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x9a8f79, 0.74);
    this.hemi = hemi;
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff4de, 1.45);
    sun.position.set(60, 110, 40);
    sun.castShadow = true;
    const sz = this.quality === 'low' ? 512 : 2048;
    sun.shadow.mapSize.set(sz, sz);
    sun.shadow.camera.left = -70; sun.shadow.camera.right = 70;
    sun.shadow.camera.top = 70; sun.shadow.camera.bottom = -70;
    sun.shadow.camera.near = 20; sun.shadow.camera.far = 320;
    sun.shadow.bias = -0.0009;
    sun.shadow.normalBias = 0.4;
    this.sun = sun;
    this.sunOffset = new THREE.Vector3(52, 96, 34);
    this.scene.add(sun);
    this.scene.add(sun.target);
  }

  buildSky() {
    const geo = new THREE.SphereGeometry(1500, 28, 16);   // 球穹顶: 有渐变又没有可见的边
    this.skyMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false, depthWrite: false });
    const mesh = new THREE.Mesh(geo, this.skyMat);
    mesh.position.y = 0;
    this.skyMesh = mesh;
    this.scene.add(mesh);
    this.scene.background = new THREE.Color(0x1d1a16);
    this.scene.fog = new THREE.FogExp2(0xf1e4c6, 0.00055);
    // 远处的浮空纸屑, 给虚空一点纵深
    const scrapGeo = new THREE.PlaneGeometry(1, 1);
    const scrapMat = new THREE.MeshBasicMaterial({ color: 0xf6efe1, transparent: true, opacity: 0.55, side: THREE.DoubleSide, fog: false });
    const scraps = new THREE.InstancedMesh(scrapGeo, scrapMat, 90);
    const rnd = makeRng(99);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pv = new THREE.Vector3();
    for (let i = 0; i < 90; i++) {
      const a = rnd() * Math.PI * 2, r = 240 + rnd() * 900;
      pv.set(Math.cos(a) * r, -60 + rnd() * 260, Math.sin(a) * r);
      q.setFromEuler(new THREE.Euler(-Math.PI / 2 + (rnd() - 0.5) * 0.5, rnd() * 6.28, 0));
      const k = 3 + rnd() * 9;
      sc.set(k, k, k);
      m.compose(pv, q, sc);
      scraps.setMatrixAt(i, m);
    }
    scraps.instanceMatrix.needsUpdate = true;
    this.scraps = scraps;
    this.scene.add(scraps);
  }

  buildTrack() {
    if (!this.trackGroup) { this.trackGroup = new THREE.Group(); this.scene.add(this.trackGroup); }
    const hw = this.track.halfWidth;
    this.roadMat = paperMat('#f7f1e3', { side: THREE.DoubleSide });
    this.roadMesh = new THREE.Mesh(bandGeometry(this.track, { hw: hw, y: TRACK_Y, thickness: 0.42, stride: 1.5 }), this.roadMat);
    this.roadMesh.receiveShadow = true;
    this.trackGroup.add(this.roadMesh);
    // 纸带折边
    const edgeGeo = new THREE.BufferGeometry();
    const pts = [];
    for (let i = 0; i <= 240; i++) {
      const s = this.track.total * i / 240;
      const p = this.track.sample(s);
      pts.push(p.x + p.nx * hw, TRACK_Y + 0.02 + p.y, p.z + p.nz * hw);
      pts.push(p.x - p.nx * hw, TRACK_Y + 0.02 + p.y, p.z - p.nz * hw);
    }
    edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.trackGroup.add(new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: 0x3a3226, transparent: true, opacity: 0.32 })));
    // 起点线
    this.startLine = this.makeStartLine();
    this.trackGroup.add(this.startLine);
    this.buildRunoff();
    this.buildKerbs();
    this.buildFences();
    this.buildGantry();
  }

  makeStartLine() {
    const { c, g } = canvas2d(512, 64);
    for (let i = 0; i < 32; i++) {
      for (let j = 0; j < 4; j++) {
        g.fillStyle = (i + j) % 2 ? '#3a3226' : '#f7f1e3';
        g.fillRect(i * 16, j * 16, 16, 16);
      }
    }
    const t = tex(c, 1, 1, 8);
    const hw = this.track.halfWidth;
    const geo = new THREE.PlaneGeometry(hw * 2, 2.6);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide }));
    const p = this.track.sample(0);
    mesh.position.set(p.x, TRACK_Y + 0.03 + p.y, p.z);
    mesh.rotation.y = Math.atan2(p.tx, p.tz);
    return mesh;
  }

  buildField() {
    const hw = this.track.halfWidth * PHYS.lateralMax + 1.2;
    // 纸世界地面: 一大张纸, 场外不留虚空 (远处置于雾里)
    const gGeo = new THREE.PlaneGeometry(4000, 4000);
    gGeo.rotateX(-Math.PI / 2);
    this.groundMat = new THREE.MeshLambertMaterial({ color: '#cfe3b4' });
    const ground = new THREE.Mesh(gGeo, this.groundMat);
    ground.position.set(0, FIELD_Y - 0.08, 0);
    ground.renderOrder = -2;
    this.trackGroup.add(ground);
    this.fieldMat = paperMat('#cfe3b4', { side: THREE.DoubleSide });
    this.fieldMesh = new THREE.Mesh(bandGeometry(this.track, { hw: hw, y: FIELD_Y, thickness: PAGE_SKIRT, stride: 3 }), this.fieldMat);
    this.fieldMesh.receiveShadow = true;
    this.fieldMesh.renderOrder = -1;
    this.trackGroup.add(this.fieldMesh);
    this.fieldHW = hw;
  }

  // ---------- 赛道周边: 缓冲区 / 路肩 / 围栏 / 龙门架 ----------
  // 缓冲区: 赛道外一圈浅色沙纸, 让纸带不那么"浮"
  buildRunoff() {
    const mesh = new THREE.Mesh(
      bandGeometry(this.track, { hw: this.track.halfWidth + 3.4, y: TRACK_Y - 0.07, thickness: 0.26, stride: 3 }),
      paperMat('#e5d9bc', { side: THREE.DoubleSide }));
    mesh.receiveShadow = true;
    mesh.renderOrder = -0.5;
    this.trackGroup.add(mesh);
    this.runoffMesh = mesh;
  }

  // 弯道里外的红白瓦楞纸路肩 (只铺在弯上, 直道留空)
  buildKerbs() {
    const hw = this.track.halfWidth;
    const step = 3.0;
    const slots = [];
    for (let s = 0; s < this.track.total; s += step) {
      if (Math.abs(this.track.curvatureAt(s)) < 0.013) continue;
      slots.push(s); slots.push(s);          // 同一个 s 的左右两侧
    }
    if (!slots.length) return;
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.7, 0.16, step * 0.94), paperMat('#ffffff'), slots.length);
    mesh.receiveShadow = true;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), pv = new THREE.Vector3(), sc1 = new THREE.Vector3(1, 1, 1), col = new THREE.Color();
    slots.forEach((s, i) => {
      const p = this.track.sample(s);
      const off = (hw + 0.85) * (i % 2 ? 1 : -1);
      pv.set(p.x + p.nx * off, TRACK_Y + 0.08 + p.y, p.z + p.nz * off);
      q.setFromEuler(new THREE.Euler(0, Math.atan2(p.tx, p.tz), 0));
      m.compose(pv, q, sc1);
      mesh.setMatrixAt(i, m);
      col.set(Math.floor(i / 2) % 2 ? '#c8553d' : '#f7f1e3');
      mesh.setColorAt(i, col);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.trackGroup.add(mesh);
    this.kerbMesh = mesh;
  }

  // 围栏: 一排小纸柱 + 一根连线
  buildFences() {
    const hw = this.track.halfWidth;
    const step = 9;
    const list = [];
    for (let s = 0; s < this.track.total; s += step) list.push(s);
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 1.6, 0.2), paperMat('#ded2b6'), list.length * 2);
    mesh.castShadow = true;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), pv = new THREE.Vector3(), sc1 = new THREE.Vector3(1, 1, 1);
    const tops = [];
    list.forEach((s, i) => {
      const p = this.track.sample(s);
      [1, -1].forEach((side, j) => {
        const off = (hw + 5.4) * side;
        const x = p.x + p.nx * off, z = p.z + p.nz * off, y = TRACK_Y + 0.85 + p.y;
        pv.set(x, y - 0.8, z);
        q.identity();
        m.compose(pv, q, sc1);
        mesh.setMatrixAt(i * 2 + j, m);
        tops[i * 2 + j] = { x: x, y: y, z: z };
      });
    });
    mesh.instanceMatrix.needsUpdate = true;
    this.trackGroup.add(mesh);
    const wire = [];
    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < list.length; i++) {
        const a = tops[i * 2 + j], b = tops[((i + 1) % list.length) * 2 + j];
        wire.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3));
    this.trackGroup.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x9a8f78, transparent: true, opacity: 0.5 })));
  }

  // 起点龙门架: 两根柱子 + 横梁 + 黑白格横幅
  buildGantry() {
    const g = new THREE.Group();
    const hw = this.track.halfWidth;
    const p = this.track.sample(0);
    g.position.set(p.x, TRACK_Y + p.y, p.z);
    g.rotation.y = Math.atan2(p.tx, p.tz);
    for (const sx of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.7, 7.2, 0.7), paperMat('#f2e7cd'));
      post.position.set(sx * (hw + 1.3), 3.6, 0);
      post.castShadow = true;
      g.add(post); g.add(edgeLines(post, 0x3a3226, 0.3));
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 + 3.4, 1.4, 1.0), paperMat('#c8553d'));
    beam.position.set(0, 7.4, 0);
    beam.castShadow = true;
    g.add(beam); g.add(edgeLines(beam, 0x3a3226, 0.35));
    const cc = canvas2d(512, 96);
    const ctx = cc.g;
    ctx.fillStyle = '#f7f1e3'; ctx.fillRect(0, 0, 512, 96);
    ctx.fillStyle = '#3a3226';
    for (let i = 0; i < 32; i++) {
      if (i % 2 === 0) ctx.fillRect(i * 16, 0, 16, 16);
      else ctx.fillRect(i * 16, 80, 16, 16);
    }
    ctx.font = 'bold 46px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('卡 通 竞 速 · 起 点', 256, 48);
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2, 1.5),
      new THREE.MeshBasicMaterial({ map: tex(cc.c, 1, 1, 4) }));
    banner.position.set(0, 6.2, 0.1);
    banner.rotation.y = Math.PI;      // 字面朝向发车格, 车手看到的不是镜像
    g.add(banner);
    this.trackGroup.add(g);
  }

  // 看台: 四级纸板 + 顶棚 + 彩色纸片观众
  makeGrandstand(s, side) {
    const g = new THREE.Group();
    const p = this.track.sample(this.track.total * s);
    const off = (this.fieldHW || this.track.halfWidth * 3) * 0.80;
    g.position.set(p.x + p.nx * off * side, FIELD_Y + p.y, p.z + p.nz * off * side);
    // +π: 台阶由近及远逐级抬高, 观众面朝赛道 (原来整体背对赛道)
    g.rotation.y = Math.atan2(p.tx, p.tz) + Math.PI;
    for (let i = 0; i < 4; i++) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.6, 30 - i * 1.2), paperMat(i % 2 ? '#e6dbc2' : '#f2e8d2'));
      slab.position.set(side * (i * 1.9), 0.8 + i * 1.6, 0);
      slab.castShadow = true; slab.receiveShadow = true;
      g.add(slab); g.add(edgeLines(slab, 0x3a3226, 0.26));
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.5, 31), paperMat('#c8553d', { side: THREE.DoubleSide }));
    roof.position.set(side * 4.6, 7.6, 0);
    roof.rotation.z = side * -0.10;
    roof.castShadow = true;
    g.add(roof); g.add(edgeLines(roof, 0x3a3226, 0.3));
    const rnd = makeRng(911 + Math.round(s * 100));
    const N = 90;
    const crowd = new THREE.InstancedMesh(new THREE.BoxGeometry(0.46, 0.7, 0.46), paperMat('#ffffff'), N);
    const hues = ['#c8553d', '#f4e2a1', '#6fa96b', '#3d6ea8', '#efb1c2', '#f6c96b', '#8c6b4f'];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), pv = new THREE.Vector3(), sc1 = new THREE.Vector3(1, 1, 1), col = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const tier = Math.floor(rnd() * 4);
      pv.set(side * (tier * 1.9), 1.9 + tier * 1.6, -14 + rnd() * 28);
      q.identity();
      m.compose(pv, q, sc1);
      crowd.setMatrixAt(i, m);
      col.set(hues[Math.floor(rnd() * hues.length)]);
      crowd.setColorAt(i, col);
    }
    crowd.instanceMatrix.needsUpdate = true;
    if (crowd.instanceColor) crowd.instanceColor.needsUpdate = true;
    g.add(crowd);
    return g;
  }

  // 维修楼: 长条纸盒 + 一排窗 + 屋顶
  makePit(s, side) {
    const g = new THREE.Group();
    const p = this.track.sample(this.track.total * s);
    const off = (this.fieldHW || this.track.halfWidth * 3) * 0.72;
    g.position.set(p.x + p.nx * off * side, FIELD_Y + p.y, p.z + p.nz * off * side);
    g.rotation.y = Math.atan2(p.tx, p.tz) + Math.PI;   // 楼体退到赛道外侧, 窗排朝赛道
    const hall = new THREE.Mesh(new THREE.BoxGeometry(11, 6.4, 46), paperMat('#f1e6cd'));
    hall.position.set(side * 5.6, 3.2, 0);
    hall.castShadow = true; hall.receiveShadow = true;
    g.add(hall); g.add(edgeLines(hall, 0x3a3226, 0.3));
    const roof = new THREE.Mesh(new THREE.BoxGeometry(13.4, 0.6, 48), paperMat('#3d6ea8'));
    roof.position.set(side * 5.0, 6.7, 0);
    roof.castShadow = true;
    g.add(roof); g.add(edgeLines(roof, 0x3a3226, 0.3));
    const cc = canvas2d(512, 128);
    const ctx = cc.g;
    ctx.fillStyle = '#efe4cb'; ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#41506b';
    for (let i = 0; i < 7; i++) ctx.fillRect(24 + i * 70, 24, 46, 56);
    ctx.fillStyle = '#c8553d'; ctx.fillRect(0, 98, 512, 30);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(46, 6.2),
      new THREE.MeshLambertMaterial({ map: tex(cc.c, 1, 1, 4), side: THREE.DoubleSide }));
    win.position.set(side * 0.08, 3.2, 0);
    win.rotation.y = side * -Math.PI / 2;
    g.add(win);
    return g;
  }

  // 远景: 三层纸雕远山 + 纸云 + 日轮 (按章节配色重建)
  buildScenery(ch) {
    if (this.scenery) {
      this.scene.remove(this.scenery);
      this.scenery.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    }
    const g = new THREE.Group();
    this.scenery = g;
    this.clouds = [];
    this.scene.add(g);
    const chGround = (ch && ch.ground) || '#afd5a2';
    const rnd = makeRng(2027);
    const night = !!(ch && ch.night);
    // 远山以「赛道自身的中心」为圆心, 半径再按赛道自身半径外推:
    // 各章赛道离原点的偏移可达 490m, 固定以原点为圆心 + 固定 600/860/1150 半径,
    // 会把剪纸山摆到路面上 (第 5 章那种绿色大山压赛道)。ms 同时缩放半径与高度, 视觉比例不变。
    const mt = this.trackMetrics();
    const ms = Math.max(1, (mt.selfR + 170) / 600);
    // 三层剪纸山: 远山(雪顶) / 中山(雪顶) / 近处圆丘, 全部是朝向赛道中心的平面剪影
    const layers = [
      { r: 1150 * ms, spread: 260 * ms, n: 14, h: 300 * ms, c: night ? '#4b3f66' : '#8ab4e0', snow: night ? '#ffc79a' : '#fdf8ec', round: false },
      { r: 860 * ms, spread: 210 * ms, n: 12, h: 225 * ms, c: night ? '#3d3357' : '#7396cd', snow: night ? '#f7a978' : '#fbf3e2', round: false },
      { r: 600 * ms, spread: 190 * ms, n: 15, h: 125 * ms, c: shade(chGround, -0.05), snow: null, round: true }
    ];
    for (const L of layers) {
      for (let i = 0; i < L.n; i++) {
        const a = (i / L.n) * Math.PI * 2 + rnd() * 0.3;
        const rad = L.r + rnd() * L.spread;
        const h = L.h * (0.55 + rnd() * 0.8);
        const w = h * (L.round ? 2.6 : 1.6);
        const grp = new THREE.Group();
        grp.add(this.flatHill(w, h, L.c, { round: L.round }));
        if (L.snow) {
          const cap = this.flatHill(w * 0.27, h * 0.42, L.snow, {});
          cap.position.set(0, h * 0.58, ms);
          grp.add(cap);
        }
        grp.position.set(mt.cx + Math.cos(a) * rad, -30, mt.cz + Math.sin(a) * rad);
        grp.lookAt(mt.cx, -30, mt.cz);
        g.add(grp);
      }
    }
    // 扁纸云
    const cloudMat = new THREE.MeshBasicMaterial({ color: night ? 0xffd3a6 : 0xfff9ea, transparent: true, opacity: 0.96, fog: false });
    for (let i = 0; i < 12; i++) {
      const cloud = new THREE.Group();
      const a = rnd() * Math.PI * 2, r = 300 + rnd() * 560;
      cloud.position.set(Math.cos(a) * r, 150 + rnd() * 170, Math.sin(a) * r);
      for (let j = 0; j < 3; j++) {
        const sz = 26 + rnd() * 30;
        const blob = new THREE.Mesh(new THREE.SphereGeometry(sz, 6, 4), cloudMat);
        blob.position.set((j - 1) * sz * 0.78, rnd() * 5, rnd() * 6);
        blob.scale.set(1, 0.34, 1);
        cloud.add(blob);
      }
      this.clouds.push({ obj: cloud, speed: 0.4 + rnd() * 0.9, r: r });
      g.add(cloud);
    }
    // 剪纸太阳 / 月亮
    const sun = this.paperSun(night);
    sun.position.set(-560, 330, -880);
    sun.lookAt(0, 330, 0);
    g.add(sun);
    const halo = new THREE.Mesh(new THREE.CircleGeometry(190, 32),
      new THREE.MeshBasicMaterial({ color: night ? 0xffc078 : 0xffe08a, fog: false, transparent: true, opacity: 0.20 }));
    halo.position.copy(sun.position);
    halo.lookAt(0, 330, 0);
    g.add(halo);
  }

  // 赛道在水平面上的中心与「自身半径」(离中心最远的采样点): 远山以此为圆心并据此外推
  trackMetrics() {
    if (!this.track) return { cx: 0, cz: 0, selfR: 0 };
    const step = Math.max(4, this.track.total / 240);
    let cx = 0, cz = 0, n = 0;
    for (let s = 0; s < this.track.total; s += step) { const p = this.track.sample(s); cx += p.x; cz += p.z; n++; }
    cx /= n; cz /= n;
    let selfR = 0;
    for (let s = 0; s < this.track.total; s += step) {
      const p = this.track.sample(s);
      selfR = Math.max(selfR, Math.hypot(p.x - cx, p.z - cz));
    }
    return { cx: cx, cz: cz, selfR: selfR };
  }

  // 平面剪影山 (round=true 就是圆丘), 朝向赛道中心
  flatHill(w, h, color, opts = {}) {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, 0);
    if (opts.round) {
      shape.lineTo(-w / 2, h * 0.34);
      shape.quadraticCurveTo(-w * 0.24, h * 1.04, 0, h * 1.04);
      shape.quadraticCurveTo(w * 0.24, h * 1.04, w / 2, h * 0.34);
      shape.lineTo(w / 2, 0);
    } else {
      shape.lineTo(-w * 0.17, h * 0.44);
      shape.lineTo(0, h);
      shape.lineTo(w * 0.21, h * 0.38);
      shape.lineTo(w / 2, 0);
    }
    shape.closePath();
    return new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
  }

  // 剪纸太阳: 尖角光芒 + 圆盘 + 亮芯
  paperSun(night) {
    const g = new THREE.Group();
    const rays = new THREE.Shape();
    const N = 14, Rr = 108, r = 70;
    for (let i = 0; i <= N * 2; i++) {
      const a = (i / (N * 2)) * Math.PI * 2;
      const rad = i % 2 ? Rr : r;
      const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
      if (i === 0) rays.moveTo(x, y); else rays.lineTo(x, y);
    }
    rays.closePath();
    const rayMesh = new THREE.Mesh(new THREE.ShapeGeometry(rays), new THREE.MeshBasicMaterial({ color: night ? 0xcdd8f0 : 0xf5c445, fog: false, side: THREE.DoubleSide }));
    const disc = new THREE.Mesh(new THREE.CircleGeometry(72, 32), new THREE.MeshBasicMaterial({ color: night ? 0xeef2ff : 0xffdf85, fog: false }));
    disc.position.z = 0.6;
    const core = new THREE.Mesh(new THREE.CircleGeometry(46, 24), new THREE.MeshBasicMaterial({ color: night ? 0xffffff : 0xfff3c0, fog: false }));
    core.position.z = 1.2;
    g.add(rayMesh); g.add(disc); g.add(core);
    return g;
  }

  // 木桌: 封面/菜单里立体书就摆在桌面上
  buildDesk() {
    const t = woodTexture();
    t.repeat.set(7, 7);
    const geo = new THREE.PlaneGeometry(1800, 1800);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: t }));
    mesh.position.set(0, 1.86, 0);
    mesh.receiveShadow = true;
    mesh.visible = false;
    this.desk = mesh;
    this.scene.add(mesh);
  }

  // 换章换赛道: 重建所有跟几何绑定的网格 (赛道路面 / 草地 / 起点线 / 装饰)
  setTrack(track) {
    this.track = track;
    if (this.trackGroup) {
      for (const child of this.trackGroup.children.slice()) child.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      this.trackGroup.clear();
    }
    this.buildTrack();
    this.buildField();
    if (this.chapter) this.buildDecor(this.chapter);
  }

  // 长条设施 (看台 / 维修楼) 的落位体检。
  // 这些模型有几十米长, 摆法是"平移到中心线点 + 沿法向偏移, 朝向切线", 所以在弯道内侧
  // 或赛道折回来的地方会整个横跨到路面上 (第七章 74% 处的看台曾压路 7.7 m)。
  // 落位必须同时满足:
  //   直 = 模型全长覆盖范围内, 赛道最小转弯半径 >= fac.minR —— 转弯角度大的地方不放长模型
  //   空 = 按真实朝向摆好的矩形底面 (长 fac.len, 内侧 fac.din / 外侧 fac.dout) 上每个采样点,
  //        到"整条赛道"的横向距离 >= 路面半宽 + fac.minClear
  facilityClear(fac, s, side) {
    const T = this.track, hw = T.halfWidth, off = fac.off;
    const p = T.sample(s);
    let minLat = Infinity;
    for (let i = 0; i <= 10; i++) {
      const lz = -fac.len / 2 + fac.len * (i / 10);
      for (let j = 0; j <= 4; j++) {
        const lx = side * (off + fac.din + (fac.dout - fac.din) * (j / 4));
        // 组的局部 x 轴 = 法向, 局部 z 轴 = -切线 (THREE 的 Y 旋转: a = atan2(tx,tz)+PI)
        const lat = Math.abs(T.project(p.x + p.nx * lx - p.tx * lz, p.z + p.nz * lx - p.tz * lz).lateral);
        if (lat < minLat) minLat = lat;
      }
    }
    let maxK = 0;
    for (let d = -fac.len / 2 - 2; d <= fac.len / 2 + 2; d += 2) maxK = Math.max(maxK, T.curvatureAt(s + d));
    return { clear: minLat - hw, R: maxK > 0 ? 1 / maxK : Infinity };
  }

  // 从 hintS 起沿赛道找第一个合格落位 (先试原来的那一侧, 不行才换边); 找不到就返回 null
  facilitySpot(fac, hintS, side, used) {
    const T = this.track;
    for (const sd of [side, -side]) {
      let best = null;
      for (let d = 0; d < T.total; d += 2) {
        const s = (hintS + d) % T.total;
        let clash = false;
        for (const u of used) {
          const raw = Math.abs(u.s - s) % T.total;
          const gap = Math.min(raw, T.total - raw);
          if (gap < (u.len + fac.len) / 2 + 16) { clash = true; break; }
        }
        if (clash) continue;
        const r = this.facilityClear(fac, s, sd);
        if (r.R < fac.minR || r.clear < fac.minClear) continue;
        if (!best || d < best.d) best = { s, side: sd, d };
      }
      if (best) return best;
    }
    return null;
  }

  // 剪纸装饰: 树 / 花 / 章节布景
  buildDecor(chapter) {
    if (this.decor) { this.scene.remove(this.decor); }
    const decor = new THREE.Group();
    this.decor = decor;
    this.scene.add(decor);
    const ch = this.chapter;
    const rnd = makeRng(4242);
    const treeGeo = crossPlane(1, 1);
    const flowerGeo = crossPlane(1, 1);
    const treePlacements = [], flowerPlacements = [];
    for (let s = 0; s < this.track.total; s += 3.2) {
      for (const side of [-1, 1]) {
        const roll = rnd();
        const p = this.track.sample(s + rnd() * 3);
        // 立牌一律要求离"整条赛道"都有余量: 赛道折回来时, 只按本路段偏移会把树/花摆到另一段路面上
        if (roll > 0.58) {
          const ratio = side * (1.55 + rnd() * 1.1);
          const tx = p.x + p.nx * ratio * this.track.halfWidth, tz = p.z + p.nz * ratio * this.track.halfWidth;
          if (Math.abs(this.track.project(tx, tz).lateral) < this.track.halfWidth + 3.5) continue;
          treePlacements.push({ x: tx, z: tz, y: p.y, k: 0.75 + rnd() * 0.8, hue: rnd() });
        } else if (roll > 0.24) {
          const ratio = side * (1.30 + rnd() * 0.50);
          const fx = p.x + p.nx * ratio * this.track.halfWidth, fz = p.z + p.nz * ratio * this.track.halfWidth;
          if (Math.abs(this.track.project(fx, fz).lateral) < this.track.halfWidth + 2.2) continue;
          flowerPlacements.push({ x: fx, z: fz, y: p.y, k: 1.0 + rnd() * 1.0, hue: rnd() });
        }
      }
    }
    const treeMat = new THREE.MeshBasicMaterial({ map: treeTexture(), alphaTest: 0.5, side: THREE.DoubleSide });
    const trees = new THREE.InstancedMesh(treeGeo, treeMat, Math.max(1, treePlacements.length));
    trees.castShadow = false; trees.receiveShadow = false;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), pv = new THREE.Vector3(), sc = new THREE.Vector3();
    const col = new THREE.Color();
    const treeBase = ['#ffffff', '#f4f8ee', '#eaf2e2', '#fbfdf8'];
    treePlacements.forEach((t, i) => {
      const h = 4.4 * t.k, w = 3.4 * t.k;
      pv.set(t.x, FIELD_Y - 0.1 + (t.y || 0), t.z); sc.set(w, h, w);
      q.setFromEuler(new THREE.Euler(0, t.hue * 6.28, 0));
      m.compose(pv, q, sc);
      trees.setMatrixAt(i, m);
      col.set(treeBase[Math.floor(t.hue * treeBase.length) % treeBase.length]);
      if (ch && ch.night) col.multiplyScalar(0.44);
      trees.setColorAt(i, col);
    });
    trees.count = treePlacements.length;
    trees.instanceMatrix.needsUpdate = true;
    if (trees.instanceColor) trees.instanceColor.needsUpdate = true;
    decor.add(trees);

    const flowerMat = new THREE.MeshBasicMaterial({ map: daisyTexture(), alphaTest: 0.5, side: THREE.DoubleSide });
    const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, Math.max(1, flowerPlacements.length));
    const hues = ['#ffffff', '#fdf7e6', '#fffaf0', '#f4eeda'];
    flowerPlacements.forEach((t, i) => {
      pv.set(t.x, FIELD_Y - 0.06 + (t.y || 0), t.z); sc.set(t.k * 1.5, t.k * 1.9, t.k * 1.5);
      q.setFromEuler(new THREE.Euler(0, t.hue * 6.28, 0));
      m.compose(pv, q, sc);
      flowers.setMatrixAt(i, m);
      col.set(hues[Math.floor(t.hue * hues.length) % hues.length]);
      if (ch && ch.night) col.multiplyScalar(0.50);
      flowers.setColorAt(i, col);
    });
    flowers.count = flowerPlacements.length;
    flowers.instanceMatrix.needsUpdate = true;
    if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
    decor.add(flowers);

    // 剪纸小屋: 赛道外围的纸房子 (三种配色, 平立牌)
    const houseBins = [[], [], []];
    const hrand = makeRng(913);
    for (let s = 0; s < this.track.total; s += 22) {
      for (const side of [-1, 1]) {
        if (hrand() > 0.46) continue;
        const ratio = side * (2.35 + hrand() * 1.5);
        const hp = this.track.sample(s + hrand() * 14);
        const hx = hp.x + hp.nx * ratio * this.track.halfWidth, hz = hp.z + hp.nz * ratio * this.track.halfWidth;
        // 房子是 10.6m 宽的平立牌: 除了本路段, 还要跟折回来的那一整条赛道留出 8m 余量, 否则会挡在路面上
        if (Math.abs(this.track.project(hx, hz).lateral) < this.track.halfWidth + 8) continue;
        houseBins[Math.floor(hrand() * 3) % 3].push({
          x: hx,
          z: hz,
          y: hp.y || 0, k: 0.8 + hrand() * 0.55,
          rot: Math.atan2(-side * hp.nx, -side * hp.nz) + (hrand() - 0.5) * 0.24   // 门面朝赛道
        });
      }
    }
    houseBins.forEach((list, vi) => {
      if (!list.length) return;
      const hMat = new THREE.MeshBasicMaterial({ map: houseTexture(vi), alphaTest: 0.5, side: THREE.DoubleSide });
      const houses = new THREE.InstancedMesh(crossPlane(1, 1), hMat, list.length);
      list.forEach((t, i) => {
        const hh = 9.6 * t.k, ww = 10.6 * t.k;
        pv.set(t.x, FIELD_Y - 0.1 + t.y, t.z); sc.set(ww, hh, ww);
        q.setFromEuler(new THREE.Euler(0, t.rot, 0));
        m.compose(pv, q, sc);
        houses.setMatrixAt(i, m);
        col.set('#ffffff');
        if (ch && ch.night) col.multiplyScalar(0.52);
        houses.setColorAt(i, col);
      });
      houses.count = list.length;
      houses.instanceMatrix.needsUpdate = true;
      if (houses.instanceColor) houses.instanceColor.needsUpdate = true;
      decor.add(houses);
    });

    // 赛道设施 + 地标: 位置不能写死, 见 facilityClear / facilitySpot。
    // (原来第二章还有两座「拱桥」= 半个圆环 TorusGeometry, 立在赛道上看着就是插了个半圆, 已删除)
    this.furnMat = [];
    const hw = this.track.halfWidth;
    const fhw = this.fieldHW || hw * 3;
    const plan = [
      // [名字, 底面尺寸(长/内侧深度/外侧深度) 与落位门槛, 参考进度, 原侧, 构造器]
      ['pit', { len: 48, din: -2.0, dout: 11.8, minR: 45, minClear: 2.5, off: fhw * 0.72 }, 0.905, 1,
        (s, side) => this.makePit(s, side)],
      ['stand-a', { len: 31, din: -0.5, dout: 9.6, minR: 60, minClear: 3.0, off: fhw * 0.80 }, 0.075, -1,
        (s, side) => this.makeGrandstand(s, side)],
      ['stand-b', { len: 31, din: -0.5, dout: 9.6, minR: 60, minClear: 3.0, off: fhw * 0.80 }, 0.42, 1,
        (s, side) => this.makeGrandstand(s, side)],
      ['stand-c', { len: 31, din: -0.5, dout: 9.6, minR: 60, minClear: 3.0, off: fhw * 0.80 }, 0.74, -1,
        (s, side) => this.makeGrandstand(s, side)],
      ['windmill', { len: 7, din: -3.0, dout: 3.0, minR: 40, minClear: 1.5, off: hw * 1.7 }, 0.62, 1,
        (s, side) => this.makeWindmill(s, side)]
    ];
    const placed = [];
    for (const [tag, fac, hint, side, make] of plan) {
      const spot = this.facilitySpot(fac, hint * this.track.total, side, placed);
      if (!spot) continue;                       // 整圈都找不到干净位置: 宁可不放, 也不压到路上
      placed.push({ s: spot.s, len: fac.len });
      const grp = make(spot.s / this.track.total, spot.side);
      if (!grp) continue;
      grp.traverse(o => {
        const mt = o.material;
        if (mt && mt.color && this.furnMat.indexOf(mt) < 0) this.furnMat.push(mt);
      });
      grp.userData.facility = tag;
      decor.add(grp);
    }
    this.applyNightDecor(!!this.nightOn);
  }

  makeWindmill(s, side = 1) {
    const g = new THREE.Group();
    const p = this.track.sample(this.track.total * s);
    const off = this.track.halfWidth * 1.7;
    g.position.set(p.x + p.nx * off * side, FIELD_Y + p.y, p.z + p.nz * off * side);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.6, 11, 6, 1), paperMat('#f7f1e3'));
    tower.position.y = 5.5; tower.castShadow = true; tower.receiveShadow = true;
    g.add(tower); g.add(edgeLines(tower, 0x3a3226, 0.35));
    const hub = new THREE.Group();
    hub.position.set(0, 9.6, 0);
    const blade = new THREE.PlaneGeometry(0.9, 6.4);
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(blade, paperMat('#e8d9b5', { side: THREE.DoubleSide }));
      b.position.set(Math.cos(i * Math.PI / 2) * 3.2, Math.sin(i * Math.PI / 2) * 3.2, 0);
      b.rotation.z = i * Math.PI / 2;
      b.castShadow = true;
      hub.add(b);
    }
    g.add(hub);
    g.userData.spin = hub;
    return g;
  }

  setChapter(key) {
    const ch = chapterByKey(key);
    this.chapterKey = (ch && ch.key) || key;
    this.chapter = key;
    const paper = (ch && ch.paper) || '#f7f1e3';
    const ground = (ch && ch.ground) || '#cfe3b4';
    const accent = (ch && ch.accent) || '#c8553d';
    const sky = (ch && ch.sky) || '#e9e2d2';
    if (this.roadMat) {
      if (this.roadMat.map) this.roadMat.map.dispose();
      this.roadMat.map = roadTexture({ paper: paper, accent: accent });
      this.roadMat.color.set(0xffffff);
      this.roadMat.needsUpdate = true;
    }
    if (this.groundMat) this.groundMat.color.set(shade(ground, -0.04));
    if (this.fieldMat) {
      if (this.fieldMat.map) this.fieldMat.map.dispose();
      this.fieldMat.map = fieldTexture({ ground: ground });
      this.fieldMat.color.set(0xffffff);
      this.fieldMat.needsUpdate = true;
    }
    this.skyMat.map = skyTexture(shade(sky, -0.34), shade(sky, 0.10));
    this.skyMat.needsUpdate = true;
    // 背景色 = 天空渐变顶端, 穹顶之外不会露出黑边
    if (this.scene.background && this.scene.background.set) this.scene.background.set(shade(sky, 0.10));
    if (this.scene.fog) this.scene.fog.color.set(shade(sky, 0.16));
    const night = !!(ch && ch.night);
    this.nightOn = night;
    // 2026-10 改版配色: 阳光偏暖偏亮、环境光暖白、雾更薄; 夜色做成暖黄昏而不是冷蓝夜
    if (this.sun) { this.sun.color.set(night ? 0xffb877 : 0xfff0cf); this.sun.intensity = night ? 0.70 : 1.45; }
    if (this.hemi) { this.hemi.intensity = night ? 0.58 : 0.58; this.hemi.color.set(night ? 0xff9c66 : 0xfff6e4); this.hemi.groundColor.set(night ? 0x4a3550 : 0xb99a6b); }
    if (this.scene.fog) this.scene.fog.density = night ? 0.00085 : 0.00034;
    if (this.fieldMesh) this.buildDecor(key);
    this.buildScenery(ch);
    this.propsKey = key;
    this.applyNightDecor(night);
  }

  // 夜景补光: 看台/维修楼这类大体量纸盒在弱光下会糊成一堵黑墙, 抬基础色并给一点自发光
  applyNightDecor(night) {
    const list = this.furnMat || [];
    for (let i = 0; i < list.length; i++) {
      const mt = list[i];
      if (!mt.__base) mt.__base = mt.color.clone();
      mt.color.copy(mt.__base).multiplyScalar(night ? 1.45 : 1.0);
      if (mt.emissive) mt.emissive.set(night ? 0x252c46 : 0x000000);
      mt.needsUpdate = true;
    }
  }

  createKart(kart) {
    const g = buildKartMesh(kart, this.shared);
    this.scene.add(g);
    this.kartMeshes.set(kart, g);
    return g;
  }

  syncKart(kart, dt) {
    const g = this.kartMeshes.get(kart);
    if (!g) return;
    const u = updateKartVisual(g, kart, dt);
    const ky = this.track.heightAt(kart.s || 0);      // 车贴着纸带高程走
    kart.y = ky;
    g.position.set(kart.x, ky, kart.z);
    g.rotation.set(0, kart.heading - Math.PI / 2, 0);
    const ch = u.chassis;
    const bank = kart.input && kart.input.steer ? -kart.input.steer * 0.07 * Math.min(1, Math.abs(kart.speed) / 14) : 0;
    ch.rotation.x += (bank - ch.rotation.x) * Math.min(1, dt * 6);
    const accelPitch = kart.input && kart.input.throttle ? -0.02 : (kart.input && kart.input.brake ? 0.035 : 0);
    ch.rotation.z += (accelPitch - ch.rotation.z) * Math.min(1, dt * 6);
    ch.position.y = u.lift;
    const cam = this.camera.position;
    u.card.lookAt(cam.x, g.position.y + 1.4, cam.z);
  }

  updateCamera(dt, player, opts) {
    opts = opts || {};
    const h = player.heading;
    const fx = Math.sin(h), fz = Math.cos(h);
    const vf = Math.max(0, Math.min(1.3, player.speed / 30));
    const back = 7.6 + vf * 2.4;
    const up = 3.5 + vf * 0.5;
    const dx = player.x - fx * back, dz = player.z - fz * back;
    const dy = (player.y || 0) + up;
    const k = 1 - Math.pow(0.0009, dt);
    if (Math.hypot(this.camPos.x - dx, this.camPos.z - dz) > 26) {
      this.camPos.set(dx, dy, dz);      // 复位/传送时硬切, 不要拉丝
    } else {
      this.camPos.lerp(new THREE.Vector3(dx, dy, dz), k);
    }
    const la = 6.5 + vf * 7;
    const lx = player.x + fx * la, lz = player.z + fz * la;
    const ly = (player.y || 0) + 1.1;
    this.camLook.lerp(new THREE.Vector3(lx, ly, lz), 1 - Math.pow(0.0016, dt));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    const fov = 56 + vf * 9;
    if (Math.abs(this.camera.fov - fov) > 0.05) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
  }

  update(dt, world, player) {
    this.clock += dt;
    if (this.trackGroup && !this.trackGroup.visible) this.trackGroup.visible = true;
    if (this.decor && !this.decor.visible) this.decor.visible = true;
    if (this.scenery && !this.scenery.visible) this.scenery.visible = true;
    if (this.desk) this.desk.visible = false;
    if (this.clouds) {
      for (const c of this.clouds) {                 // 纸云慢慢飘
        c.obj.position.x += c.speed * dt * 1.2;
        if (c.obj.position.x > 1000) c.obj.position.x = -1000;
      }
    }
    if (!world || !player) return;
    for (const k of world.karts) this.syncKart(k, dt);
    if (this.decor) {
      for (const child of this.decor.children) {
        if (child.userData && child.userData.spin) child.userData.spin.rotation.z += dt * 1.1;
      }
    }
    // 太阳跟着玩家走, 保证阴影始终清晰
    this.sun.position.set(player.x + this.sunOffset.x, this.sunOffset.y, player.z + this.sunOffset.z);
    this.sun.target.position.set(player.x, 0, player.z);
    this.sun.target.updateMatrixWorld();
    this.updateCamera(dt, player);
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}