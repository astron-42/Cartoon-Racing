
import io
p = r"D:/DSH-projects/paper-racing/src/render/game.js"
s = io.open(p, encoding="utf-8").read()
old = "      (this.errors.length ? ' ERR=' + this.errors.slice(-2).join(' | ') : '');"
new = "      ' mt=' + (this.hud && this.hud.track ? Math.round(this.hud.track.total) : -1) + ' tt=' + Math.round(this.track.total) +\n      (this.errors.length ? ' ERR=' + this.errors.slice(-2).join(' | ') : '');"
assert s.count(old) == 1
io.open(p, "w", encoding="utf-8").write(s.replace(old, new))
print("probe added")
