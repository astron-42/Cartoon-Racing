
import io

def rd(p): return io.open(p, encoding="utf-8").read()
def wr(p, s): io.open(p, "w", encoding="utf-8", newline="\n").write(s)

# ---------- A. scene.js: 删掉故事书模型 ----------
p = r"D:/DSH-projects/paper-racing/src/render/scene.js"
s = rd(p)
a = "    this.buildBook();\n"
assert s.count(a) == 1, "buildBook call"
s = s.replace(a, "")

i = s.index("  // 立体书封面: 封面 + 内页 + 书脊")
j = s.index("  // 菜单/封面状态下的镜头与动画 (无 world 时每帧调用)")
assert i < j
s = s[:i] + s[j:]

blk = """    if (this.book) {
      const k = 1 - Math.pow(0.004, Math.max(0.0001, dt));
      this.bookOpen += (this.bookTarget - this.bookOpen) * k;
      this.bookLid.rotation.y = this.bookOpen * 2.62;
      this.book.position.y = 5.9 + Math.sin(this.clock * 0.8) * 0.1;
      this.book.rotation.y = Math.sin(this.clock * 0.26) * 0.12 - this.bookOpen * 0.2;
    }
"""
assert s.count(blk) == 1, "book update block"
s = s.replace(blk, "")

a = "25.2 - n * 9.2 + this.bookOpen * 4.2"
assert s.count(a) == 1
s = s.replace(a, "25.2 - n * 9.2")
a = "const fov = 42 - this.bookOpen * 5;"
assert s.count(a) == 1
s = s.replace(a, "const fov = 42;")

# ---------- D. scene.js: 装饰立牌不许落在赛道上 ----------
a = """        if (roll > 0.58) {
          const ratio = side * (1.55 + rnd() * 1.1);
          treePlacements.push({ x: p.x + p.nx * ratio * this.track.halfWidth, z: p.z + p.nz * ratio * this.track.halfWidth, y: p.y, k: 0.75 + rnd() * 0.8, hue: rnd() });
        } else if (roll > 0.24) {
          const ratio = side * (1.05 + rnd() * 0.42);
          flowerPlacements.push({ x: p.x + p.nx * ratio * this.track.halfWidth, z: p.z + p.nz * ratio * this.track.halfWidth, y: p.y, k: 1.0 + rnd() * 1.0, hue: rnd() });
        }"""
assert s.count(a) == 1, "tree/flower block"
b = """        // 立牌一律要求离"整条赛道"都有余量: 赛道折回来时, 只按本路段偏移会把树/花摆到另一段路面上
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
        }"""
s = s.replace(a, b)

a = """        const ratio = side * (2.35 + hrand() * 1.5);
        const hp = this.track.sample(s + hrand() * 14);
        houseBins[Math.floor(hrand() * 3) % 3].push({
          x: hp.x + hp.nx * ratio * this.track.halfWidth,
          z: hp.z + hp.nz * ratio * this.track.halfWidth,"""
assert s.count(a) == 1, "house block"
b = """        const ratio = side * (2.35 + hrand() * 1.5);
        const hp = this.track.sample(s + hrand() * 14);
        const hx = hp.x + hp.nx * ratio * this.track.halfWidth, hz = hp.z + hp.nz * ratio * this.track.halfWidth;
        // 房子是 10.6m 宽的平立牌: 除了本路段, 还要跟折回来的那一整条赛道留出 8m 余量, 否则会挡在路面上
        if (Math.abs(this.track.project(hx, hz).lateral) < this.track.halfWidth + 8) continue;
        houseBins[Math.floor(hrand() * 3) % 3].push({
          x: hx,
          z: hz,"""
s = s.replace(a, b)
wr(p, s)
print("scene.js ok, book refs left:", s.count("bookOpen") + s.count("bookLid"))

# ---------- B. paper.js: 删掉封面/书页贴图 ----------
p = r"D:/DSH-projects/paper-racing/src/render/paper.js"
s = rd(p)
i = s.index("// 立体书封面贴图:")
j = s.index("// 十字交叉的立牌几何")
assert i < j
s = s[:i] + s[j:]
wr(p, s)
print("paper.js ok, coverTexture left:", s.count("coverTexture"), "pageTexture left:", s.count("pageTexture"))

# ---------- C. game.js: 不再翻开立体书 + 八章全开 ----------
p = r"D:/DSH-projects/paper-racing/src/render/game.js"
s = rd(p)
a = "    if (this.scene && this.scene.openBook) this.scene.openBook();   // 直接进向导: 立体书自动翻开\n"
assert s.count(a) == 1
s = s.replace(a, "")
a = """      const keys = chapterKeys();
      const ok = keys.filter((k, n) => n === 0 || (this.progress.cleared && this.progress.cleared[keys[0]]));
      let i = ok.indexOf(this.sel.chapter); i = (i + dir + ok.length) % ok.length;
      this.sel.chapter = ok[i];"""
assert s.count(a) == 1, "cycleSel lock"
b = """      const keys = chapterKeys();   // 八章全部开放 (旧的"通关解锁"规则已删, 现在选章节是自由选择)
      let i = keys.indexOf(this.sel.chapter); i = (i + dir + keys.length) % keys.length;
      this.sel.chapter = keys[i];"""
s = s.replace(a, b)
a = """      const keys = chapterKeys();
      const locked = keys.indexOf(v) > 0 && !(this.progress.cleared && this.progress.cleared[keys[0]]);
      if (locked) { this.hud.toast('先通关上一章'); return; }
      this.sel.chapter = v;"""
assert s.count(a) == 1, "chapter lock"
b = """      if (chapterKeys().indexOf(v) < 0) return;   // 八章全开, 只挡非法值
      this.sel.chapter = v;"""
s = s.replace(a, b)
wr(p, s)
print("game.js ok, openBook left:", s.count("openBook"), "locked left:", s.count("locked("))
