"""Step 3: put the new clips in each app (data/audio/story/) and point story.json at them; old clips that are no
longer used are deleted. Usage: python merge.py (reads out/<app>/map-*.json)"""
import glob, json, os, shutil
from common import ROOT
here = os.path.dirname(os.path.abspath(__file__))
for d in sorted(glob.glob(f'{here}/out/*')):
    app = os.path.basename(d); idx_p = f'{ROOT}/{app}-app/data/audio/story.json'
    if not os.path.exists(idx_p): continue
    idx = json.load(open(idx_p, encoding='utf8')); new = {}
    for mp in glob.glob(f'{d}/map-*.json'): new.update(json.load(open(mp, encoding='utf8')))
    for k, f in new.items():
        shutil.copy(f'{d}/{f}', f'{ROOT}/{app}-app/data/audio/story/{f}'); idx[k] = f
    used = set(idx.values())
    for f in glob.glob(f'{ROOT}/{app}-app/data/audio/story/*.mp3'):
        if os.path.basename(f) not in used: os.remove(f)
    json.dump(idx, open(idx_p, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    print(app, len(new), 'new clips')
