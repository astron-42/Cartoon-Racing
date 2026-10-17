
from PIL import Image
for name in ["z1_rush","z2_grip","z3_bal"]:
    im = Image.open("D:/DSH-projects/paper-racing/shots/%s.png" % name).convert("RGB")
    c = im.crop((420, 380, 900, 720)).resize((960, 680), Image.NEAREST)
    c.save("D:/DSH-projects/paper-racing/shots/crop_%s.png" % name)
    print("saved", name)
