# Lists Poly Haven (CC0) textures and models with their categories and sizes, so we can choose what to use.
import json, urllib.request
def get(u): return json.load(urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'idiomas-apps'})))
out = {}
for t in ['textures', 'models']:
    a = get(f'https://api.polyhaven.com/assets?type={t}')
    out[t] = {k: {'c': v.get('categories'), 'tags': v.get('tags', [])[:8], 'poly': v.get('polycount'), 'dl': v.get('download_count')} for k, v in a.items()}
json.dump(out, open('.github/art/polyhaven.json', 'w'), indent=0)
print({k: len(v) for k, v in out.items()})
