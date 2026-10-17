
from PIL import Image
im = Image.open(r"D:/DSH-projects/paper-racing/shots/f1_step1.png")
print(im.size)
box = (470, 300, 880, 520)
im.crop(box).resize((820, 440), Image.LANCZOS).save(r"D:/DSH-projects/paper-racing/shots/crop_f1.png")
print("saved")
