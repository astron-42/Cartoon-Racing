// 卡通竞速 · 纸偶赛车 (挖剪卡片 + 折线描边 + 纸偶立绘)

// 车身侧视轮廓 → 沿 Z 挤出成一张厚纸
function carBodyGeometry(len = 2.25, wid = 0.95) {
  const s = new THREE.Shape();
  s.moveTo(-1.05, 0.16);
  s.lineTo(0.98, 0.10);
  s.lineTo(1.10, 0.30);
  s.lineTo(0.46, 0.44);
  s.lineTo(0.08, 0.76);
  s.lineTo(-0.52, 0.80);
  s.lineTo(-1.02, 0.46);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: wid, bevelEnabled: false, curveSegments: 1 });
  g.translate(0, 0, -wid * 0.5);
  g.computeVertexNormals();
  return g;
}

function wheelGeometry(r = 0.30, w = 0.22) {
  const g = new THREE.CylinderGeometry(r, r, w, 10, 1);
  g.rotateX(Math.PI * 0.5); // 轮轴沿 Z (车宽方向)
  return g;
}

// 造一台车: 返回 group, userData 里带轮子/立绘, 供每帧更新
function buildKartMesh(kart, shared) {
  const racer = kart.racer;
  const g = new THREE.Group();
  // 玩家车用所选车辆的车身色(三台车一色一款), 七台 AI 仍用各自车手的颜色, 便于辨认
  const bodyCol = (kart.isPlayer && kart.vehicle && kart.vehicle.color) ? kart.vehicle.color : (racer.body || '#e8b4a0');
  const body = new THREE.Mesh(shared.bodyGeo, paperMat(bodyCol));
  body.castShadow = true; body.receiveShadow = true;
  g.add(body);
  g.add(edgeLines(body));

  // 座舱纸片 (对比色)
  const cabin = new THREE.Mesh(shared.cabinGeo, paperMat(racer.belly || '#fdf3e6'));
  cabin.position.set(-0.18, 0.42, 0);
  cabin.castShadow = true;
  g.add(cabin);
  g.add(edgeLines(cabin, 0x3a3226, 0.4));

  const wheels = [];
  const dark = paperMat(0x40382c);
  for (const [wx, wz] of [[0.66, 0.5], [0.66, -0.5], [-0.62, 0.5], [-0.62, -0.5]]) {
    const w = new THREE.Mesh(shared.wheelGeo, dark);
    w.position.set(wx, 0.30, wz);
    w.castShadow = true;
    g.add(w);
    wheels.push(w);
  }

  const card = new THREE.Mesh(
    shared.cardGeo,
    new THREE.MeshLambertMaterial({ map: driverCardTexture(racer), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide })
  );
  card.position.set(-0.22, 1.02, 0);
  g.add(card);

  // 内层 chassis: 侧倾/俯仰/抬升都作用在这一层, 外层只负责位置与朝向
  const chassis = new THREE.Group();
  while (g.children.length) chassis.add(g.children[0]);
  g.add(chassis);
  g.userData = { chassis, wheels, card, bodyMat: body.material, tilt: 0, lift: 0, pitch: 0 };
  return g;
}

// 每帧把逻辑状态画到纸偶上 (位置/朝向由 scene 侧统一换算)
function updateKartVisual(group, kart, dt) {
  const u = group.userData;
  const spin = kart.speed / 0.30 * dt;
  for (const w of u.wheels) w.rotation.z -= spin;
  // 转向侧倾 (漂移与跳跃已移除)
  const targetTilt = kart.input && kart.input.steer ? -kart.input.steer * 0.06 : 0;
  u.tilt += (targetTilt - u.tilt) * Math.min(1, dt * 6);
  // 车身回落到纸面 (不再起跳)
  u.lift += (0 - u.lift) * Math.min(1, dt * 12);
  return u;
}
