
from PIL import Image, ImageDraw
root = r"D:/DSH-projects/paper-racing/shots/"
names = ["m_ch1", "m_ch2", "m_ch4", "m_ch5"]
box = (14, 512, 196, 716)
ims = []
for n in names:
    im = Image.open(root + n + ".png").crop(box).convert("RGB")
    d = ImageDraw.Draw(im); d.text((4, 2), n, fill=(200, 30, 30)); d.rectangle([0,0,im.width-1,im.height-1], outline=(120,120,120))
    ims.append(im)
w, h = ims[0].size
out = Image.new("RGB", (w * len(ims) + 12 * (len(ims)-1), h), (25, 25, 25))
for i, im in enumerate(ims):
    out.paste(im, (i * (w + 12), 0))
out.save(root + "map_strip.png")
print(out.size)
