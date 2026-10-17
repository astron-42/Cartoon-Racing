
import io
p = r"D:/DSH-projects/paper-racing/src/render/game.js"
s = io.open(p, encoding="utf-8").read()
old = "' body=' + (function(){ var g = this.scene.kartMeshes.get(p); if(!g) return '-'; var o=[]; g.traverse(function(m){ if(m.material && m.material.color && o.length<10) o.push(m.material.color.getHexString()); }); return o.join('/'); }).call(this) : '') +"
new = "' body=' + this.bodyHex(p) : '') +"
assert s.count(old) == 1
s = s.replace(old, new)
anchor = "  updateDiag() {"
assert s.count(anchor) == 1
helper = """  // 玩家车身当前颜色 (调试用: 应等于所选车辆色, 否则说明车辆色没接上车模)
  bodyHex(p) {
    const g = p && this.scene ? this.scene.kartMeshes.get(p) : null;
    if (!g) return '-';
    let out = '-';
    g.traverse(function (o) { if (out === '-' && o.material && o.material.color) out = o.material.color.getHexString(); });
    return out;
  }

"""
s = s.replace(anchor, helper + anchor)
io.open(p, "w", encoding="utf-8").write(s)
print("patched")
