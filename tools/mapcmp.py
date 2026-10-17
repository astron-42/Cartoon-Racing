
from PIL import Image, ImageDraw
root = r"D:/DSH-projects/paper-racing/shots/"
names = ["f5_race", "f6_night"]
box = (10, 500, 200, 720)
ims = [Image.open(root + n + ".png").crop(box).convert("RGB") for n in names]
w, h = ims[0].size
out = Image.new("RGB", (w * len(ims) + 20, h), (30, 30, 30))
d = ImageDraw.Draw(out)
for i, im in enumerate(ims):
    out.paste(im, (i * (w + 20), 0))
    d.text((i * (w + 20) + 4, 4), names[i], fill=(255, 255, 0))
out = out.resize((out.width * 2, out.height * 2), Image.LANCZOS)
out.save(root + "map_compare.png")
print(out.size)
