# Downloads the chosen Poly Haven (CC0) textures at 1k and saves them at 512 px for phones:
# idiomas/assets/tex/<id>_d.jpg (colour), _n.jpg (normal, OpenGL), _r.jpg (roughness).
import json, os, urllib.request, io
from PIL import Image
IDS = ['leafy_grass', 'dirt_floor', 'cobblestone_floor_04', 'rock_face_03', 'coast_sand_01', 'snow_02',
       'weathered_brown_planks', 'clay_roof_tiles_02', 'grey_roof_tiles_02', 'white_plaster_02', 'plastered_stone_wall', 'stone_wall']
def get(u): return urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'idiomas-apps'})).read()
os.makedirs('idiomas/assets/tex', exist_ok=True)
for i in IDS:
    f = json.loads(get(f'https://api.polyhaven.com/files/{i}'))
    for key, suf in [('Diffuse', 'd'), ('nor_gl', 'n'), ('Rough', 'r')]:
        try:
            url = f[key]['1k']['jpg']['url']
        except KeyError:
            print('missing', i, key); continue
        im = Image.open(io.BytesIO(get(url))).convert('RGB' if suf != 'r' else 'L').resize((512, 512), Image.LANCZOS)
        im.save(f'idiomas/assets/tex/{i}_{suf}.jpg', quality=80, optimize=True)
        print('ok', i, suf)
open('idiomas/assets/tex/CREDITS.txt', 'w').write('Textures from Poly Haven (https://polyhaven.com), CC0 public domain:\n' + '\n'.join(IDS) + '\n')
