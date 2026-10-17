
import io
p = r"D:/DSH-projects/paper-racing/src/core/constants.js"
s = io.open(p, encoding="utf-8").read()
a = "(再按加速属性/克重修正)"
assert s.count(a) == 1
s = s.replace(a, "(再按加速属性与所选车辆修正)")
b = "  weightStep: 0.03,       // 每档克重的 AI 强度差\n"
assert s.count(b) == 1
s = s.replace(b, "")
io.open(p, "w", encoding="utf-8").write(s)
print("cleaned constants.js")
