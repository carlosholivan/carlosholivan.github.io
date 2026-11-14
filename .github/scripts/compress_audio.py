"""Re-encodes the apps' MP3s to 32 kbps mono (speech; about a third smaller than edge-tts' 48 kbps) so all
the apps fit in the GitHub Pages size limit. Done once per file: data/audio/.compressed lists the files
already converted, so later runs only touch new clips. File names (and index.json) don't change."""
import subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def one(path):
    tmp = path.with_suffix('.tmp.mp3')
    r = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(path), '-ac', '1', '-ar', '24000', '-b:a', '32k',
                        '-map_metadata', '-1', str(tmp)], capture_output=True)
    if r.returncode == 0 and tmp.exists() and 0 < tmp.stat().st_size < path.stat().st_size:
        tmp.replace(path)
    else:
        tmp.unlink(missing_ok=True)
    return path.name


for app in sys.argv[1:]:
    d = ROOT / app / 'data' / 'audio'
    if not d.exists():
        continue
    mark = d / '.compressed'
    done = set(mark.read_text().split()) if mark.exists() else set()
    todo = [p for p in d.glob('*.mp3') if p.name not in done]
    before = sum(p.stat().st_size for p in todo)
    with ThreadPoolExecutor(8) as ex:
        names = list(ex.map(one, todo))
    after = sum(p.stat().st_size for p in todo if p.exists())
    done.update(names)
    mark.write_text('\n'.join(sorted(done)) + '\n')
    print(f'{app}: {len(todo)} files, {before / 1e6:.0f} MB -> {after / 1e6:.0f} MB', flush=True)
