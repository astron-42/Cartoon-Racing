
from PIL import Image
cols = {"rush": (0xE4,0x57,0x2E), "grip": (0x3D,0x6E,0xA8), "bal": (0x6F,0xA9,0x6B)}
for name in ["z1_rush","z2_grip","z3_bal"]:
    im = Image.open("D:/DSH-projects/paper-racing/shots/%s.png" % name).convert("RGB")
    px = im.load(); w,h = im.size
    out=[]
    for k,c in cols.items():
        cnt=0; minx=w; maxx=-1; miny=h; maxy=-1
        for y in range(0,h,2):
            for x in range(0,w,2):
                r,g,b = px[x,y]
                if abs(r-c[0])<16 and abs(g-c[1])<16 and abs(b-c[2])<16:
                    cnt+=1
                    if x<minx: minx=x
                    if x>maxx: maxx=x
                    if y<miny: miny=y
                    if y>maxy: maxy=y
        out.append("%s=%d bbox(%s,%s,%s,%s)" % (k, cnt, minx, maxx, miny, maxy))
    print(name, " | ".join(out))
