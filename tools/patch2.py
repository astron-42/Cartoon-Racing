
import io
p = r"D:/DSH-projects/paper-racing/src/render/game.js"
s = io.open(p, encoding="utf-8").read()
old = "            self.diagEl.textContent = 'flow OK state=' + self.state + ' chapter=' + self.sel.chapter + ' racer=' + self.sel.racer + ' vehicle=' + self.sel.vehicle;"
new = "            var line = 'flow OK state=' + self.state + ' chapter=' + self.sel.chapter + ' racer=' + self.sel.racer + ' vehicle=' + self.sel.vehicle;\n            self.diagEl.setAttribute('data-flow', line);   // 诊断行每帧会被 updateDiag 覆盖, 用属性留存\n            self.diagEl.textContent = line;"
assert s.count(old) == 1
io.open(p, "w", encoding="utf-8").write(s.replace(old, new))
print("patched game.js")
