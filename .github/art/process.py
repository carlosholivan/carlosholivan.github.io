"""Download story-mode character art and turn it into web portraits.
.github/art/jobs.json: [{"url": ..., "app": "chino", "id": "mei"}]  (one image = one character, plain light background)
Writes <app>-app/data/story/img/<id>.webp: background removed (flood fill from the borders), trimmed, max 640 px."""
import json, os, sys, urllib.request, io
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

jobs = json.load(open('.github/art/jobs.json'))
for j in jobs:
    out = f"{j['app']}-app/data/story/img/{j['id']}.webp"
    if os.path.exists(out) and not j.get('force'):
        continue
    raw = urllib.request.urlopen(urllib.request.Request(j['url'], headers={'User-Agent': 'Mozilla/5.0'}), timeout=60).read()
    im = Image.open(io.BytesIO(raw)).convert('RGB')
    os.makedirs('.github/art/preview', exist_ok=True)
    pv = im.copy(); pv.thumbnail((900, 900)); pv.save(f".github/art/preview/{j['app']}-{j['id']}.jpg", quality=80)
    w, h = im.size
    # flood-fill the plain background from every border pixel (tolerant to soft gradients)
    a = np.asarray(im).astype(int)
    mask = Image.new('L', (w, h), 0)
    seed_img = im.copy()
    for x, y in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (0, h // 2), (w - 1, h // 2)]:
        ImageDraw.floodfill(seed_img, (x, y), (255, 0, 255), thresh=38)
    s = np.asarray(seed_img).astype(int)
    bg = (s[:, :, 0] == 255) & (s[:, :, 1] == 0) & (s[:, :, 2] == 255)
    alpha = Image.fromarray(np.where(bg, 0, 255).astype('uint8')).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    rgba = im.copy(); rgba.putalpha(alpha)
    bbox = alpha.point(lambda v: 255 if v > 20 else 0).getbbox() or (0, 0, w, h)
    rgba = rgba.crop(bbox)
    rgba.thumbnail((640, 640), Image.LANCZOS)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    rgba.save(out, 'WEBP', quality=86)
    print('ok', out, rgba.size, 'bg removed %.0f%%' % (100 * bg.mean()))
