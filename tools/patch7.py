
import io
p = r"D:/DSH-projects/paper-racing/src/render/game.js"
s = io.open(p, encoding="utf-8").read()
a = """      const self = this;
      let guard = 0;"""
assert s.count(a) == 1
b = """      const self = this;
      const fch = hash.match(/ch=?(ch\d)/);   // #flow&ch=ch5: 从第 5 章开始走向导, 用来验证换章换赛道/换小地图
      if (fch && CHAPTERS.some(c => c.key === fch[1])) {
        self.sel.chapter = fch[1];
        self.scene.setChapter(fch[1]);
        self.hud.screen('select', self.selectData());
      }
      let guard = 0;"""
io.open(p, "w", encoding="utf-8", newline="\n").write(s.replace(a, b))
print("flow ch support added")
