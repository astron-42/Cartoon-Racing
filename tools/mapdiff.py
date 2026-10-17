
from PIL import Image, ImageChops
root = r"D:/DSH-projects/paper-racing/shots/"
box = (10, 520, 190, 720)
ims = {n: Image.open(root + n + ".png").crop(box) for n in ["f5_race", "f6_night"]}
for n, im in ims.items():
    im.save(root + "map_" + n + ".png")
d = ImageChops.difference(ims["f5_race"], ims["f6_night"])
bb = d.getbbox()
import statistics
px = list(d.convert("L").getdata())
print("diff bbox", bb, "mean", round(statistics.fmean(px), 2), "max", max(px))
